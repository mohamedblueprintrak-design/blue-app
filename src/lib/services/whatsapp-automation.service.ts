/**
 * Automated WhatsApp Site Visit Notification Service
 */

import { db } from "@/lib/db";
import { sendWhatsAppMessage } from "@/lib/services/whatsapp.service";
import { log } from "@/lib/logger";

export async function sendSiteVisitCompletionWhatsApp(siteVisitId: string, organizationId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const siteVisit = await db.siteVisit.findFirst({
      where: { id: siteVisitId },
      include: {
        project: {
          include: {
            client: true,
          },
        },
      },
    });

    if (!siteVisit) {
      return { success: false, error: "Site visit record not found" };
    }

    const clientPhone = siteVisit.project.client?.phone;
    if (!clientPhone) {
      log.info(`[WhatsApp Notification Skipped] Client for project '${siteVisit.project.name}' has no phone number.`, { siteVisitId });
      return { success: true };
    }

    const clientName = siteVisit.project.client.name || siteVisit.project.client.company || "Valued Client";
    const projectName = siteVisit.project.name || siteVisit.project.nameEn || "Project";
    const formattedDate = siteVisit.date ? new Date(siteVisit.date).toLocaleDateString("ar-AE", { year: "numeric", month: "long", day: "numeric" }) : new Date().toLocaleDateString("ar-AE");

    const messageText = `مرحباً ${clientName}،\n\nتم الانتهاء بنجاح من زيارة الموقع للمشروع: *${projectName}*\nبتاريخ: ${formattedDate}\nالحالة: *${siteVisit.status}*\n\nيمكنك الآن الاطلاع على التقرير والصور المعاينة عبر البوابة الإلكترونية الخاص بك.\n\nشكراً لثقتكم،\nشركة بلوبرينت لاستشارات التصميم والتنفيذ`;

    const phoneFormatted = clientPhone.startsWith("+") ? clientPhone : `+${clientPhone.replace(/\D/g, "")}`;

    const result = await sendWhatsAppMessage({
      to: phoneFormatted,
      message: messageText,
      organizationId,
      clientId: siteVisit.project.client.id,
    });

    log.info(`[WhatsApp Notification Sent] Site visit completion notification sent to ${phoneFormatted}`, { siteVisitId, result });
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log.error("Failed to send automated WhatsApp site visit notification", { siteVisitId, error: errorMessage });
    return { success: false, error: errorMessage };
  }
}
