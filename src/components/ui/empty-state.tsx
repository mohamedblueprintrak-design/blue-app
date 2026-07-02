'use client';

import React from 'react';
import { useLocale } from 'next-intl';
import * as LucideIcons from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  iconName?: keyof typeof LucideIcons;
  actionLabelAr?: string;
  actionLabelEn?: string;
  onAction?: () => void;
  secondaryActionLabelAr?: string;
  secondaryActionLabelEn?: string;
  onSecondaryAction?: () => void;
  className?: string;
}

export function EmptyState({
  titleAr,
  titleEn,
  descriptionAr,
  descriptionEn,
  iconName = 'Inbox',
  actionLabelAr,
  actionLabelEn,
  onAction,
  secondaryActionLabelAr,
  secondaryActionLabelEn,
  onSecondaryAction,
  className = '',
}: EmptyStateProps) {
  const locale = useLocale();
  const isAr = locale === 'ar';

  const title = isAr ? titleAr : titleEn;
  const description = isAr ? descriptionAr : descriptionEn;
  const actionLabel = isAr ? actionLabelAr : actionLabelEn;
  const secondaryActionLabel = isAr ? secondaryActionLabelAr : secondaryActionLabelEn;

  // Resolve the Lucide icon dynamically
  const IconComponent = (LucideIcons[iconName] as React.ComponentType<{ className?: string }>) || LucideIcons.Inbox;

  return (
    <div
      className={`flex flex-col items-center justify-center p-8 text-center rounded-2xl border border-border/40 bg-gradient-to-b from-card/30 to-card/10 backdrop-blur-md shadow-lg transition-all duration-300 hover:shadow-xl hover:border-border/60 ${className}`}
      style={{ minHeight: '320px' }}
    >
      {/* Icon Container with subtle micro-animations */}
      <div className="relative flex items-center justify-center w-16 h-16 mb-6 rounded-full bg-primary/10 text-primary transition-transform duration-500 hover:scale-110">
        <span className="absolute inset-0 rounded-full bg-primary/20 animate-ping opacity-75" style={{ animationDuration: '3s' }}></span>
        <IconComponent className="w-8 h-8 relative z-10" />
      </div>

      {/* Text block */}
      <h3 className="mb-2 text-xl font-bold tracking-tight text-foreground/90 font-sans">
        {title}
      </h3>
      <p className="max-w-md mb-8 text-sm text-muted-foreground/80 leading-relaxed font-sans">
        {description}
      </p>

      {/* Call-to-actions */}
      {(actionLabel || secondaryActionLabel) && (
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full sm:w-auto">
          {secondaryActionLabel && onSecondaryAction && (
            <Button
              variant="outline"
              onClick={onSecondaryAction}
              className="w-full sm:w-auto px-6 py-2 border-border/60 hover:bg-card/50 hover:text-foreground text-sm font-medium transition-all duration-200"
            >
              {secondaryActionLabel}
            </Button>
          )}
          {actionLabel && onAction && (
            <Button
              onClick={onAction}
              className="w-full sm:w-auto px-6 py-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/95 hover:to-primary/75 shadow-sm text-sm font-medium transition-all duration-200 hover:shadow-md transform active:scale-95"
            >
              {actionLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
