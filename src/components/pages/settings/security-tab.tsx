"use client";


import { useTranslations } from 'next-intl';
import { useEffect, useRef } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Shield,
  Check,
  Key,
  Smartphone,
  Monitor,
  Info,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { DeleteAccountTab } from "./delete-account-tab";
import { getMutationHeaders } from "@/lib/csrf-client";
import { extractErrorMessage } from "@/lib/api/fetch-client";
import { SectionHeader } from "./section-header";
import type { PasswordForm, DangerConfirmType } from "./types";
import { TwoFactorSetup } from "./two-factor-setup";

interface SecurityTabProps {
  isAr: boolean;
  passwordForm: PasswordForm;
  setPasswordForm: React.Dispatch<React.SetStateAction<PasswordForm>>;
  passwordSaving: boolean;
  passwordError: string;
  passwordSuccess: boolean;
  setPasswordError: (v: string) => void;
  setPasswordSuccess: (v: boolean) => void;
  setPasswordSaving: (v: boolean) => void;
  dangerConfirm: DangerConfirmType;
  setDangerConfirm: (v: DangerConfirmType) => void;
  dangerError: string;
  setDangerError: (v: string) => void;
  dangerSuccess: string;
  setDangerSuccess: (v: string) => void;
  sessionData: { isAuthenticated?: boolean; user?: { name?: string; email?: string; lastLogin?: string } } | undefined;
}

