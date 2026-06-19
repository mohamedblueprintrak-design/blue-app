"use client";
 


import { useEffect, useState } from "react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import { useNavStore } from "@/store/nav-store";
import { useAuthStore } from "@/store/auth-store";

interface GuidedTourProps {
  language: "ar" | "en";
}

export function GuidedTour({ language }: GuidedTourProps) {
  const { currentPage } = useNavStore();
  const { user } = useAuthStore();
  const isAr = language === "ar";
  
  // We only show the tour in demo mode and on the dashboard for the first time
  const [hasSeenTour, setHasSeenTour] = useState(true);

  useEffect(() => {
    // Check if we are in Demo mode and haven't seen the tour yet
    const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
    const seen = localStorage.getItem("blueprint-tour-seen") === "true";
    
    if (demoMode && !seen) {
      setHasSeenTour(false);
    }
  }, []);

  useEffect(() => {
    // Only run on dashboard if user hasn't seen it
    if (hasSeenTour || currentPage !== "dashboard" || !user) return;

    // Wait a moment for the UI to settle
    const timer = setTimeout(() => {
      const driverObj = driver({
        showProgress: true,
        animate: true,
        nextBtnText: isAr ? 'التالي' : 'Next',
        prevBtnText: isAr ? 'السابق' : 'Previous',
        doneBtnText: isAr ? 'إنهاء' : 'Done',
        steps: [
          {
            popover: {
              title: isAr ? 'مرحباً بك في BluePrint 👋' : 'Welcome to BluePrint 👋',
              description: isAr ? 'هذه جولة سريعة لتعريفك بأهم ميزات النظام في وضع العرض التجريبي.' : 'This is a quick tour to introduce you to the main features in Demo Mode.',
              side: "bottom",
              align: 'start'
            }
          },
          {
            element: 'aside', // The sidebar
            popover: {
              title: isAr ? 'القائمة الجانبية' : 'Sidebar',
              description: isAr ? 'من هنا يمكنك التنقل بين جميع أقسام النظام (المشاريع، الفواتير، المهام، إلخ).' : 'From here you can navigate between all system modules (Projects, Invoices, Tasks, etc.).',
              side: "right",
              align: 'start'
            }
          },
          {
            element: 'header', // The header
            popover: {
              title: isAr ? 'الشريط العلوي' : 'Top Bar',
              description: isAr ? 'يحتوي على البحث السريع، الإشعارات، وملفك الشخصي.' : 'Contains global search, notifications, and your profile.',
              side: "bottom",
              align: 'center'
            }
          },
          {
            popover: {
              title: isAr ? 'جاهز للبدء؟ 🚀' : 'Ready to start? 🚀',
              description: isAr ? 'تصفح النظام بحرية، يمكنك إعادة تعيين البيانات من الشريط العلوي متى شئت.' : 'Explore freely. You can reset demo data from the top banner anytime.',
            }
          }
        ],
        onDestroyStarted: () => {
          if (!driverObj.hasNextStep() || confirm(isAr ? "هل أنت متأكد من تخطي الجولة؟" : "Are you sure you want to skip the tour?")) {
            driverObj.destroy();
            localStorage.setItem("blueprint-tour-seen", "true");
            setHasSeenTour(true);
          }
        },
      });

      driverObj.drive();
    }, 1500);

    return () => clearTimeout(timer);
  }, [hasSeenTour, currentPage, user, isAr]);

  return null;
}
