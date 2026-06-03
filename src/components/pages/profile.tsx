"use client";

import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTheme } from "next-themes";
import { useAuthStore } from "@/store/auth-store";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  User, Building2, Calendar, Shield, Key,
  Globe, Moon, Sun, Camera, Save, Eye, EyeOff, Loader2, Trash2,
  Download, AlertTriangle,
} from "lucide-react";
import { getMutationHeaders, getCsrfToken } from "@/lib/csrf-client";
import { extractErrorMessage } from "@/lib/api/fetch-client";

interface ProfileData {
  id: string;
  email: string;
  name: string;
  role: string;
  avatar: string;
  phone: string;
  department: string;
  position: string;
  isActive: boolean;
  lastLogin: string | null;
  createdAt: string;
}

export default function ProfilePage({ language }: { language: "ar" | "en" }) {
  const isAr = language === "ar";
  const { user, updateUser } = useAuthStore();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isEditing, setIsEditing] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Profile query
  const { data: profileData } = useQuery<ProfileData>({
    queryKey: ["profile"],
    queryFn: async () => {
      const res = await fetch("/api/profile");
      if (!res.ok) throw new Error("Failed to fetch profile");
      return res.json();
    },
  });

  // Form state for editing - initialize from auth store (available immediately)
  const [profileForm, setProfileForm] = useState(() => ({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    department: user?.department || "",
    position: user?.position || "",
  }));

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: typeof profileForm) => {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: getMutationHeaders(),
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(extractErrorMessage(err.error, "Failed to update profile"));
      }
      return res.json();
    },
    onSuccess: (data) => {
      updateUser({
        name: data.name,
        email: data.email,
        phone: data.phone,
      });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast({
        title: isAr ? "تم بنجاح" : "Success",
        description: isAr ? "تم تحديث الملف الشخصي" : "Profile updated successfully",
        variant: "success",
      });
      setIsEditing(false);
    },
    onError: (error: Error) => {
      toast({
        title: isAr ? "خطأ" : "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (data: typeof passwordForm) => {
      const res = await fetch("/api/profile/password", {
        method: "PUT",
        headers: getMutationHeaders(),
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(extractErrorMessage(err.error, "Failed to change password"));
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: isAr ? "تم بنجاح" : "Success",
        description: isAr ? "تم تغيير كلمة المرور" : "Password changed successfully",
        variant: "success",
      });
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    },
    onError: (error: Error) => {
      toast({
        title: isAr ? "خطأ" : "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Upload avatar mutation
  const uploadAvatarMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/profile/avatar", {
        method: "POST",
        headers: { 'X-CSRF-Token': getCsrfToken() },
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(extractErrorMessage(err.error, "Failed to upload avatar"));
      }
      return res.json();
    },
    onSuccess: (data) => {
      updateUser({ avatar: data.avatar });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast({
        title: isAr ? "تم بنجاح" : "Success",
        description: isAr ? "تم تحديث الصورة الشخصية" : "Avatar updated successfully",
        variant: "success",
      });
    },
    onError: (error: Error) => {
      toast({
        title: isAr ? "خطأ" : "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete avatar mutation
  const deleteAvatarMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/profile/avatar", { method: "DELETE", headers: getMutationHeaders() });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(extractErrorMessage(err.error, "Failed to delete avatar"));
      }
      return res.json();
    },
    onSuccess: () => {
      updateUser({ avatar: "" });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast({
        title: isAr ? "تم بنجاح" : "Success",
        description: isAr ? "تم حذف الصورة الشخصية" : "Avatar deleted successfully",
        variant: "success",
      });
    },
    onError: (error: Error) => {
      toast({
        title: isAr ? "خطأ" : "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSaveProfile = () => {
    updateProfileMutation.mutate(profileForm);
  };

  const handleChangePassword = () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({
        title: isAr ? "خطأ" : "Error",
        description: isAr ? "كلمات المرور غير متطابقة" : "Passwords do not match",
        variant: "destructive",
      });
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      toast({
        title: isAr ? "خطأ" : "Error",
        description: isAr ? "كلمة المرور قصيرة جداً" : "Password too short",
        variant: "destructive",
      });
      return;
    }
    changePasswordMutation.mutate(passwordForm);
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: isAr ? "خطأ" : "Error",
        description: isAr ? "نوع الملف غير مدعوم" : "File type not supported",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: isAr ? "خطأ" : "Error",
        description: isAr ? "حجم الملف كبير جداً" : "File too large",
        variant: "destructive",
      });
      return;
    }

    uploadAvatarMutation.mutate(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDeleteAvatar = () => {
    deleteAvatarMutation.mutate();
  };

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const res = await fetch("/api/profile/export-data");
      if (!res.ok) {
        const err = await res.json();
        throw new Error(extractErrorMessage(err.error, isAr ? "فشل تصدير البيانات" : "Failed to export data"));
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `blueprint-data-${user?.id || "export"}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast({
        title: isAr ? "تم بنجاح" : "Success",
        description: isAr ? "تم تصدير بياناتك بنجاح" : "Your data was exported successfully",
        variant: "success",
      });
      setShowExportDialog(false);
    } catch (error) {
      toast({
        title: isAr ? "خطأ" : "Error",
        description: error instanceof Error ? error.message : (isAr ? "حدث خطأ أثناء التصدير" : "An error occurred during export"),
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const getRoleBadge = (role: string) => {
    const roles: Record<string, { labelAr: string; labelEn: string; color: string }> = {
      admin: { labelAr: "مدير النظام", labelEn: "Admin", color: "bg-red-500" },
      MANAGER: { labelAr: "المدير", labelEn: "Manager", color: "bg-teal-500" },
      project_manager: { labelAr: "مدير مشاريع", labelEn: "PM", color: "bg-cyan-500" },
      engineer: { labelAr: "مهندس", labelEn: "Engineer", color: "bg-sky-500" },
      draftsman: { labelAr: "مساح", labelEn: "Draftsman", color: "bg-violet-500" },
      accountant: { labelAr: "محاسب", labelEn: "Accountant", color: "bg-emerald-500" },
      hr: { labelAr: "موارد بشرية", labelEn: "HR", color: "bg-purple-500" },
      secretary: { labelAr: "سكرتارية", labelEn: "Secretary", color: "bg-amber-500" },
      VIEWER: { labelAr: "مشاهد", labelEn: "Viewer", color: "bg-slate-500" },
    };
    const roleConfig = roles[role] || roles.viewer;
    return (
      <Badge className={`${roleConfig.color} text-white`}>
        {isAr ? roleConfig.labelAr : roleConfig.labelEn}
      </Badge>
    );
  };

  const isSaving = updateProfileMutation.isPending;
  const isChangingPassword = changePasswordMutation.isPending;
  const isUploadingAvatar = uploadAvatarMutation.isPending;

  const profileUser = profileData || user;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            {isAr ? "الملف الشخصي" : "Profile"}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            {isAr ? "إدارة معلومات حسابك" : "Manage your account information"}
          </p>
        </div>
      </div>

      <Tabs defaultValue="profile" className="space-y-6" dir={isAr ? "rtl" : "ltr"}>
        <TabsList className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-1">
          <TabsTrigger value="profile" className="data-[state=active]:bg-slate-100 dark:data-[state=active]:bg-slate-800">
            <User className="w-4 h-4 me-2" />
            {isAr ? "المعلومات الشخصية" : "Personal Info"}
          </TabsTrigger>
          <TabsTrigger value="security" className="data-[state=active]:bg-slate-100 dark:data-[state=active]:bg-slate-800">
            <Shield className="w-4 h-4 me-2" />
            {isAr ? "الأمان" : "Security"}
          </TabsTrigger>
          <TabsTrigger value="preferences" className="data-[state=active]:bg-slate-100 dark:data-[state=active]:bg-slate-800">
            <Globe className="w-4 h-4 me-2" />
            {isAr ? "التفضيلات" : "Preferences"}
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          {/* Avatar Card */}
          <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row items-center gap-6">
                <div className="relative">
                  <Avatar className="w-24 h-24 border-4 border-slate-200 dark:border-slate-700">
                    <AvatarImage src={profileUser?.avatar} />
                    <AvatarFallback className="bg-gradient-to-br from-teal-500 to-teal-600 text-white text-2xl">
                      {profileUser?.name?.[0]?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <Button
                    size="icon"
                    className="absolute bottom-0 end-0 rounded-full bg-teal-500 hover:bg-teal-600 w-8 h-8 shadow-md"
                    onClick={handleAvatarClick}
                    disabled={isUploadingAvatar}
                    aria-label="Change avatar"
                  >
                    {isUploadingAvatar ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Camera className="w-4 h-4" />
                    )}
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </div>
                <div className="text-center md:text-start flex-1">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                    {profileUser?.name || (isAr ? "مستخدم" : "User")}
                  </h2>
                  <p className="text-slate-500 dark:text-slate-400">{profileUser?.email}</p>
                  <div className="flex items-center justify-center md:justify-start gap-2 mt-2">
                    {getRoleBadge(profileUser?.role || "VIEWER")}
                    {profileUser?.isActive && (
                      <Badge variant="outline" className="text-emerald-500 border-emerald-500/30">
                        {isAr ? "نشط" : "Active"}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  {profileUser?.avatar && (
                    <Button
                      variant="outline"
                      size="icon"
                      className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                      onClick={handleDeleteAvatar}
                      disabled={isUploadingAvatar}
                      aria-label="Delete avatar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    className="border-slate-200 dark:border-slate-700"
                    onClick={() => setIsEditing(!isEditing)}
                  >
                    {isEditing
                      ? (isAr ? "إلغاء" : "Cancel")
                      : (isAr ? "تعديل" : "Edit")}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Personal Info */}
          <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="text-slate-900 dark:text-white">
                {isAr ? "المعلومات الشخصية" : "Personal Information"}
              </CardTitle>
              <CardDescription className="text-slate-500 dark:text-slate-400">
                {isAr ? "تحديث معلوماتك الشخصية" : "Update your personal information"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-700 dark:text-slate-300">
                    {isAr ? "الاسم الكامل" : "Full Name"}
                  </Label>
                  <Input
                    value={profileForm.name}
                    onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                    disabled={!isEditing}
                    className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white disabled:opacity-50"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-700 dark:text-slate-300">
                    {isAr ? "البريد الإلكتروني" : "Email"}
                  </Label>
                  <Input
                    type="email"
                    value={profileForm.email}
                    onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                    disabled={!isEditing}
                    className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white disabled:opacity-50"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-700 dark:text-slate-300">
                    {isAr ? "الهاتف" : "Phone"}
                  </Label>
                  <Input
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                    disabled={!isEditing}
                    className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white disabled:opacity-50"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-700 dark:text-slate-300">
                    {isAr ? "المسمى الوظيفي" : "Job Title"}
                  </Label>
                  <Input
                    value={profileForm.position}
                    onChange={(e) => setProfileForm({ ...profileForm, position: e.target.value })}
                    disabled={!isEditing}
                    className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white disabled:opacity-50"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-slate-700 dark:text-slate-300">
                    {isAr ? "القسم" : "Department"}
                  </Label>
                  <Input
                    value={profileForm.department}
                    onChange={(e) => setProfileForm({ ...profileForm, department: e.target.value })}
                    disabled={!isEditing}
                    className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white disabled:opacity-50"
                  />
                </div>
              </div>
            </CardContent>
            {isEditing && (
              <CardFooter className="border-t border-slate-200 dark:border-slate-700 pt-4">
                <Button
                  onClick={handleSaveProfile}
                  className="bg-teal-500 hover:bg-teal-600 text-white"
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 me-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 me-2" />
                  )}
                  {isSaving
                    ? (isAr ? "جاري الحفظ..." : "Saving...")
                    : (isAr ? "حفظ التغييرات" : "Save Changes")}
                </Button>
              </CardFooter>
            )}
          </Card>

          {/* Work Info */}
          <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="text-slate-900 dark:text-white">
                {isAr ? "معلومات العمل" : "Work Information"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <Building2 className="w-5 h-5 text-teal-500" />
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {isAr ? "المنظمة" : "Organization"}
                    </p>
                    <p className="text-slate-900 dark:text-white font-medium">
                      BluePrint Engineering
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <Calendar className="w-5 h-5 text-emerald-500" />
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {isAr ? "تاريخ الانضمام" : "Join Date"}
                    </p>
                    <p className="text-slate-900 dark:text-white font-medium">
                      {profileData?.createdAt
                        ? new Date(profileData.createdAt).toLocaleDateString(isAr ? "ar-AE" : "en-US")
                        : "-"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <Calendar className="w-5 h-5 text-violet-500" />
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {isAr ? "آخر تسجيل دخول" : "Last Login"}
                    </p>
                    <p className="text-slate-900 dark:text-white font-medium">
                      {profileData?.lastLogin
                        ? new Date(profileData.lastLogin).toLocaleDateString(isAr ? "ar-AE" : "en-US")
                        : (isAr ? "اليوم" : "Today")}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          {/* Export My Data Card */}
          <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="text-slate-900 dark:text-white">
                {isAr ? "تصدير بياناتي" : "Export My Data"}
              </CardTitle>
              <CardDescription className="text-slate-500 dark:text-slate-400">
                {isAr ? "قم بتنزيل نسخة من جميع بياناتك الشخصية" : "Download a copy of all your personal data"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <div className="flex items-center gap-3">
                  <Download className="w-5 h-5 text-teal-500" />
                  <div>
                    <p className="text-slate-900 dark:text-white font-medium">
                      {isAr ? "تنزيل بياناتي" : "Download My Data"}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {isAr ? "ملف JSON يحتوي على جميع بياناتك" : "JSON file containing all your data"}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="border-teal-500/30 text-teal-600 dark:text-teal-400 hover:bg-teal-500/10"
                  onClick={() => setShowExportDialog(true)}
                  disabled={isExporting}
                >
                  {isExporting ? (
                    <Loader2 className="w-4 h-4 me-2 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 me-2" />
                  )}
                  {isExporting
                    ? (isAr ? "جاري التصدير..." : "Exporting...")
                    : (isAr ? "تصدير" : "Export")}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Export Confirmation Dialog */}
          <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
            <DialogContent className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
              <DialogHeader>
                <DialogTitle className="text-slate-900 dark:text-white">
                  {isAr ? "تأكيد تصدير البيانات" : "Confirm Data Export"}
                </DialogTitle>
                <DialogDescription className="text-slate-500 dark:text-slate-400">
                  {isAr
                    ? "سيتم تنزيل ملف JSON يحتوي على جميع بياناتك"
                    : "A JSON file containing all your data will be downloaded"}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 py-2">
                <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                      {isAr ? "مهم: حافظ على أمان ملف البيانات" : "Important: Keep your data file secure"}
                    </p>
                    <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">
                      {isAr
                        ? "يحتوي هذا الملف على معلومات حساسة. لا تشاركه مع أي شخص."
                        : "This file contains sensitive information. Do not share it with anyone."}
                    </p>
                  </div>
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400 space-y-1.5">
                  <p className="font-medium text-slate-900 dark:text-white">
                    {isAr ? "البيانات المتضمنة:" : "Data included:"}
                  </p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>{isAr ? "الملف الشخصي (الاسم، البريد، الهاتف، الدور)" : "Profile (name, email, phone, role)"}</li>
                    <li>{isAr ? "المشاريع التي أنشأتها أو المعين بها" : "Projects you created or are assigned to"}</li>
                    <li>{isAr ? "المهام المعينة لك" : "Tasks assigned to you"}</li>
                    <li>{isAr ? "الفواتير التي أنشأتها" : "Invoices you created"}</li>
                    <li>{isAr ? "المستندات التي رفعتها" : "Documents you uploaded"}</li>
                    <li>{isAr ? "سجل النشاط" : "Activity log"}</li>
                    <li>{isAr ? "الإشعارات" : "Notifications"}</li>
                  </ul>
                </div>
              </div>
              <DialogFooter className="gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowExportDialog(false)}
                  className="border-slate-200 dark:border-slate-700"
                  disabled={isExporting}
                >
                  {isAr ? "إلغاء" : "Cancel"}
                </Button>
                <Button
                  onClick={handleExportData}
                  className="bg-teal-500 hover:bg-teal-600 text-white"
                  disabled={isExporting}
                >
                  {isExporting ? (
                    <Loader2 className="w-4 h-4 me-2 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 me-2" />
                  )}
                  {isExporting
                    ? (isAr ? "جاري التصدير..." : "Exporting...")
                    : (isAr ? "تصدير البيانات" : "Export Data")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="text-slate-900 dark:text-white">
                {isAr ? "تغيير كلمة المرور" : "Change Password"}
              </CardTitle>
              <CardDescription className="text-slate-500 dark:text-slate-400">
                {isAr ? "تحديث كلمة المرور الخاصة بك" : "Update your password"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-slate-700 dark:text-slate-300">
                  {isAr ? "كلمة المرور الحالية" : "Current Password"}
                </Label>
                <div className="relative">
                  <Input
                    type={showCurrentPassword ? "text" : "password"}
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                    className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white pe-10"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute end-0 top-0 h-full text-slate-400 hover:text-slate-600"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    aria-label="Toggle password visibility"
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-700 dark:text-slate-300">
                    {isAr ? "كلمة المرور الجديدة" : "New Password"}
                  </Label>
                  <div className="relative">
                    <Input
                      type={showNewPassword ? "text" : "password"}
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                      className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white pe-10"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute end-0 top-0 h-full text-slate-400 hover:text-slate-600"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      aria-label="Toggle password visibility"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-700 dark:text-slate-300">
                    {isAr ? "تأكيد كلمة المرور" : "Confirm Password"}
                  </Label>
                  <Input
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-2">
                {isAr
                  ? "يجب أن تكون كلمة المرور 6 أحرف على الأقل"
                  : "Password must be at least 6 characters"}
              </p>
            </CardContent>
            <CardFooter className="border-t border-slate-200 dark:border-slate-700 pt-4">
              <Button
                onClick={handleChangePassword}
                className="bg-teal-500 hover:bg-teal-600 text-white"
                disabled={isChangingPassword}
              >
                {isChangingPassword ? (
                  <Loader2 className="w-4 h-4 me-2 animate-spin" />
                ) : (
                  <Key className="w-4 h-4 me-2" />
                )}
                {isChangingPassword
                  ? (isAr ? "جاري التغيير..." : "Changing...")
                  : (isAr ? "تغيير كلمة المرور" : "Change Password")}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Preferences Tab */}
        <TabsContent value="preferences" className="space-y-6">
          <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="text-slate-900 dark:text-white">
                {isAr ? "التفضيلات" : "Preferences"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <div className="flex items-center gap-3">
                  <Globe className="w-5 h-5 text-teal-500" />
                  <div>
                    <p className="text-slate-900 dark:text-white font-medium">
                      {isAr ? "اللغة" : "Language"}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {isAr ? "اختر لغة الواجهة" : "Choose interface language"}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={isAr ? "default" : "outline"}
                    size="sm"
                    className={isAr ? "bg-teal-500 hover:bg-teal-600 text-white" : "border-slate-200 dark:border-slate-700"}
                    disabled
                  >
                    العربية
                  </Button>
                  <Button
                    variant={!isAr ? "default" : "outline"}
                    size="sm"
                    className={!isAr ? "bg-teal-500 hover:bg-teal-600 text-white" : "border-slate-200 dark:border-slate-700"}
                    disabled
                  >
                    English
                  </Button>
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <div className="flex items-center gap-3">
                  {theme === "dark" ? (
                    <Moon className="w-5 h-5 text-violet-400" />
                  ) : (
                    <Sun className="w-5 h-5 text-amber-400" />
                  )}
                  <div>
                    <p className="text-slate-900 dark:text-white font-medium">
                      {isAr ? "المظهر" : "Theme"}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {isAr ? "اختر مظهر التطبيق" : "Choose app appearance"}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={theme === "light" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTheme("light")}
                    className={theme === "light" ? "bg-teal-500 hover:bg-teal-600 text-white" : "border-slate-200 dark:border-slate-700"}
                  >
                    <Sun className="w-4 h-4 me-1" />
                    {isAr ? "فاتح" : "Light"}
                  </Button>
                  <Button
                    variant={theme === "dark" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTheme("dark")}
                    className={theme === "dark" ? "bg-teal-500 hover:bg-teal-600 text-white" : "border-slate-200 dark:border-slate-700"}
                  >
                    <Moon className="w-4 h-4 me-1" />
                    {isAr ? "داكن" : "Dark"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
