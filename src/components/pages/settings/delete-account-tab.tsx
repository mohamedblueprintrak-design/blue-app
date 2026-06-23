"use client";


import { useTranslations } from 'next-intl';
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  Key,
  Type,
  ShieldAlert,
} from "lucide-react";
import { getMutationHeaders } from "@/lib/csrf-client";
import { extractErrorMessage } from "@/lib/api/fetch-client";

interface DeleteAccountTabProps {
  isAr: boolean;
}

export function DeleteAccountTab({ isAr }: DeleteAccountTabProps) {
  const tAuto = useTranslations();
  const [password, setPassword] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const isDeleteEnabled =
    password.length > 0 && confirmText === "DELETE" && !loading;

  async function handleDelete() {
    if (!isDeleteEnabled) return;

    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const res = await fetch("/api/profile/delete-account", {
        method: "POST",
        headers: getMutationHeaders(),
        body: JSON.stringify({
          password,
          confirmText,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        const errMsg =
          data?.error?.message ||
          extractErrorMessage(data.error, tAuto('auto.anErrorOccurred'));

        // Handle specific error codes with localized messages
        const code = data?.error?.code;
        if (code === "SOLE_ADMIN") {
          setError(
            tAuto('auto.youAreTheOnlyAdminInYourOrganizationPlea')
          );
        } else if (code === "RATE_LIMITED") {
          setError(errMsg);
        } else if (code === "INVALID_PASSWORD") {
          setError(tAuto('auto.incorrectPassword'));
        } else {
          setError(errMsg);
        }
        return;
      }

      setSuccess(
        tAuto('auto.yourAccountHasBeenSuccessfullyDeletedYou')
      );

      // Redirect to login after a short delay
      setTimeout(() => {
        window.location.href = "/login";
      }, 2000);
    } catch {
      setError(tAuto('auto.connectionErrorOccurred'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="border-red-200 dark:border-red-900/50">
      <CardContent className="p-6">
        {/* Header */}
        <div className="space-y-1 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <ShieldAlert className="h-4 w-4 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-red-700 dark:text-red-400">
                {tAuto('auto.deleteAccount')}
              </h3>
              <p className="text-xs text-red-500 dark:text-red-400/70">
                {tAuto('auto.thisActionCannotBeUndone')}
              </p>
            </div>
          </div>
          <div className="h-0.5 w-16 bg-gradient-to-r from-red-500 to-orange-500 rounded-full mt-2" />
        </div>

        {/* Warning Section */}
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 mb-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-800 dark:text-red-300">
                {tAuto('auto.warningWhatHappensWhenYouDeleteYourAccou')}
              </p>
              <ul className="mt-2 space-y-1.5 text-xs text-red-600 dark:text-red-400/80 list-disc list-inside">
                <li>
                  {tAuto('auto.yourAccountWillBeHiddenAndMarkedAsDelete')}
                </li>
                <li>
                  {tAuto('auto.yourPersonalDataEmailNamePhoneWillBeAnon')}
                </li>
                <li>
                  {tAuto('auto.youWillBeLoggedOutOfAllDevicesImmediatel')}
                </li>
                <li>
                  {tAuto('auto.youWillNotBeAbleToLogInWithThisAccountAg')}
                </li>
                <li>
                  {tAuto('auto.ifYouAreTheSoleAdminYouMustTransferAdmin')}
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg px-4 py-3 text-sm mb-4">
            {error}
          </div>
        )}

        {/* Success message */}
        {success && (
          <div className="bg-green-50 dark:bg-green-950/50 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 rounded-lg px-4 py-3 text-sm mb-4">
            {success}
          </div>
        )}

        {/* Form Fields */}
        <div className="space-y-4 max-w-md">
          {/* Password input */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              {tAuto('auto.password')}
            </Label>
            <div className="relative">
              <Key className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                type="password"
                placeholder="••••••••"
                className="ps-9 h-10 rounded-lg"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                }}
                disabled={loading}
                dir="ltr"
              />
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              {tAuto('auto.enterYourPasswordToConfirmYourIdentity')}
            </p>
          </div>

          {/* Confirmation text input */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              {tAuto('auto.confirmDeletion')}
            </Label>
            <div className="relative">
              <Type className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                type="text"
                placeholder='DELETE'
                className="ps-9 h-10 rounded-lg font-mono"
                value={confirmText}
                onChange={(e) => {
                  setConfirmText(e.target.value);
                  setError("");
                }}
                disabled={loading}
                dir="ltr"
              />
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              {tAuto('auto.typeDELETEToConfirmAccountDeletion')}
            </p>
          </div>

          {/* Delete button */}
          <Button
            onClick={handleDelete}
            disabled={!isDeleteEnabled}
            className={`w-full h-11 rounded-lg font-medium transition-all ${
              isDeleteEnabled
                ? "bg-red-600 hover:bg-red-700 text-white shadow-sm shadow-red-500/20"
                : "bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed"
            }`}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {tAuto('auto.deletingAccount')}
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                {tAuto('auto.permanentlyDeleteMyAccount')}
              </span>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
