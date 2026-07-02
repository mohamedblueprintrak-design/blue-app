'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useLocale } from 'next-intl';
import { ChevronRight, ChevronLeft, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TourStep {
  selector: string;
  titleAr: string;
  titleEn: string;
  contentAr: string;
  contentEn: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

const TOUR_STEPS: TourStep[] = [
  {
    selector: '#tour-dashboard-overview',
    titleAr: 'مرحباً بك في BluePrint ERP',
    titleEn: 'Welcome to BluePrint ERP',
    contentAr: 'هذه هي لوحة التحكم الرئيسية الخاصة بك، حيث يمكنك الاطلاع على تحليلات المشاريع والمالية والمؤشرات المالية الحية بنظرة واحدة.',
    contentEn: 'This is your main command center. You can view key business, project, and live financial analytics at a glance.',
    position: 'bottom',
  },
  {
    selector: '#tour-sidebar-projects',
    titleAr: 'إدارة المشاريع',
    titleEn: 'Projects Management',
    contentAr: 'نظّم وتابع مشاريعك الهندسية أو الإنشائية، المهام، المراحل، ونسب الإنجاز من هنا.',
    contentEn: 'Organize and track your engineering or construction projects, tasks, stages, and progress claims here.',
    position: 'right',
  },
  {
    selector: '#tour-sidebar-finance',
    titleAr: 'المركز المالي والمحاسبي',
    titleEn: 'Financial & Accounting Center',
    contentAr: 'راقب الأرصدة النقدية والبنكية، الفواتير، المقبوضات، وإقرارات ضريبة القيمة المضافة لدولة الإمارات.',
    contentEn: 'Monitor cash/bank balances, invoices, payments, and UAE VAT returns (5% compliance).',
    position: 'right',
  },
  {
    selector: '#tour-sidebar-activity-log',
    titleAr: 'سجل العمليات والتدقيق',
    titleEn: 'Activity & Audit Log',
    contentAr: 'راجع سجل النشاطات الزمني المفصل لكل العمليات عبر مساحة العمل لضمان الامتثال التام والشفافية.',
    contentEn: 'Review detailed chronological activity across the workspace to ensure full compliance and security transparency.',
    position: 'right',
  },
  {
    selector: '#tour-header-search',
    titleAr: 'البحث الذكي السريع',
    titleEn: 'Global Command Search',
    contentAr: 'اضغط Command+K أو اضغط هنا للبحث الفوري عن أي عميل، فاتورة، أو مشروع والانتقال إليه مباشرة.',
    contentEn: 'Use Command+K or click here to search for any client, invoice, or project instantly and navigate there.',
    position: 'bottom',
  },
  {
    selector: '#tour-header-profile',
    titleAr: 'الملف الشخصي والإعدادات',
    titleEn: 'Profile & Settings',
    contentAr: 'أدر ملفك الشخصي، أدوارك المفعلة (RBAC)، مفاتيح الأمان، أو أعد تشغيل جولة التعريف هذه في أي وقت.',
    contentEn: 'Manage your profile, active roles (RBAC), security keys, or restart this onboarding tour at any time.',
    position: 'bottom',
  },
];

export function ProductTour() {
  const locale = useLocale();
  const isAr = locale === 'ar';
  
  const [isActive, setIsActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  
  const bubbleRef = useRef<HTMLDivElement>(null);

  // Initialize tour check
  useEffect(() => {
    const isCompleted = localStorage.getItem('blueprint_tour_completed');
    if (isCompleted !== 'true') {
      // Small delay to ensure DOM is fully rendered
      const timer = setTimeout(() => {
        setIsActive(true);
        setCurrentStepIndex(0);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  // Listen for custom restart-tour event
  useEffect(() => {
    const handleRestart = () => {
      setIsActive(true);
      setCurrentStepIndex(0);
      localStorage.removeItem('blueprint_tour_completed');
    };
    window.addEventListener('restart-blueprint-tour', handleRestart);
    return () => window.removeEventListener('restart-blueprint-tour', handleRestart);
  }, []);

  // Track target element rect
  useEffect(() => {
    if (!isActive) {
      setTargetRect(null);
      return;
    }

    const step = TOUR_STEPS[currentStepIndex];
    if (!step) return;

    const updateRect = () => {
      const element = document.querySelector(step.selector);
      if (element) {
        // Scroll target into view if needed
        element.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        setTargetRect(element.getBoundingClientRect());
      } else {
        // Target element not in DOM, skip or hide overlay
        setTargetRect(null);
      }
    };

    updateRect();
    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, true);

    return () => {
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
    };
  }, [isActive, currentStepIndex]);

  if (!isActive) return null;

  const currentStep = TOUR_STEPS[currentStepIndex];
  if (!currentStep) return null;

  const handleNext = () => {
    if (currentStepIndex < TOUR_STEPS.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = () => {
    setIsActive(false);
    localStorage.setItem('blueprint_tour_completed', 'true');
  };

  // Determine Bubble Position Styles
  const getBubbleStyles = () => {
    if (!targetRect) {
      // Centered fallback if element not found
      return {
        position: 'fixed' as const,
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 9999,
      };
    }

    const margin = 12;
    const bubbleWidth = 320;
    const bubbleHeight = 220; // approximate
    const position = currentStep.position || 'bottom';

    let top = 0;
    let left = 0;

    switch (position) {
      case 'bottom':
        top = targetRect.bottom + window.scrollY + margin;
        left = targetRect.left + window.scrollX + (targetRect.width - bubbleWidth) / 2;
        break;
      case 'top':
        top = targetRect.top + window.scrollY - bubbleHeight - margin;
        left = targetRect.left + window.scrollX + (targetRect.width - bubbleWidth) / 2;
        break;
      case 'left':
        top = targetRect.top + window.scrollY + (targetRect.height - bubbleHeight) / 2;
        left = targetRect.left + window.scrollX - bubbleWidth - margin;
        break;
      case 'right':
        top = targetRect.top + window.scrollY + (targetRect.height - bubbleHeight) / 2;
        left = targetRect.right + window.scrollX + margin;
        break;
    }

    // Keep bubble on screen boundaries
    const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
    const screenHeight = typeof window !== 'undefined' ? window.innerHeight : 800;

    left = Math.max(margin, Math.min(left, screenWidth - bubbleWidth - margin));
    top = Math.max(margin, Math.min(top, screenHeight - bubbleHeight - margin));

    return {
      position: 'absolute' as const,
      top: `${top}px`,
      left: `${left}px`,
      width: `${bubbleWidth}px`,
      zIndex: 9999,
    };
  };

  const bubbleStyle = getBubbleStyles();

  return (
    <>
      {/* SVG Spotlight Overlay */}
      {targetRect && (
        <svg
          className="fixed inset-0 w-full h-full pointer-events-auto"
          style={{ zIndex: 9998 }}
        >
          <defs>
            <mask id="spotlight-mask">
              <rect width="100%" height="100%" fill="white" />
              {/* Highlight cut-out area */}
              <rect
                x={targetRect.left - 6}
                y={targetRect.top - 6}
                width={targetRect.width + 12}
                height={targetRect.height + 12}
                rx="8"
                ry="8"
                fill="black"
              />
            </mask>
          </defs>
          {/* Dimmed background */}
          <rect
            width="100%"
            height="100%"
            fill="rgba(15, 23, 42, 0.65)"
            mask="url(#spotlight-mask)"
          />
        </svg>
      )}

      {/* Target Pulsing Highlight Ring */}
      {targetRect && (
        <div
          className="absolute border-2 border-primary rounded-lg pointer-events-none animate-pulse"
          style={{
            top: `${targetRect.top + window.scrollY - 8}px`,
            left: `${targetRect.left + window.scrollX - 8}px`,
            width: `${targetRect.width + 16}px`,
            height: `${targetRect.height + 16}px`,
            zIndex: 9998,
            boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.1), 0 0 15px rgba(59, 130, 246, 0.6)',
          }}
        />
      )}

      {/* Tour Dialogue Bubble */}
      <div
        ref={bubbleRef}
        style={bubbleStyle}
        className="bg-card/90 border border-border/60 shadow-2xl backdrop-blur-md rounded-2xl p-5 flex flex-col transition-all duration-300 font-sans"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <span className="flex items-center gap-1.5 text-[11px] font-bold tracking-wide uppercase text-primary bg-primary/10 px-2 py-0.5 rounded-full">
            <HelpCircle className="w-3 h-3" />
            {isAr ? 'جولة تعريفية' : 'Quick Tour'}
          </span>
          <span className="text-xs text-muted-foreground/80 font-mono">
            {currentStepIndex + 1} / {TOUR_STEPS.length}
          </span>
        </div>

        {/* Content */}
        <h4 className="text-base font-bold text-foreground mb-1 leading-snug">
          {isAr ? currentStep.titleAr : currentStep.titleEn}
        </h4>
        <p className="text-xs text-muted-foreground leading-relaxed mb-5 flex-grow">
          {isAr ? currentStep.contentAr : currentStep.contentEn}
        </p>

        {/* Actions Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-border/40 mt-auto">
          <Button
            variant="ghost"
            onClick={handleSkip}
            className="text-xs text-muted-foreground hover:text-foreground h-8 px-2"
          >
            {isAr ? 'تخطي الجولة' : 'Skip Tour'}
          </Button>

          <div className="flex items-center gap-1.5">
            {currentStepIndex > 0 && (
              <Button
                variant="outline"
                onClick={handleBack}
                className="h-8 px-3 text-xs"
              >
                {isAr ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
                {isAr ? 'السابق' : 'Back'}
              </Button>
            )}
            <Button
              onClick={handleNext}
              className="h-8 px-4 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
            >
              {currentStepIndex === TOUR_STEPS.length - 1 ? (isAr ? 'إنهاء' : 'Finish') : (isAr ? 'التالي' : 'Next')}
              {currentStepIndex < TOUR_STEPS.length - 1 && (isAr ? <ChevronLeft className="w-3.5 h-3.5 mr-1" /> : <ChevronRight className="w-3.5 h-3.5 ml-1" />)}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
