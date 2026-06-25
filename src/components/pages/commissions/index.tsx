"use client";


import { useTranslations } from 'next-intl';
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getMutationHeaders } from "@/lib/csrf-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DollarSign, Gift, Megaphone, Users, Plus } from "lucide-react";
import type { CommissionItem, ReferralItem, CampaignItem, UserOption, ProjectOption } from "./types";
import { CommissionStats, ReferralStats, CampaignStats } from "./commission-stats";
import { CommissionFilters, ReferralFilters } from "./commission-filters";
import { CommissionsTable, ReferralsTable } from "./commissions-table";
import { CommissionFormDialog, ReferralFormDialog, CampaignFormDialog } from "./commission-form";
import { CampaignDetailCard } from "./commission-detail";

interface CommissionsPageProps {
  language: "ar" | "en";
}

export default function CommissionsPage({ language }: CommissionsPageProps) {
  const tAuto = useTranslations();
  const _ar = language === "ar";
  const [activeTab, setActiveTab] = useState("commissions");

  // Shared fetches
  const { data: usersData } = useQuery<UserOption[]>({
    queryKey: ["users-list-commissions"],
    queryFn: async () => {
      const res = await fetch("/api/users");
      if (!res.ok) return [];
      const json = await res.json();
      return json.data || json;
    },
  });
  const users: UserOption[] = Array.isArray(usersData) ? usersData : [];

  const { data: projects = [] } = useQuery<ProjectOption[]>({
    queryKey: ["projects-list-commissions"],
    queryFn: async () => {
      const res = await fetch("/api/projects-simple");
      if (!res.ok) return [];
      const json = await res.json(); return json.data || json;
    },
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-lg bg-brand-navy-100 dark:bg-brand-navy-900/30 flex items-center justify-center">
          <Gift className="h-4.5 w-4.5 text-brand-navy-600 dark:text-brand-navy-400" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">{tAuto('auto.commissionsReferrals')}</h2>
          <p className="text-[10px] text-slate-500 dark:text-slate-400">
            {tAuto('auto.manageCommissionsReferralsAndMarketingCa')}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-slate-100 dark:bg-slate-800/50 h-9 p-1">
          <TabsTrigger value="commissions" className="text-xs gap-1.5 h-7 rounded-md data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm">
            <DollarSign className="h-3.5 w-3.5" />
            {tAuto('auto.commissions')}
          </TabsTrigger>
          <TabsTrigger value="referrals" className="text-xs gap-1.5 h-7 rounded-md data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm">
            <Users className="h-3.5 w-3.5" />
            {tAuto('auto.referrals')}
          </TabsTrigger>
          <TabsTrigger value="campaigns" className="text-xs gap-1.5 h-7 rounded-md data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm">
            <Megaphone className="h-3.5 w-3.5" />
            {tAuto('auto.campaigns')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="commissions">
          <CommissionsTab language={language} users={users} projects={projects} />
        </TabsContent>
        <TabsContent value="referrals">
          <ReferralsTab language={language} users={users} projects={projects} />
        </TabsContent>
        <TabsContent value="campaigns">
          <CampaignsTab language={language} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ===== COMMISSIONS TAB =====
function CommissionsTab({ language, users, projects }: { language: "ar" | "en"; users: UserOption[]; projects: ProjectOption[] }) {
  const ar = language === "ar";
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [showDialog, setShowDialog] = useState(false);

  const { data: commissions = [], isLoading } = useQuery<CommissionItem[]>({
    queryKey: ["commissions"],
    queryFn: async () => {
      const res = await fetch("/api/commissions");
      if (!res.ok) throw new Error("Failed");
      const json = await res.json(); return json.data || json;
    },
  });

  const filtered = commissions.filter((c) => {
    const matchSearch = c.user?.name.toLowerCase().includes(search.toLowerCase()) || c.description.toLowerCase().includes(search.toLowerCase()) || (c.project && (ar ? c.project.name : c.project.nameEn || c.project.name).toLowerCase().includes(search.toLowerCase()));
    const matchStatus = filterStatus === "all" || c.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const totalPaid = commissions.filter((c) => c.status === "PAID").reduce((s, c) => s + Number(c.amount), 0);
  const totalPending = commissions.filter((c) => c.status === "PENDING").reduce((s, c) => s + Number(c.amount), 0);
  const totalApproved = commissions.filter((c) => c.status === "APPROVED").reduce((s, c) => s + Number(c.amount), 0);

  return (
    <div className="space-y-4">
      <CommissionStats language={language} totalPaid={totalPaid} totalPending={totalPending} totalApproved={totalApproved} />
      <CommissionFilters language={language} search={search} onSearchChange={setSearch} filterStatus={filterStatus} onFilterStatusChange={setFilterStatus} onNew={() => setShowDialog(true)} />
      <CommissionsTable language={language} commissions={filtered} isLoading={isLoading} />
      <CommissionFormDialog language={language} open={showDialog} onOpenChange={setShowDialog} users={users} projects={projects} />
    </div>
  );
}

// ===== REFERRALS TAB =====
function ReferralsTab({ language, users, projects }: { language: "ar" | "en"; users: UserOption[]; projects: ProjectOption[] }) {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [showDialog, setShowDialog] = useState(false);

  const { data: referrals = [], isLoading } = useQuery<ReferralItem[]>({
    queryKey: ["referrals"],
    queryFn: async () => {
      const res = await fetch("/api/referrals");
      if (!res.ok) throw new Error("Failed");
      const json = await res.json(); return json.data || json;
    },
  });

  const filtered = referrals.filter((r) => {
    const matchSearch = r.referrer?.name.toLowerCase().includes(search.toLowerCase()) || r.referredName.toLowerCase().includes(search.toLowerCase()) || r.referredEmail.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || r.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const totalRewards = referrals.filter((r) => r.status === "rewarded").reduce((s, r) => s + r.rewardAmount, 0);
  const activeReferrals = referrals.filter((r) => r.status === "PENDING" || r.status === "CONVERTED").length;

  return (
    <div className="space-y-4">
      <ReferralStats language={language} activeReferrals={activeReferrals} totalReferrals={referrals.length} totalRewards={totalRewards} />
      <ReferralFilters language={language} search={search} onSearchChange={setSearch} filterStatus={filterStatus} onFilterStatusChange={setFilterStatus} onNew={() => setShowDialog(true)} />
      <ReferralsTable language={language} referrals={filtered} isLoading={isLoading} />
      <ReferralFormDialog language={language} open={showDialog} onOpenChange={setShowDialog} users={users} projects={projects} />
    </div>
  );
}

// ===== CAMPAIGNS TAB =====
function CampaignsTab({ language }: { language: "ar" | "en" }) {
  const tAuto = useTranslations();
  const _ar = language === "ar";
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const { data: campaigns = [], isLoading } = useQuery<CampaignItem[]>({
    queryKey: ["marketing-campaigns"],
    queryFn: async () => {
      const res = await fetch("/api/marketing-campaigns");
      if (!res.ok) throw new Error("Failed");
      const json = await res.json(); return json.data || json;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      const res = await fetch(`/api/marketing-campaigns/${id}`, { method: "PUT", headers: getMutationHeaders(), body: JSON.stringify(data) });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["marketing-campaigns"] }); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/marketing-campaigns/${id}`, { method: "DELETE", headers: getMutationHeaders() });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["marketing-campaigns"] }); },
  });

  const totalBudget = campaigns.reduce((s, c) => s + c.budget, 0);
  const totalLeads = campaigns.reduce((s, c) => s + c.leads, 0);
  const totalConversions = campaigns.reduce((s, c) => s + c.conversions, 0);

  const handleEdit = (c: CampaignItem) => { setEditId(c.id); setShowDialog(true); };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => <Card key={i} className="py-0 gap-0"><CardContent className="p-4"><Skeleton className="h-16 w-full" /></CardContent></Card>)}
        </div>
        <Card><CardContent className="p-4"><Skeleton className="h-64 w-full" /></CardContent></Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <CampaignStats language={language} campaignCount={campaigns.length} totalBudget={totalBudget} totalLeads={totalLeads} totalConversions={totalConversions} />
      <div className="flex items-center justify-end">
        <Button size="sm" className="h-8 bg-brand-navy-600 hover:bg-brand-navy-700 text-white rounded-lg shadow-sm shadow-brand-navy-600/20" onClick={() => { setEditId(null); setShowDialog(true); }}>
          <Plus className="h-3.5 w-3.5 me-1" />{tAuto('auto.newCampaign')}
        </Button>
      </div>
      {campaigns.length === 0 ? (
        <Card className="border-slate-200 dark:border-slate-700/50">
          <CardContent className="p-12 text-center">
            <Megaphone className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">{tAuto('auto.noMarketingCampaignsYet')}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {campaigns.map((c) => (
            <CampaignDetailCard
              key={c.id}
              language={language}
              campaign={c}
              onEdit={handleEdit}
              onStatusChange={(id, status) => updateMutation.mutate({ id, data: { status } })}
              onDelete={(id) => deleteMutation.mutate(id)}
            />
          ))}
        </div>
      )}
      <CampaignFormDialog language={language} open={showDialog} onOpenChange={setShowDialog} editId={editId} onEditIdChange={setEditId} />
    </div>
  );
}
