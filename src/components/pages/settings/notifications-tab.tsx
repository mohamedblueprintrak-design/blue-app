"use client";

import { NotificationPreferences } from "./notification-preferences";
import type { NotificationSettings } from "./types";

interface NotificationsTabProps {
  isAr: boolean;
  // Legacy props kept for compatibility — the new component fetches its own data
  notifSettings?: NotificationSettings;
  notifSaving?: boolean;
  handleNotifToggle?: (key: string, checked: boolean) => void;
}

export function NotificationsTab({
  isAr,
   
  notifSettings: _notifSettings,
   
  notifSaving: _notifSaving,
   
  handleNotifToggle: _handleNotifToggle,
}: NotificationsTabProps) {
  return <NotificationPreferences isAr={isAr} />;
}
