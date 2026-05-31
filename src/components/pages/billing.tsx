"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CreditCard,
  Crown,
  Check,
  Zap,
  Building2,
  Users,
  HardDrive,
  Headphones,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getMutationHeaders } from "@/lib/csrf-client";

// ===== Plans Data =====
const plans = [
  {
    id: "starter",
    nameAr: "المبتدئ",
    nameEn: "Starter",
    price: 0,
    priceId: null,
    features: [
      { ar: "مشروع واحد", en: "1 Project" },
      { ar: "5 مستخدمين", en: "5 Users" },
      { ar: "1GB تخزين", en: "1GB Storage" },
      { ar: "دعم بالإيميل", en: "Email Support" },
    ],
    highlighted: false,
  },
  {
    id: "professional",
    nameAr: "المحترف",
    nameEn: "Professional",
    price: 99,
    priceId: "price_professional_monthly",
    features: [
      { ar: "10 مشاريع", en: "10 Projects" },
      { ar: "25 مستخدم", en: "25 Users" },
      { ar: "10GB تخزين", en: "10GB Storage" },
      { ar: "دعم بالهاتف", en: "Phone Support" },
      { ar: "تقارير متقدمة", en: "Advanced Reports" },
    ],
    highlighted: true,
  },
  {
    id: "enterprise",
    nameAr: "المؤسسات",
    nameEn: "Enterprise",
    price: 299,
    priceId: "price_enterprise_monthly",
    features: [
      { ar: "مشاريع غير محدودة", en: "Unlimited Projects" },
      { ar: "مستخدمين غير محدودين", en: "Unlimited Users" },
      { ar: "100GB تخزين", en: "100GB Storage" },
      { ar: "دعم مخصص 24/7", en: "24/7 Dedicated Support" },
      { ar: "API كامل", en: "Full API Access" },
      { ar: "تخصيص كامل", en: "Full Customization" },
    ],
    highlighted: false,
  },
];

// ===== Types =====
interface Subscription {
  id: string;
  status: string;
  planId: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
}

interface PaymentMethod {
  id: string;
  type: string;
  card?: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  };
}

// ===== Main Component =====
interface BillingPageProps {
  language: "ar" | "en";
}

