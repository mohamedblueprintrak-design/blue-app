"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Plug,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SectionHeader } from "./section-header";

interface IntegrationsTabProps {
  isAr: boolean;
}

export function IntegrationsTab({ isAr }: IntegrationsTabProps) {
  const integrations = [
    {
      name: "Slack",
      desc: isAr ? "إرسال الإشعارات إلى قنوات Slack" : "Send notifications to Slack channels",
      color: "bg-purple-50 dark:bg-purple-950 text-purple-600",
      icon: "\uD83D\uDCAC",
      connected: false,
    },
    {
      name: "Google Drive",
      desc: isAr ? "ربط المستندات مع Google Drive" : "Link documents with Google Drive",
      color: "bg-blue-50 dark:bg-blue-950 text-blue-600",
      icon: "\uD83D\uDCC1",
      connected: false,
    },
    {
      name: "Dropbox",
      desc: isAr ? "مزامنة الملفات مع Dropbox" : "Sync files with Dropbox",
      color: "bg-sky-50 dark:bg-sky-950 text-sky-600",
      icon: "\uD83D\uDCE6",
      connected: false,
    },
  ];

  return (
    <Card>
      <CardContent className="p-6">
        <SectionHeader
          icon={Plug}
          title={isAr ? "التكاملات والربط" : "Integrations"}
          subtitle={isAr ? "ربط مع تطبيقات وخدمات خارجية" : "Connect with external apps and services"}
        />
        <div className="space-y-3">
          {integrations.map((integration) => (
            <div
              key={integration.name}
              className="flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center text-xl", integration.color)}>
                  {integration.icon}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white flex items-center gap-2">
                    {integration.name}
                    {integration.connected && (
                      <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300 text-[10px] h-5 px-1.5 border-0">
                        {isAr ? "متصل" : "Connected"}
                      </Badge>
                    )}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{integration.desc}</p>
                </div>
              </div>
              <Button
                variant={integration.connected ? "outline" : "default"}
                size="sm"
                className={cn(
                  "h-8 rounded-lg",
                  !integration.connected && "bg-teal-600 hover:bg-teal-700 text-white"
                )}
              >
                {integration.connected
                  ? (isAr ? "إلغاء الربط" : "Disconnect")
                  : (isAr ? "ربط" : "Connect")
                }
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
