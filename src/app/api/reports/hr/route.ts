import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { orgFilter } from '../../utils/auth';
import { requireVerifiedPermission } from '../../utils/auth';
import { log } from '@/lib/logger';
import { Permission } from '@/lib/auth/types';

export async function GET(request: NextRequest) {
  const authResult = await requireVerifiedPermission(request, Permission.REPORTS_READ);
  if ('error' in authResult) return authResult.error;
  const ctx = authResult.user;
  try {
    // Org filter for multi-tenant data isolation
    const orgWhere = orgFilter(ctx);

    // Employee count by department
    const employees = await db.employee.findMany({
      where: Object.keys(orgWhere).length > 0 ? orgWhere : undefined,
      include: {
        user: { select: { name: true, email: true, isActive: true } },
      },
    });

    const deptCounts: Record<string, number> = {};
    const deptEmployees: Record<string, { name: string; position: string }[]> = {};
    employees.forEach((emp) => {
      const dept = emp.department || "غير محدد";
      deptCounts[dept] = (deptCounts[dept] || 0) + 1;
      if (!deptEmployees[dept]) deptEmployees[dept] = [];
      deptEmployees[dept].push({ name: emp.user?.name || "", position: emp.position ?? "" });
    });

    const departmentDistribution = Object.entries(deptCounts).map(([dept, count]) => ({
      department: dept,
      count,
      employees: deptEmployees[dept],
    }));

    // Attendance org filter — Attendance is scoped through employee → user
    // Attendance has its own organizationId field — use orgFilter directly instead of nested relation
    const attendanceOrgWhere = { ...orgFilter(ctx) };

    // Today's attendance stats
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

    const todayAttendance = await db.attendance.findMany({
      where: {
        date: { gte: todayStart, lte: todayEnd },
        ...attendanceOrgWhere,
      },
    });

    const presentToday = todayAttendance.filter((a) => a.status === "PRESENT" || a.status === "LATE").length;
    const absentToday = todayAttendance.filter((a) => a.status === "ABSENT").length;
    const lateToday = todayAttendance.filter((a) => a.status === "LATE").length;
    const onLeaveToday = todayAttendance.filter((a) => a.status === "LEAVE").length;

    // Total employees
    const totalEmployees = employees.length;
    const activeEmployees = employees.filter((e) => e.employmentStatus === "ACTIVE" && e.user?.isActive !== false).length;

    // Leave stats
    const pendingLeaves = await db.leave.count({
      where: { status: "PENDING", ...orgWhere },
    });

    const approvedLeavesThisMonth = await db.leave.count({
      where: {
        status: "APPROVED",
        startDate: { gte: new Date(today.getFullYear(), today.getMonth(), 1) },
        ...orgWhere,
      },
    });

    const onLeaveEmployees = await db.leave.findMany({
      where: {
        status: "APPROVED",
        startDate: { lte: today },
        endDate: { gte: today },
        ...orgWhere,
      },
      include: {
        employee: { select: { id: true, department: true, position: true, name: true } },
        approver: { select: { name: true } },
      },
    });

    // Leave distribution by type
    const leaveTypeCounts = await db.leave.groupBy({
      by: ["type"],
      _count: { id: true },
      where: Object.keys(orgWhere).length > 0 ? orgWhere : undefined,
    });

    const leaveDistribution = leaveTypeCounts.map((lt) => ({
      type: lt.type,
      count: lt._count.id,
    }));

    // Attendance trends (last 7 days) — single batched query instead of N+1 loop
    const arDays = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
    const enDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    const sevenDaysAgo = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6);
    const weekAttendance = await db.attendance.findMany({
      where: {
        date: { gte: sevenDaysAgo, lte: todayEnd },
        ...attendanceOrgWhere,
      },
    });

    // Group attendance records by date string (YYYY-MM-DD)
    const byDate = new Map<string, typeof weekAttendance>();
    for (const rec of weekAttendance) {
      const key = rec.date.toISOString().split("T")[0];
      if (!byDate.has(key)) byDate.set(key, []);
      byDate.get(key)!.push(rec);
    }

    const attendanceTrend: Array<{ dateAr: string; dateEn: string; dayIndex: number; date: string; present: number; absent: number; late: number; leave: number; total: number }> = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      const dayRecs = byDate.get(dateStr) || [];

      attendanceTrend.push({
        dateAr: arDays[date.getDay()],
        dateEn: enDays[date.getDay()],
        dayIndex: date.getDay(),
        date: dateStr,
        present: dayRecs.filter((a) => a.status === "PRESENT").length,
        absent: dayRecs.filter((a) => a.status === "ABSENT").length,
        late: dayRecs.filter((a) => a.status === "LATE").length,
        leave: dayRecs.filter((a) => a.status === "LEAVE").length,
        total: dayRecs.length,
      });
    }

    return NextResponse.json({
      totalEmployees,
      activeEmployees,
      presentToday,
      absentToday,
      lateToday,
      onLeaveToday,
      onLeaveEmployees,
      pendingLeaves,
      approvedLeavesThisMonth,
      departmentDistribution,
      leaveDistribution,
      attendanceTrend,
    });
  } catch (error) {
    log.error("Error fetching HR report:", error);
    return NextResponse.json({ error: "Failed to fetch HR report" }, { status: 500 });
  }
}
