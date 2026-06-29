"use client";


import { useTranslations } from 'next-intl';
import { useTheme } from "next-themes";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Palette,
  Sun,
  Moon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SectionHeader } from "./section-header";
import { ACCENT_COLORS } from "./constants";

interface AppearanceTabProps {
  isAr: boolean;
  accentColor: string;
  accentSaving: boolean;
  handleAccentColorChange: (color: string) => void;
}

export function AppearanceTab({
  isAr,
  accentColor,
  accentSaving,
  handleAccentColorChange,
}: AppearanceTabProps) {
  const tAuto = useTranslations();
  const { theme, setTheme } = useTheme();

  return (
    <Card>
      <CardContent className="p-6">
        <SectionHeader
          icon={Palette}
          title={tAuto('auto.appearanceCustomization')}
          subtitle={tAuto('auto.customizeColorThemeLanguageAndTextDirect')}
        />

        <div className="space-y-3">
          <Label className="text-sm font-semibold text-slate-900 dark:text-white">
            {tAuto('auto.theme')}
          </Label>
          <div className="grid grid-cols-3 gap-3">
            {[
              { key: "light", icon: Sun, label: tAuto('auto.light'), color: "bg-white border-slate-200 dark:border-slate-600" },
              { key: "dark", icon: Moon, label: tAuto('auto.dark'), color: "bg-slate-900 border-slate-700" },
            ].map((themeOption) => {
              const isActive = theme === themeOption.key;
              return (
                <button
                  key={themeOption.key}
                  onClick={() => setTheme(themeOption.key)}
                  className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all hover:shadow-sm cursor-pointer",
                    isActive
                      ? "border-brand-navy-500 bg-brand-navy-50/50 dark:bg-brand-navy-950/20 shadow-sm shadow-brand-navy-500/10"
                      : "border-slate-200 dark:border-slate-700 hover:border-brand-navy-300"
                  )}
                >
                  <div className={cn("w-14 h-10 rounded-lg border flex items-center justify-center", themeOption.color)}>
                    <themeOption.icon className={cn("h-5 w-5", isActive ? "text-brand-navy-500" : "text-slate-600 dark:text-slate-300")} />
                  </div>
                  <span className="text-sm font-medium text-slate-900 dark:text-white">{themeOption.label}</span>
                  {isActive && (
                    <Badge className="bg-brand-navy-100 text-brand-navy-700 dark:bg-brand-navy-900 dark:text-brand-navy-300 text-[10px] h-5 px-1.5 border-0">
                      {tAuto('auto.active')}
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <Separator className="my-6" />

        {/* Accent Color Selector */}
        <div className="space-y-3">
          <Label className="text-sm font-semibold text-slate-900 dark:text-white">
            {tAuto('auto.accentColor')}
            {accentSaving && (
              <span className="h-3 w-3 border-2 border-brand-navy-300 border-t-brand-navy-600 rounded-full animate-spin inline-block ms-2 align-middle" />
            )}
          </Label>
          <div className="flex items-center gap-3">
            {ACCENT_COLORS.map((c) => (
              <button
                key={c.value}
                onClick={() => handleAccentColorChange(c.value)}
                className={cn(
                  "w-9 h-9 rounded-full transition-all hover:scale-110",
                  c.color,
                  c.value === accentColor && "ring-2 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 ring-brand-navy-500 shadow-lg shadow-brand-navy-500/30"
                )}
                title={c.name}
              />
            ))}
          </div>
        </div>

        <Separator className="my-6" />

        <div className="space-y-3">
          <Label className="text-sm font-semibold text-slate-900 dark:text-white">
            {tAuto('auto.language')}
          </Label>
          <div className="grid grid-cols-2 gap-3">
            {[
              { key: "ar" as const, label: "العربية", sublabel: "Arabic (RTL)", active: isAr },
              { key: "en" as const, label: "English", sublabel: "English (LTR)", active: !isAr },
            ].map((langOption) => (
              <button
                key={langOption.key}
                onClick={() => {
                  localStorage.setItem("blueprint-lang", langOption.key);
                  window.dispatchEvent(new Event("blueprint-lang-change"));
                  window.location.reload();
                }}
                className={cn(
                  "flex items-center gap-3 p-4 rounded-xl border-2 transition-all hover:shadow-sm cursor-pointer",
                  langOption.active
                    ? "border-brand-navy-500 bg-brand-navy-50/50 dark:bg-brand-navy-950/20"
                    : "border-slate-200 dark:border-slate-700 hover:border-brand-navy-300"
                )}
              >
                <div className="w-11 h-11 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-lg font-bold">
                  {langOption.key === "ar" ? "ع" : "En"}
                </div>
                <div className="text-start">
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{langOption.label}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{langOption.sublabel}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        <Separator className="my-6" />

        <div className="space-y-3">
          <Label className="text-sm font-semibold text-slate-900 dark:text-white">
            {tAuto('auto.textDirection')}
          </Label>
          <div className="grid grid-cols-2 gap-3">
            {[
              { key: "rtl" as const, label: tAuto('auto.rightToLeft'), icon: "←", active: isAr },
              { key: "ltr" as const, label: tAuto('auto.leftToRight'), icon: "→", active: !isAr },
            ].map((dir) => (
              <button
                key={dir.key}
                onClick={() => {
                  const newLang = dir.key === "rtl" ? "ar" : "en";
                  localStorage.setItem("blueprint-lang", newLang);
                  window.dispatchEvent(new Event("blueprint-lang-change"));
                  window.location.reload();
                }}
                className={cn(
                  "flex items-center gap-3 p-4 rounded-xl border-2 transition-all hover:shadow-sm cursor-pointer",
                  dir.active
                    ? "border-brand-navy-500 bg-brand-navy-50/50 dark:bg-brand-navy-950/20"
                    : "border-slate-200 dark:border-slate-700 hover:border-brand-navy-300"
                )}
              >
                <span className="text-2xl font-bold text-slate-500 dark:text-slate-400">{dir.icon}</span>
                <span className="text-sm font-medium text-slate-900 dark:text-white">{dir.label}</span>
              </button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