export function SecurityTab({
  isAr,
  passwordForm,
  setPasswordForm,
  passwordSaving,
  passwordError,
  passwordSuccess,
  setPasswordError,
  setPasswordSuccess,
  setPasswordSaving,
  dangerConfirm,
  setDangerConfirm,
  dangerError,
  setDangerError,
  dangerSuccess,
  setDangerSuccess,
  sessionData,
}: SecurityTabProps) {
  const tAuto = useTranslations();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);
  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-6">
          <SectionHeader
            icon={Key}
            title={tAuto('auto.changePassword')}
            subtitle={tAuto('auto.makeSureToUseAStrongPassword')}
          />
          <div className="space-y-4 max-w-md">
            {passwordError && (
              <div className="bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg px-4 py-3 text-sm">
                {passwordError}
              </div>
            )}
            {passwordSuccess && (
              <div className="bg-green-50 dark:bg-green-950/50 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 rounded-lg px-4 py-3 text-sm">
                {tAuto('auto.passwordUpdatedSuccessfully')}
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                {tAuto('auto.currentPassword')}
              </Label>
              <div className="relative">
                <Key className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  type="password"
                  placeholder="••••••••"
                  className="ps-9 h-10 rounded-lg"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                {tAuto('auto.newPassword')}
              </Label>
              <div className="relative">
                <Shield className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  type="password"
                  placeholder="••••••••"
                  className="ps-9 h-10 rounded-lg"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                {tAuto('auto.confirmNewPassword')}
              </Label>
              <div className="relative">
                <Check className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  type="password"
                  placeholder="••••••••"
                  className="ps-9 h-10 rounded-lg"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                />
              </div>
            </div>
            <Button
              onClick={async () => {
                setPasswordError("");
                setPasswordSuccess(false);
                if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
                  setPasswordError(tAuto('auto.pleaseFillInAllFields'));
                  return;
                }
                if (passwordForm.newPassword !== passwordForm.confirmPassword) {
                  setPasswordError(tAuto('auto.newPasswordsDoNotMatch'));
                  return;
                }
                if (passwordForm.newPassword.length < 8) {
                  setPasswordError(tAuto('auto.passwordMustBeAtLeast8Characters'));
                  return;
                }
                setPasswordSaving(true);
                try {
                  const res = await fetch("/api/profile/password", {
                    method: "PUT",
                    headers: getMutationHeaders(),
                    body: JSON.stringify({
                      currentPassword: passwordForm.currentPassword,
                      newPassword: passwordForm.newPassword,
                    }),
                  });
                  const data = await res.json();
                  if (!res.ok) {
                    setPasswordError(extractErrorMessage(data.error, tAuto('auto.anErrorOccurred')));
                  } else {
                    setPasswordSuccess(true);
                    setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
                    if (timeoutRef.current) clearTimeout(timeoutRef.current);
                    timeoutRef.current = setTimeout(() => setPasswordSuccess(false), 3000);
                  }
                } catch {
                  setPasswordError(tAuto('auto.connectionError'));
                } finally {
                  setPasswordSaving(false);
                }
              }}
              disabled={passwordSaving}
              className="bg-teal-600 hover:bg-teal-700 text-white h-10 rounded-lg shadow-sm shadow-teal-500/20"
            >
              {passwordSaving ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {tAuto('auto.updating')}
                </span>
              ) : (
                tAuto('auto.updatePassword')
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Two-Factor Authentication (2FA) */}
      <TwoFactorSetup isAr={isAr} />

      <Card>
        <CardContent className="p-6">
          <SectionHeader
            icon={Smartphone}
            title={tAuto('auto.activeSessions')}
            subtitle={tAuto('auto.manageLoggedInDevices')}
          />
          {/* Current session from auth API */}
          {sessionData?.isAuthenticated && sessionData?.user && (
            <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <Monitor className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white flex items-center gap-2">
                    {sessionData.user.name || sessionData.user.email}
                    <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 text-[10px] h-5 px-1.5 border-0">
                      {tAuto('auto.current')}
                    </Badge>
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {sessionData.user.email}
                    {sessionData.user.lastLogin && (
                      <> · {tAuto('auto.lastLogin1')}: {new Date(sessionData.user.lastLogin).toLocaleDateString(isAr ? "ar-SA" : "en-US")}</>
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}
          {/* Admin contact message for session management */}
          <div className="mt-4 p-4 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/30">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
                  {tAuto('auto.sessionManagement')}
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  {tAuto('auto.activeSessionAndDeviceManagementIsHandle')}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Clear Data — Danger Zone */}
      <Card className="border-red-200 dark:border-red-900/50">
        <CardContent className="p-6">
          <div className="space-y-1 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-red-700 dark:text-red-400">
                  {tAuto('auto.dangerZone')}
                </h3>
                <p className="text-xs text-red-500 dark:text-red-400/70">
                  {tAuto('auto.irreversibleAndDestructiveActions')}
                </p>
              </div>
            </div>
            <div className="h-0.5 w-16 bg-gradient-to-r from-red-500 to-orange-500 rounded-full mt-2" />
          </div>

          {/* Status messages */}
          {dangerError && (
            <div className="bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg px-4 py-3 text-sm mb-3">
              {dangerError}
            </div>
          )}
          {dangerSuccess && (
            <div className="bg-green-50 dark:bg-green-950/50 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 rounded-lg px-4 py-3 text-sm mb-3">
              {dangerSuccess}
            </div>
          )}

          {/* Confirmation dialog for clear data */}
          {dangerConfirm === "clearData" && (
            <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/20 border-2 border-red-300 dark:border-red-800 mb-3">
              <p className="text-sm font-semibold text-red-700 dark:text-red-400 mb-2">
                {tAuto('auto.confirmDataClearing')}
              </p>
              <p className="text-xs text-red-600 dark:text-red-400/80 mb-3">
                {tAuto('auto.thisActionCannotBeUndoneAllProjectsTasks')}
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="bg-red-600 hover:bg-red-700 text-white h-8 rounded-lg"
                  onClick={async () => {
                    setDangerError("");
                    // Clear data is an admin-only operation
                    setDangerError(isAr ? "لا يمكنك مسح البيانات بنفسك. يرجى التواصل مع مدير النظام لإجراء هذه العملية." : "Self-service data clearing is not available. Please contact your system administrator to perform this action.");
                    setDangerConfirm("");
                  }}
                >
                  {tAuto('auto.confirmClear')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-lg"
                  onClick={() => setDangerConfirm("")}
                >
                  {tAuto('auto.cancel')}
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 rounded-xl bg-red-50/50 dark:bg-red-950/10 border border-red-200 dark:border-red-900/30">
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  {tAuto('auto.clearAllData')}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {tAuto('auto.removeAllProjectsTasksAndRecords')}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="text-xs text-red-600 hover:text-white hover:bg-red-600 h-8 rounded-lg border-red-200 dark:border-red-800"
                onClick={() => { setDangerConfirm(dangerConfirm === "clearData" ? "" : "clearData"); setDangerError(""); setDangerSuccess(""); }}
              >
                <Trash2 className="h-3.5 w-3.5 me-1.5" />
                {tAuto('auto.clearAll')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delete Account — Self-Service */}
      <DeleteAccountTab isAr={isAr} />
    </div>
  );
}
