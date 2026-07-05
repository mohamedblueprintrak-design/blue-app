import LoginPage from "@/components/auth/login-page";

export const metadata = {
  title: "تسجيل الدخول | BluePrint ERP",
  description: "سجّل دخولك إلى نظام BluePrint لإدارة الاستشارات الهندسية",
};

export default function LoginRoute() {
  return <LoginPage />;
}
