"use client";
 



import { useTranslations } from 'next-intl';
import { useEffect, useState } from "react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import { useNavStore } from "@/store/nav-store";
import { useAuthStore } from "@/store/auth-store";

interface GuidedTourProps {
  language: "ar" | "en";
}

export function GuidedTour({ language }: GuidedTourProps) {
  const tAuto = useTranslations();
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
        nextBtnText: tAuto('auto.next'),
        prevBtnText: tAuto('auto.previous'),
        doneBtnText: tAuto('auto.done'),
        steps: [
          {
            popover: {
              title: tAuto('auto.welcomeToBluePrint'),
              description: tAuto('auto.thisIsAQuickTourToIntroduceYouToTheMainF'),
              side: "bottom",
              align: 'start'
            }
          },
          {
            element: 'aside', // The sidebar
            popover: {
              title: tAuto('auto.sidebar'),
              description: tAuto('auto.fromHereYouCanNavigateBetweenAllSystemMo'),
              side: "right",
              align: 'start'
            }
          },
          {
            element: 'header', // The header
            popover: {
              title: tAuto('auto.topBar'),
              description: tAuto('auto.containsGlobalSearchNotificationsAndYour'),
              side: "bottom",
              align: 'center'
            }
          },
          {
            popover: {
              title: tAuto('auto.readyToStart'),
              description: tAuto('auto.exploreFreelyYouCanResetDemoDataFromTheT'),
            }
          }
        ],
        onDestroyStarted: () => {
          if (!driverObj.hasNextStep() || confirm(tAuto('auto.areYouSureYouWantToSkipTheTour'))) {
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
