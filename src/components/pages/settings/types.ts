export interface SettingsProps {
  language: "ar" | "en";
}

export interface CompanySettings {
  name?: string;
  nameEn?: string;
  email?: string;
  phone?: string;
  address?: string;
  taxNumber?: string;
  currency?: string;
  timezone?: string;
  workingHours?: string;
  workingDays?: string;
  logo?: string;
}

export interface NotificationSettings {
  projectUpdates: boolean;
  taskDeadlines: boolean;
  invoiceReminders: boolean;
  meetingReminders: boolean;
  siteVisitAlerts: boolean;
}

export interface PasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export type DangerConfirmType = "" | "deleteAccount" | "clearData";

export interface AccentColor {
  name: string;
  value: string;
  color: string;
}