export default function BillingPage({ language }: BillingPageProps) {
  const ar = language === "ar";
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  // Fetch subscription
  const { data: subscription, isLoading: subLoading } = useQuery<Subscription | null>({
    queryKey: ["subscription"],
    queryFn: async () => {
      const res = await fetch("/api/stripe/subscriptions");
      if (!res.ok) return null;
      const data = await res.json();
      return data[0] || null;
    },
  });

  // Fetch payment methods
  const { data: paymentMethods = [], isLoading: pmLoading } = useQuery<PaymentMethod[]>({
    queryKey: ["payment-methods"],
    queryFn: async () => {
      const res = await fetch("/api/stripe/payment-methods");
      if (!res.ok) return [];
      const json = await res.json();
      return json.data?.paymentMethods || json.paymentMethods || json;
    },
  });

  // Checkout mutation
  const checkoutMutation = useMutation({
    mutationFn: async (priceId: string) => {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: getMutationHeaders(),
        body: JSON.stringify({ priceId }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
  });

  // Portal mutation
  const portalMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/stripe/portal", { method: "POST", headers: getMutationHeaders() });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
  });

  const handleSubscribe = async (plan: typeof plans[0]) => {
    if (!plan.priceId) return;
    setLoadingPlan(plan.id);
    try {
      await checkoutMutation.mutateAsync(plan.priceId);
    } finally {
      setLoadingPlan(null);
    }
  };

  const handleManageSubscription = async () => {
    await portalMutation.mutateAsync();
  };

  const currentPlan = plans.find((p) => p.id === subscription?.planId) || plans[0];

  if (subLoading || pmLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
          <CreditCard className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            {ar ? "إدارة الاشتراك والفواتير" : "Subscription & Billing"}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {ar ? "إدارة خطتك وطرق الدفع" : "Manage your plan and payment methods"}
          </p>
        </div>
      </div>

      {/* Current Subscription */}
      <Card className="border-slate-200 dark:border-slate-700/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Crown className="h-4 w-4 text-amber-500" />
            {ar ? "الخطة الحالية" : "Current Plan"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={cn(
                "w-12 h-12 rounded-lg flex items-center justify-center",
                currentPlan.highlighted
                  ? "bg-gradient-to-br from-teal-500 to-cyan-600"
                  : "bg-slate-100 dark:bg-slate-800"
              )}>
                <Zap className={cn(
                  "h-6 w-6",
                  currentPlan.highlighted ? "text-white" : "text-slate-500"
                )} />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white">
                  {ar ? currentPlan.nameAr : currentPlan.nameEn}
                </h3>
                <p className="text-sm text-slate-500">
                  {currentPlan.price === 0
                    ? (ar ? "مجاني للأبد" : "Free forever")
                    : `$${currentPlan.price}/${ar ? "شهر" : "month"}`}
                </p>
              </div>
            </div>
            {subscription && (
              <Button
                variant="outline"
                onClick={handleManageSubscription}
                disabled={portalMutation.isPending}
              >
                {portalMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin me-2" />
                ) : (
                  <ExternalLink className="h-4 w-4 me-2" />
                )}
                {ar ? "إدارة الاشتراك" : "Manage Subscription"}
              </Button>
            )}
          </div>
          {subscription && (
            <div className="mt-4 flex items-center gap-2">
              <Badge variant={subscription.status === "ACTIVE" ? "default" : "secondary"}>
                {subscription.status === "ACTIVE"
                  ? (ar ? "نشط" : "Active")
                  : subscription.status === "CANCELED"
                  ? (ar ? "ملغي" : "Canceled")
                  : subscription.status}
              </Badge>
              {subscription.currentPeriodEnd && (
                <span className="text-xs text-slate-500">
                  {ar ? "يتجدد في" : "Renews on"}{" "}
                  {new Date(subscription.currentPeriodEnd).toLocaleDateString(ar ? "ar-AE" : "en-US")}
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Methods */}
      {paymentMethods.length > 0 && (
        <Card className="border-slate-200 dark:border-slate-700/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              {ar ? "طرق الدفع" : "Payment Methods"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {paymentMethods.map((pm) => (
                <div
                  key={pm.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50"
                >
                  <div className="w-10 h-7 bg-gradient-to-r from-slate-700 to-slate-900 rounded flex items-center justify-center">
                    <span className="text-[10px] text-white font-bold uppercase">
                      {pm.card?.brand || "CARD"}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      •••• •••• •••• {pm.card?.last4}
                    </p>
                    <p className="text-xs text-slate-500">
                      {ar ? "ينتهي في" : "Expires"} {pm.card?.expMonth}/{pm.card?.expYear}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Plans */}
      <div>
        <h3 className="text-lg font-semibold mb-4 text-slate-900 dark:text-white">
          {ar ? "اختر الخطة المناسبة" : "Choose the right plan for you"}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className={cn(
                "relative overflow-hidden transition-all duration-300",
                plan.highlighted
                  ? "border-teal-500 dark:border-teal-400 shadow-lg shadow-teal-500/10"
                  : "border-slate-200 dark:border-slate-700/50",
                subscription?.planId === plan.id && "ring-2 ring-teal-500"
              )}
            >
              {plan.highlighted && (
                <div className="absolute top-0 start-0 end-0 h-1 bg-gradient-to-r from-teal-500 to-cyan-500" />
              )}
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{ar ? plan.nameAr : plan.nameEn}</CardTitle>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold">
                    ${plan.price}
                  </span>
                  <span className="text-sm text-slate-500">
                    /{ar ? "شهر" : "mo"}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-teal-500 flex-shrink-0" />
                      <span className="text-slate-600 dark:text-slate-300">
                        {ar ? feature.ar : feature.en}
                      </span>
                    </li>
                  ))}
                </ul>
                <Button
                  className={cn(
                    "w-full",
                    plan.highlighted
                      ? "bg-teal-600 hover:bg-teal-700 text-white"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-900 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-white"
                  )}
                  onClick={() => handleSubscribe(plan)}
                  disabled={!plan.priceId || loadingPlan === plan.id || checkoutMutation.isPending}
                >
                  {loadingPlan === plan.id ? (
                    <Loader2 className="h-4 w-4 animate-spin me-2" />
                  ) : null}
                  {subscription?.planId === plan.id
                    ? (ar ? "الخطة الحالية" : "Current Plan")
                    : plan.price === 0
                    ? (ar ? "المجانية" : "Free")
                    : (ar ? "اشترك الآن" : "Subscribe")}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Features Comparison */}
      <Card className="border-slate-200 dark:border-slate-700/50">
        <CardHeader>
          <CardTitle className="text-base">
            {ar ? "مقارنة الميزات" : "Features Comparison"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="text-start py-2 px-3">{ar ? "الميزة" : "Feature"}</th>
                  {plans.map((p) => (
                    <th key={p.id} className="text-center py-2 px-3">
                      {ar ? p.nameAr : p.nameEn}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  <td className="py-2 px-3 flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-slate-400" />
                    {ar ? "المشاريع" : "Projects"}
                  </td>
                  <td className="text-center py-2 px-3">1</td>
                  <td className="text-center py-2 px-3">10</td>
                  <td className="text-center py-2 px-3">∞</td>
                </tr>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  <td className="py-2 px-3 flex items-center gap-2">
                    <Users className="h-4 w-4 text-slate-400" />
                    {ar ? "المستخدمين" : "Users"}
                  </td>
                  <td className="text-center py-2 px-3">5</td>
                  <td className="text-center py-2 px-3">25</td>
                  <td className="text-center py-2 px-3">∞</td>
                </tr>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  <td className="py-2 px-3 flex items-center gap-2">
                    <HardDrive className="h-4 w-4 text-slate-400" />
                    {ar ? "التخزين" : "Storage"}
                  </td>
                  <td className="text-center py-2 px-3">1GB</td>
                  <td className="text-center py-2 px-3">10GB</td>
                  <td className="text-center py-2 px-3">100GB</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 flex items-center gap-2">
                    <Headphones className="h-4 w-4 text-slate-400" />
                    {ar ? "الدعم" : "Support"}
                  </td>
                  <td className="text-center py-2 px-3">{ar ? "إيميل" : "Email"}</td>
                  <td className="text-center py-2 px-3">{ar ? "هاتف" : "Phone"}</td>
                  <td className="text-center py-2 px-3">24/7</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
