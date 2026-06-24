"use client";


import { useTranslations } from 'next-intl';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Pencil, X, Mail, Phone, MapPin, CreditCard, FileText, FileSignature, Globe, Home } from 'lucide-react';
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/formatters";
import { StatusIcon } from "@/components/ui/status-icon";
import {
  type Client,
  CLIENT_TYPE_LABELS,
  PROJECT_TYPE_LABELS,
  REFERRAL_LABELS,
  SERVICE_LABELS,
  LAND_PROJECT_TYPES,
  EMIRATES,
  getContractStatusBadge,
  getInvoiceStatusBadge,
  getInteractionIcon,
  parseFullAddress,
  parseServicesWanted,
  parseLandDocuments,
  getNationalityLabel,
} from "./client-shared";

interface ClientDetailPanelProps {
  client: Client;
  ar: boolean;
  onClose: () => void;
  onEdit: () => void;
}

export default function ClientDetailPanel({ client, ar, onClose, onEdit }: ClientDetailPanelProps) {
  const tAuto = useTranslations();
  const creditPct = client.creditLimit > 0 ? Math.min((client.creditUsed / client.creditLimit) * 100, 100) : 0;

  const services = parseServicesWanted(client.servicesWanted);
  const fullAddr = parseFullAddress(client.fullAddress);
  const landDocs = parseLandDocuments(client.landDocuments);
  const clientTypeConfig = CLIENT_TYPE_LABELS[client.clientType || ""] || CLIENT_TYPE_LABELS.individual;
  const projectTypeLabel = PROJECT_TYPE_LABELS[client.projectType || ""];
  const referralLabel = REFERRAL_LABELS[client.referralSource || ""];

  // Build formatted address string
  const addrParts = [fullAddr.emirate, fullAddr.city, fullAddr.area, fullAddr.street, fullAddr.building, fullAddr.unit].filter(Boolean);
  const formattedAddr = addrParts.join(" - ");
  const emirateLabel = fullAddr.emirate ? EMIRATES.find((e) => e.value === fullAddr.emirate) : null;

  return (
    <div className="w-full lg:w-[420px] flex-shrink-0 rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
      {/* Header Card with avatar */}
      <div className="bg-gradient-to-br from-brand-navy-500 to-brand-navy-600 dark:from-brand-navy-700 dark:to-brand-navy-800 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-7 w-7 text-white hover:bg-white/20" onClick={onEdit} aria-label="Edit">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-white hover:bg-white/20 lg:hidden" onClick={onClose} aria-label="Close">
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            {client.clientType && (
              <Badge className={cn("text-[10px] h-5 border-0", clientTypeConfig.color)}>
                {ar ? clientTypeConfig.ar : clientTypeConfig.en}
              </Badge>
            )}
            <span className="text-xs text-brand-navy-100">
              {tAuto('auto.clientDetails')}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-xl font-bold text-white shrink-0 border-2 border-white/30">
            {client.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-bold text-white truncate">{client.name}</h3>
            {(client.nameEn || client.company) && (
              <p className="text-xs text-brand-navy-100 truncate">{client.nameEn || client.company}</p>
            )}
            <div className="flex items-center gap-2 mt-1">
              <Badge className="text-[10px] h-5 bg-white/20 text-white border-0 hover:bg-white/30">
                {client._count.projects} {tAuto('auto.projects1')}
              </Badge>
              <Badge className="text-[10px] h-5 bg-white/20 text-white border-0 hover:bg-white/30">
                {client._count.invoices} {tAuto('auto.invoices')}
              </Badge>
              <Badge className="text-[10px] h-5 bg-white/20 text-white border-0 hover:bg-white/30">
                {client._count.contracts} {tAuto('auto.contracts')}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Credit bar */}
      <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700/50">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-slate-500 flex items-center gap-1">
            <CreditCard className="h-3 w-3" />
            {tAuto('auto.creditLimit')}
          </span>
          <span className="text-[10px] text-slate-500 tabular-nums font-mono">
            {formatCurrency(client.creditUsed, ar)} / {formatCurrency(client.creditLimit, ar)}
          </span>
        </div>
        <Progress
          value={creditPct}
          className={cn(
            "h-1.5",
            creditPct >= 80 && "[&>div]:bg-red-500",
            creditPct >= 50 && creditPct < 80 && "[&>div]:bg-amber-500",
            creditPct < 50 && "[&>div]:bg-brand-navy-500"
          )}
        />
      </div>

      <ScrollArea className="h-[calc(100vh-340px)]">
        <div className="p-4 space-y-4">
          {/* Contact Info with WhatsApp + Call buttons */}
          <div className="space-y-2">
            {client.email && (
              <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                <div className="w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                  <Mail className="h-3 w-3 text-slate-500" />
                </div>
                <a href={`mailto:${client.email}`} className="truncate text-brand-navy-600 dark:text-brand-navy-400 hover:underline">
                  {client.email}
                </a>
              </div>
            )}
            {client.phone && (
              <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                <div className="w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                  <Phone className="h-3 w-3 text-slate-500" />
                </div>
                <a href={`tel:${client.phone}`} className="text-brand-navy-600 dark:text-brand-navy-400 hover:underline">
                  {client.phone}
                </a>
              </div>
            )}
            {/* Action button: Call */}
            <div className="flex gap-2 pt-1">
              {client.phone && (
                <a 
                  href={`tel:${client.phone.replace(/[^0-9+]/g, "")}`}
                  className="flex items-center justify-center gap-2 p-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 transition-colors"
                >
                  <Phone className="h-4 w-4" />
                  {tAuto('auto.call')}
                </a>
              )}
            </div>
            {client.extraPhone && (
              <div className="flex flex-col gap-1">
                <span className="text-xs text-slate-500">{tAuto('auto.extraPhone')}</span>
                <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{client.extraPhone}</span>
              </div>
            )}
          </div>

          {/* Address section */}
          {(formattedAddr || client.address) && (
            <>
              <Separator />
              <div className="space-y-2">
                {formattedAddr ? (
                  <div className="flex items-start gap-2 text-xs text-slate-500">
                    <div className="w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 mt-0.5">
                      <MapPin className="h-3 w-3 text-slate-500" />
                    </div>
                    <div className="min-w-0">
                      {emirateLabel && (
                        <span className="text-brand-navy-600 dark:text-brand-navy-400 font-medium block">
                          {ar ? emirateLabel.ar : emirateLabel.en}
                        </span>
                      )}
                      <span className="truncate">{formattedAddr}</span>
                    </div>
                  </div>
                ) : client.address ? (
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <div className="w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                      <MapPin className="h-3 w-3 text-slate-500" />
                    </div>
                    <span className="truncate">{client.address}</span>
                  </div>
                ) : null}
              </div>
            </>
          )}

          {/* ID & Nationality */}
          {(client.idNumber || client.nationality) && (
            <div className="space-y-2">
              {client.idNumber && (
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <div className="w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                    <FileSignature className="h-3 w-3 text-slate-500" />
                  </div>
                  <span>{tAuto('auto.iD')} {client.idNumber}</span>
                </div>
              )}
              {client.nationality && (
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <div className="w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                    <Globe className="h-3 w-3 text-slate-500" />
                  </div>
                  <span>{tAuto('auto.nationality')} {getNationalityLabel(client.nationality, ar)}</span>
                </div>
              )}
            </div>
          )}

          {/* Services Wanted as Badges */}
          {services.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <span className="text-[10px] text-slate-400 block">{tAuto('auto.servicesWanted')}</span>
                <div className="flex flex-wrap gap-1">
                  {services.map((svc) => {
                    const label = SERVICE_LABELS[svc];
                    return (
                      <Badge key={svc} variant="secondary" className="text-[10px] h-5">
                        {label ? (ar ? label.ar : label.en) : svc}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* Project Type */}
          {projectTypeLabel && (
            <div className="space-y-2">
              <span className="text-[10px] text-slate-400 block">{tAuto('auto.projectType')}</span>
              <Badge className={cn("text-[10px] h-5", "bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300")}>
                <Home className="h-3 w-3 me-1" />
                {ar ? projectTypeLabel.ar : projectTypeLabel.en}
              </Badge>
            </div>
          )}

          {/* Land Details */}
          {LAND_PROJECT_TYPES.includes(client.projectType || "") && (
            <>
              <Separator />
              <div className="space-y-2">
                <span className="text-[10px] text-slate-400 font-medium block">
                  {tAuto('auto.landDetails')}
                </span>
                {client.landLocation && (
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <MapPin className="h-3 w-3 text-slate-400" />
                    <span>{client.landLocation}</span>
                  </div>
                )}
                {client.landArea && (
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <FileText className="h-3 w-3 text-slate-400" />
                    <span>{tAuto('auto.area')} {client.landArea}</span>
                  </div>
                )}
                {client.plotNumber && (
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <FileText className="h-3 w-3 text-slate-400" />
                    <span>{tAuto('auto.plot')} {client.plotNumber}</span>
                  </div>
                )}
                {client.planNumber && (
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <FileText className="h-3 w-3 text-slate-400" />
                    <span>{tAuto('auto.plan')} {client.planNumber}</span>
                  </div>
                )}
                {landDocs.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {landDocs.map((doc, i) => (
                      <Badge key={i} variant="outline" className="text-[9px] h-4">
                        <FileText className="h-2.5 w-2.5 me-0.5" />
                        {doc.type}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Referral Source */}
          {referralLabel && (
            <>
              <Separator />
              <div className="space-y-2">
                <span className="text-[10px] text-slate-400 block">{tAuto('auto.referralSource')}</span>
                <Badge className="text-[10px] h-5 bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300">
                  {ar ? referralLabel.ar : referralLabel.en}
                </Badge>
                {client.referralDetail && (
                  <p className="text-xs text-slate-500">{client.referralDetail}</p>
                )}
              </div>
            </>
          )}

          {/* Service Type Badge (legacy) */}
          {client.serviceType && (
            <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-brand-navy-100 dark:bg-brand-navy-900 flex items-center justify-center shrink-0">
                  <FileText className="h-3 w-3 text-brand-navy-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] text-slate-400 block">{tAuto('auto.purpose')}</span>
                  <span className="text-xs text-brand-navy-700 dark:text-brand-navy-300 font-medium">
                    {ar
                      ? { consultation: "استشارة هندسية", DESIGN: "تصميم", license: "استخراج ترخيص", supervision: "إشراف على التنفيذ", inspection: "فحص هندسي", other: "أخرى" }[client.serviceType] || client.serviceType
                      : { consultation: "Engineering Consultation", DESIGN: "Design", license: "License", supervision: "Supervision", inspection: "Inspection", other: "Other" }[client.serviceType] || client.serviceType}
                  </span>
                </div>
              </div>
              {client.serviceNotes && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 ms-8 line-clamp-2">{client.serviceNotes}</p>
              )}
            </div>
          )}

          {/* Tax / Terms */}
          {(client.taxNumber || client.paymentTerms) && (
            <div className="space-y-2">
              {client.taxNumber && (
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <div className="w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                    <FileText className="h-3 w-3 text-slate-500" />
                  </div>
                  <span>{tAuto('auto.tRN')} {client.taxNumber}</span>
                </div>
              )}
              {client.paymentTerms && (
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <div className="w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                    <CreditCard className="h-3 w-3 text-slate-500" />
                  </div>
                  <span>{tAuto('auto.terms')} {client.paymentTerms}</span>
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          {client.notes && (
            <div className="px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
              <span className="text-[10px] text-slate-400 block mb-1">{tAuto('auto.notes')}</span>
              <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-3">{client.notes}</p>
            </div>
          )}

          <Separator />

          {/* Tabs with count badges */}
          <Tabs defaultValue="projects" dir={ar ? "rtl" : "ltr"}>
            <TabsList className="grid w-full grid-cols-4 h-9 bg-slate-100 dark:bg-slate-800">
              <TabsTrigger value="projects" className="text-xs gap-1">
                {tAuto('auto.projects')}
                <span className="bg-slate-200 dark:bg-slate-700 text-[9px] px-1 rounded-full">{client._count.projects}</span>
              </TabsTrigger>
              <TabsTrigger value="invoices" className="text-xs gap-1">
                {tAuto('auto.invoices1')}
                <span className="bg-slate-200 dark:bg-slate-700 text-[9px] px-1 rounded-full">{client._count.invoices}</span>
              </TabsTrigger>
              <TabsTrigger value="contracts" className="text-xs gap-1">
                {tAuto('auto.contracts1')}
                <span className="bg-slate-200 dark:bg-slate-700 text-[9px] px-1 rounded-full">{client._count.contracts}</span>
              </TabsTrigger>
              <TabsTrigger value="interactions" className="text-xs gap-1">
                {tAuto('auto.log')}
                {client.interactions && (
                  <span className="bg-slate-200 dark:bg-slate-700 text-[9px] px-1 rounded-full">{client.interactions.length}</span>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Projects Tab */}
            <TabsContent value="projects" className="mt-3 space-y-2">
              {client.projects && client.projects.length > 0 ? (
                client.projects.map((project) => (
                  <div key={project.id} className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-slate-900 dark:text-white truncate">
                        {ar ? project.name : project.nameEn || project.name}
                      </div>
                      <div className="text-xs text-slate-400">{project.number}</div>
                    </div>
                    <Badge variant="secondary" className="text-[10px] h-5 flex-shrink-0">
                      {project.status}
                    </Badge>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 text-center py-4">
                  {tAuto('auto.noProjects')}
                </p>
              )}
            </TabsContent>

            {/* Invoices Tab */}
            <TabsContent value="invoices" className="mt-3 space-y-2">
              {client.invoices && client.invoices.length > 0 ? (
                client.invoices.map((inv) => {
                  const statusCfg = getInvoiceStatusBadge(inv.status);
                  return (
                    <div key={inv.id} className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-slate-900 dark:text-white">{inv.number}</div>
                        <div className="text-xs text-slate-500 tabular-nums font-mono">{formatCurrency(inv.total, ar)}</div>
                      </div>
                      <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0", statusCfg.color)}>
                        <StatusIcon status={statusCfg.status} className="h-3 w-3" />
                        {ar ? statusCfg.ar : statusCfg.en}
                      </span>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-slate-400 text-center py-4">
                  {tAuto('auto.noInvoices')}
                </p>
              )}
            </TabsContent>

            {/* Contracts Tab */}
            <TabsContent value="contracts" className="mt-3 space-y-2">
              {client.contracts && client.contracts.length > 0 ? (
                client.contracts.map((con) => {
                  const statusCfg = getContractStatusBadge(con.status);
                  return (
                    <div key={con.id} className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-slate-900 dark:text-white truncate">{con.title}</div>
                        <div className="text-xs text-slate-500 tabular-nums font-mono">{formatCurrency(con.value, ar)}</div>
                      </div>
                      <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0", statusCfg.color)}>
                        <StatusIcon status={statusCfg.status} className="h-3 w-3" />
                        {ar ? statusCfg.ar : statusCfg.en}
                      </span>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-slate-400 text-center py-4">
                  {tAuto('auto.noContracts')}
                </p>
              )}
            </TabsContent>

            {/* Interactions Tab */}
            <TabsContent value="interactions" className="mt-3 space-y-2">
              {client.interactions && client.interactions.length > 0 ? (
                client.interactions.map((interaction) => {
                  const Icon = getInteractionIcon(interaction.type);
                  const typeLabels: Record<string, { ar: string; en: string }> = {
                    MEETING: { ar: "اجتماع", en: "Meeting" },
                    CALL: { ar: "مكالمة", en: "Call" },
                    EMAIL: { ar: "بريد إلكتروني", en: "Email" },
                  };
                  return (
                    <div key={interaction.id} className="flex gap-3 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                        <Icon className="h-4 w-4 text-slate-500" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-slate-900 dark:text-white">
                            {ar ? typeLabels[interaction.type]?.ar : typeLabels[interaction.type]?.en}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(interaction.date).toLocaleDateString(ar ? "ar-AE" : "en-US")}
                          </span>
                        </div>
                        <div className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 truncate">
                          {interaction.subject}
                        </div>
                        {interaction.description && (
                          <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{interaction.description}</p>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-slate-400 text-center py-4">
                  {tAuto('auto.noInteractions')}
                </p>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </ScrollArea>
    </div>
  );
}
