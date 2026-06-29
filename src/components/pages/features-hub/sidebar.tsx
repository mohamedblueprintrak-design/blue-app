'use client'


import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Building2, Menu, X, HardHat } from 'lucide-react'

import type { TabId } from './types'
import { NAV_ITEMS } from './constants'

interface SidebarProps {
  activeTab: TabId
  setActiveTab: (tab: TabId) => void
  mobileSidebarOpen: boolean
  setMobileSidebarOpen: (open: boolean) => void
  language?: 'ar' | 'en'
}

const ar = (lang?: 'ar' | 'en') => lang !== 'en'

export function MobileHeader({ mobileSidebarOpen, setMobileSidebarOpen, language }: { mobileSidebarOpen: boolean; setMobileSidebarOpen: (open: boolean) => void; language?: 'ar' | 'en' }) {
  const tAuto = useTranslations();
  const _isAr = ar(language)
  return (
    <div className="lg:hidden sticky top-0 z-50 bg-white dark:bg-slate-900 border-b px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-brand-navy-600 flex items-center justify-center">
          <Building2 className="h-4 w-4 text-white" />
        </div>
        <span className="font-bold text-sm">{tAuto('auto.bluePrint')}</span>
      </div>
      <Button variant="ghost" size="sm" onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}>
        {mobileSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>
    </div>
  )
}

export function Sidebar({ activeTab, setActiveTab, mobileSidebarOpen, setMobileSidebarOpen, language }: SidebarProps) {
  const tAuto = useTranslations();
  const isAr = ar(language)
  return (
    <aside className={cn(
      'fixed lg:sticky top-0 right-0 z-40 h-screen w-64 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex flex-col transition-transform duration-300',
      'lg:translate-x-0',
      mobileSidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
    )}>
      {/* Logo */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-navy-600 flex items-center justify-center shadow-lg shadow-brand-navy-600/20">
            <Building2 className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-sm text-slate-900 dark:text-white">{tAuto('auto.bluePrint')}</h1>
            <p className="text-[10px] text-slate-500">{tAuto('auto.engineeringConsultancy')}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 py-3">
        <nav className="space-y-1 px-3">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              onClick={() => { setActiveTab(item.id); setMobileSidebarOpen(false) }}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200',
                activeTab === item.id
                  ? 'bg-brand-navy-50 dark:bg-brand-navy-900/20 text-brand-navy-700 dark:text-brand-navy-400 font-semibold shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white'
              )}
            >
              <span className={cn(
                'transition-colors',
                activeTab === item.id ? 'text-brand-navy-600 dark:text-brand-navy-400' : 'text-slate-400 dark:text-slate-500'
              )}>
                {item.icon}
              </span>
              <span>{isAr ? item.label : item.labelEn}</span>
            </button>
          ))}
        </nav>
      </ScrollArea>

      {/* Footer */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-brand-navy-100 dark:bg-brand-navy-900/30 flex items-center justify-center">
            <HardHat className="h-4 w-4 text-brand-navy-600 dark:text-brand-navy-400" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-900 dark:text-white">{tAuto('auto.engAbdullahAlMansoori')}</p>
            <p className="text-[10px] text-slate-500">{tAuto('auto.officeManager')}</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
