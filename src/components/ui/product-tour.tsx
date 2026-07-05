'use client';

import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { useLocale } from 'next-intl';
import { usePathname } from 'next/navigation';
import { ChevronRight, ChevronLeft, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TourStep {
  /**
   * CSS selector for the element to highlight. Must match an element that
   * is actually present in the DOM when the tour reaches this step.
   *
   * IMPORTANT: for sidebar items, target the INNER button
   * (`> [data-sidebar="menu-button"]`) — NOT the outer `<li>`. The `<li>`
   * wraps the entire expandable sub-tree (parent button + all sub-items
   * when expanded), so its bounding rect is huge and the spotlight
   * highlight ends up "pointing to a tab that's in a far-away place"
   * (exactly the bug users reported). The inner button is the visible,
   * clickable row the user actually sees.
   */
  selector: string;
  titleAr: string;
  titleEn: string;
  contentAr: string;
  contentEn: string;
  /**
   * Side of the target where the popover should appear.
   * Use 'right' / 'left' for sidebar items — the runtime will
   * auto-flip them based on RTL so the bubble always lands in the
   * content area rather than off-screen.
   *
   * 'auto' (default) lets the runtime pick the side with the most space,
   * which prevents the bubble from going off-screen for elements near
   * viewport edges (e.g. the user-profile button at the top-end of the
   * header in RTL mode — the previous 'bottom' position pushed the
   * bubble off the bottom of short viewports).
   */
  position?: 'top' | 'bottom' | 'left' | 'right' | 'auto';
}

const TOUR_STEPS: TourStep[] = [
  {
    selector: '#tour-dashboard-overview',
    titleAr: 'مرحباً بك في BluePrint ERP',
    titleEn: 'Welcome to BluePrint ERP',
    contentAr: 'هذه هي لوحة التحكم الرئيسية الخاصة بك، حيث يمكنك الاطلاع على تحليلات المشاريع والمالية والمؤشرات المالية الحية بنظرة واحدة.',
    contentEn: 'This is your main command center. You can view key business, project, and live financial analytics at a glance.',
    position: 'auto',
  },
  {
    // Target the inner menu-button (visible row), NOT the wrapping <li>.
    // The <li> includes the entire expandable sub-tree so its bounding
    // rect is huge and the spotlight covers too much.
    selector: '#tour-sidebar-projects > [data-sidebar="menu-button"]',
    titleAr: 'إدارة المشاريع',
    titleEn: 'Projects Management',
    contentAr: 'نظّم وتابع مشاريعك الهندسية أو الإنشائية، المهام، المراحل، ونسب الإنجاز من هنا.',
    contentEn: 'Organize and track your engineering or construction projects, tasks, stages, and progress claims here.',
    position: 'right',
  },
  {
    selector: '#tour-sidebar-finance > [data-sidebar="menu-button"]',
    titleAr: 'المركز المالي والمحاسبي',
    titleEn: 'Financial & Accounting Center',
    contentAr: 'راقب الأرصدة النقدية والبنكية، الفواتير، المقبوضات، وإقرارات ضريبة القيمة المضافة لدولة الإمارات.',
    contentEn: 'Monitor cash/bank balances, invoices, payments, and UAE VAT returns (5% compliance).',
    position: 'right',
  },
  // NOTE: a previous step here targeted `#tour-sidebar-activity-log`, but no
  // such element exists in the sidebar (the `activity-log` nav id only lives
  // in the `teamSubTabs` config, not in `getNavItems()`). The bubble was
  // silently falling back to centered mode — which is exactly the
  // "positioning during the tour" issue users reported. Removed.
  {
    selector: '#tour-header-search',
    titleAr: 'البحث الذكي السريع',
    titleEn: 'Global Command Search',
    contentAr: 'اضغط Command+K أو اضغط هنا للبحث الفوري عن أي عميل، فاتورة، أو مشروع والانتقال إليه مباشرة.',
    contentEn: 'Use Command+K or click here to search for any client, invoice, or project instantly and navigate there.',
    position: 'auto',
  },
  {
    // 'auto' prevents the bubble from going off-screen for the profile
    // button (top-end of header). The previous 'bottom' position pushed
    // the bubble below the header, which on short viewports + long
    // Arabic content extended past the viewport bottom — exactly the
    // "only a small part of it is visible" bug users reported when the
    // tour reached the admin / profile step.
    selector: '#tour-header-profile',
    titleAr: 'الملف الشخصي والإعدادات',
    titleEn: 'Profile & Settings',
    contentAr: 'أدر ملفك الشخصي، أدوارك المفعلة (RBAC)، مفاتيح الأمان، أو أعد تشغيل جولة التعريف هذه في أي وقت.',
    contentEn: 'Manage your profile, active roles (RBAC), security keys, or restart this onboarding tour at any time.',
    position: 'auto',
  },
];

export function ProductTour() {
  const locale = useLocale();
  const pathname = usePathname();
  const isAr = locale === 'ar';
  
  const [isActive, setIsActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  // Measured actual bubble dimensions — used for accurate on-screen
  // clamping and 'auto' position picking. The previous hard-coded
  // `bubbleHeight = 220 // approximate` was too small for the long
  // Arabic content in some steps, which let the bubble extend past
  // the viewport bottom (the "only a small part of it is visible"
  // bug). Measuring the real height fixes this for free.
  const [bubbleSize, setBubbleSize] = useState<{ w: number; h: number }>({ w: 320, h: 220 });
  
  const bubbleRef = useRef<HTMLDivElement>(null);

  // Initialize tour check.
  //
  // Race-condition guards (the previous 1500ms setTimeout was racing
  // with auth-init + dashboard data fetch and often fired before the
  // sidebar/header DOM was ready, leaving the spotlight empty):
  //   1. Only auto-start on the dashboard HOME route — the first tour
  //      step highlights `#tour-dashboard-overview`, which only exists
  //      on /dashboard (not on sub-routes like /dashboard/projects).
  //      Auto-starting on a sub-route caused step 1 to silently fall
  //      back to centered mode.
  //   2. Poll for the first step's element to actually be in the DOM
  //      before activating. This handles slow hydration / async sidebar
  //      data without a hard-coded delay.
  //
  // IMPORTANT (Task 7): the dashboard page (`src/components/pages/
  // dashboard.tsx`) renders `#tour-dashboard-overview` ONLY AFTER
  // `useQuery('/api/dashboard')` resolves — while loading it returns
  // `<DashboardSkeleton />` which does NOT contain that id. On a fresh
  // login, auth-init + the dashboard data fetch commonly takes 3-8s,
  // which is LONGER than the previous 3s polling budget — so the
  // polling silently gave up and the tour never auto-started. That is
  // exactly the "welcome tour is no longer showing" regression.
  //
  // Fixes:
  //   * Increase the polling budget to 15s (150 × 100ms) so we keep
  //     waiting while the dashboard data loads.
  //   * If the element STILL isn't present after 15s, start the tour
  //     ANYWAY — ProductTour already has a centered fallback when the
  //     target element isn't found, and steps 2-5 target sidebar /
  //     header elements that DO exist on every dashboard route. So
  //     even in the worst case the user still sees the tour instead
  //     of nothing.
  //   * In dev mode (`NODE_ENV === 'development'`) bypass the
  //     localStorage "completed" check so the tour always auto-starts
  //     for easy local testing — this also lets developers recover
  //     from a previous run where the tour was skipped.
  useEffect(() => {
    const isDev = process.env.NODE_ENV === 'development';
    const isCompleted = localStorage.getItem('blueprint_tour_completed');
    if (isCompleted === 'true' && !isDev) return;

    const isDashboardHome =
      pathname === '/dashboard' || pathname === '/dashboard/';
    if (!isDashboardHome) return;

    let cancelled = false;
    let attempts = 0;
    const MAX_ATTEMPTS = 150; // 150 × 100ms = 15s (covers slow /api/dashboard)

    const startTour = () => {
      setIsActive(true);
      setCurrentStepIndex(0);
    };

    const poll = () => {
      if (cancelled) return;
      attempts += 1;
      const firstStep = TOUR_STEPS[0];
      if (firstStep && document.querySelector(firstStep.selector)) {
        startTour();
        return;
      }
      if (attempts < MAX_ATTEMPTS) {
        setTimeout(poll, 100);
      } else {
        // Timeout reached without finding the first step's element.
        // Start the tour anyway — the bubble will fall back to centered
        // mode for step 1, and subsequent steps will highlight the
        // sidebar / header elements (which exist immediately on
        // dashboard mount). This guarantees the user ALWAYS sees the
        // tour at least once instead of silently never seeing it.
        startTour();
      }
    };

    // Seed the first poll on next tick (let DOM settle from route change).
    const seed = setTimeout(poll, 200);

    return () => {
      cancelled = true;
      clearTimeout(seed);
    };
  }, [pathname]);

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
        // Scroll target into view if needed. `block: 'center'` is more
        // reliable than `nearest` for elements inside the sidebar's
        // scroll container — `nearest` would not scroll at all if the
        // element was even partially visible, leaving the highlight
        // cut off when the sidebar was scrolled. `center` forces it
        // into the middle of the viewport (or scroll container) so
        // the bubble has room on all sides.
        element.scrollIntoView({ block: 'center', inline: 'center' });
        // getBoundingClientRect must be read AFTER scrollIntoView settles.
        // Use requestAnimationFrame to defer to the next paint so the
        // browser has applied the scroll offset.
        requestAnimationFrame(() => {
          if (cancelled) return;
          setTargetRect(element.getBoundingClientRect());
        });
      } else {
        // Target element not in DOM, skip or hide overlay
        setTargetRect(null);
      }
    };

    let cancelled = false;
    updateRect();
    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, true);

    return () => {
      cancelled = true;
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
    };
  }, [isActive, currentStepIndex]);

  // Measure the actual bubble size after it renders. This lets the
  // on-screen clamp and 'auto' position picker use the REAL height
  // (which varies with content length / language) instead of the
  // previous hard-coded 220px estimate that was too small for the
  // long Arabic content in step 5 (header-profile) — causing the
  // bubble to extend past the viewport bottom ("only a small part
  // of it is visible" bug).
  useLayoutEffect(() => {
    if (!isActive || !bubbleRef.current) return;
    const measure = () => {
      const el = bubbleRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setBubbleSize({ w: rect.width, h: rect.height });
      }
    };
    measure();
    // Re-measure on resize (responsive content might reflow).
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [isActive, currentStepIndex, targetRect]);

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
    const bubbleWidth = bubbleSize.w;
    const bubbleHeight = bubbleSize.h;
    const scrollY = typeof window !== 'undefined' ? window.scrollY : 0;
    const scrollX = typeof window !== 'undefined' ? window.scrollX : 0;
    const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
    const screenHeight = typeof window !== 'undefined' ? window.innerHeight : 800;

    // RTL flip: sidebar items get position 'right' in LTR (sidebar on
    // left → bubble lands in the content area) but need 'left' in RTL
    // (sidebar on right → bubble still lands in the content area).
    // Without this flip, the bubble gets clamped to the screen edge
    // and overlaps the sidebar in Arabic mode. 'top' / 'bottom' /
    // 'auto' are direction-agnostic and don't need flipping.
    let position = currentStep.position || 'auto';
    if (position === 'right' && isAr) position = 'left';
    else if (position === 'left' && isAr) position = 'right';

    // 'auto' picks the side with the most room. This is what prevents
    // the bubble from going off-screen for elements near viewport
    // edges (e.g. the profile button at the top-end of the header).
    // We compute the available space on each side of the target (in
    // viewport pixels, no scroll offset needed since the bubble uses
    // fixed positioning for the fit check) and pick the side that
    // both (a) has enough room for the bubble and (b) has the most
    // remaining space. If no side fits, we fall back to 'bottom'
    // (matches the previous default) and let the clamp nudge it
    // on-screen.
    if (position === 'auto') {
      const space = {
        top: targetRect.top,                                    // px above target
        bottom: screenHeight - targetRect.bottom,               // px below target
        left: targetRect.left,                                  // px to the left
        right: screenWidth - targetRect.right,                  // px to the right
      };
      type Side = 'top' | 'bottom' | 'left' | 'right';
      // RTL: prefer the side that lands in the content area. Sidebar
      // is on the LEFT in LTR, RIGHT in RTL — so for sidebar-adjacent
      // targets we prefer 'right' in LTR and 'left' in RTL. For
      // header items we prefer 'bottom' (more vertical room). The
      // scoring below encodes these preferences as tie-breakers.
      const score = (side: Side): number => {
        const room = space[side] - (bubbleHeight <= 0 ? 220 : bubbleHeight);
        const horizRoom = space[side] - (bubbleWidth <= 0 ? 320 : bubbleWidth);
        const fits = side === 'top' || side === 'bottom'
          ? space[side] >= bubbleHeight
          : space[side] >= bubbleWidth;
        // Base score = available room. +1000 if it actually fits.
        // +50 for preferred sides (see comment above).
        let s = (side === 'top' || side === 'bottom' ? room : horizRoom) + (fits ? 1000 : 0);
        // Prefer 'bottom' for header targets (more vertical room
        // below the header than above).
        if (side === 'bottom' && targetRect.top < screenHeight / 2) s += 50;
        // For sidebar targets (targetRect spanning the side of the
        // viewport), prefer the content-area side.
        if (side === 'right' && !isAr && targetRect.left < screenWidth / 3) s += 50;
        if (side === 'left' && isAr && targetRect.right > (screenWidth * 2) / 3) s += 50;
        return s;
      };
      const sides: Side[] = ['bottom', 'top', 'right', 'left'];
      let best: Side = 'bottom';
      let bestScore = -Infinity;
      for (const side of sides) {
        const s = score(side);
        if (s > bestScore) {
          bestScore = s;
          best = side;
        }
      }
      position = best;
    }

    let top = 0;
    let left = 0;

    switch (position) {
      case 'bottom':
        top = targetRect.bottom + scrollY + margin;
        left = targetRect.left + scrollX + (targetRect.width - bubbleWidth) / 2;
        break;
      case 'top':
        top = targetRect.top + scrollY - bubbleHeight - margin;
        left = targetRect.left + scrollX + (targetRect.width - bubbleWidth) / 2;
        break;
      case 'left':
        top = targetRect.top + scrollY + (targetRect.height - bubbleHeight) / 2;
        left = targetRect.left + scrollX - bubbleWidth - margin;
        break;
      case 'right':
        top = targetRect.top + scrollY + (targetRect.height - bubbleHeight) / 2;
        left = targetRect.right + scrollX + margin;
        break;
    }

    // Keep bubble on screen boundaries.
    // IMPORTANT: the previous clamp used `screenHeight - bubbleHeight
    // - margin` as the max for `top`, but `top` here is a DOCUMENT
    // coordinate (it includes `scrollY`). On a scrolled page that
    // capped the bubble at document-y = screenHeight - bubbleHeight,
    // which is ABOVE the viewport — pushing the bubble completely
    // off-screen. The fix is to add `scrollY` to the max so the
    // bubble can be placed anywhere inside the current viewport.
    left = Math.max(margin + scrollX, Math.min(left, scrollX + screenWidth - bubbleWidth - margin));
    top = Math.max(margin + scrollY, Math.min(top, scrollY + screenHeight - bubbleHeight - margin));

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
