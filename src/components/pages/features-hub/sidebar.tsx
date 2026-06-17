'use client'

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
  const isAr = ar(language)
  return (
    <div className="lg:hidden sticky top-0 z-50 bg-white dark:bg-slate-900 border-b px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center">
          <Building2 className="h-4 w-4 text-white" />
        </div>
        <span className="font-bold text-sm">{isAr ? 'بلو برنت' : 'BluePrint'}</span>
      </div>
      <Button variant="ghost" size="sm" onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}>
        {mobileSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>
    </div>
  )
}

export function Sidebar({ activeTab, setActiveTab, mobileSidebarOpen, setMobileSidebarOpen, language }: SidebarProps) {
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
          <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center shadow-lg shadow-teal-600/20">
            <Building2 className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-sm text-slate-900 dark:text-white">{isAr ? 'بلو برنت' : 'BluePrint'}</h1>
            <p className="text-[10px] text-slate-500">{isAr ? 'مكتب الاستشارات الهندسية' : 'Engineering Consultancy'}</p>
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
                  ? 'bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400 font-semibold shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white'
              )}
            >
              <span className={cn(
                'transition-colors',
                activeTab === item.id ? 'text-teal-600 dark:text-teal-400' : 'text-slate-400 dark:text-slate-500'
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
          <div className="w-9 h-9 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
            <HardHat className="h-4 w-4 text-teal-600 dark:text-teal-400" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-900 dark:text-white">{isAr ? 'م. عبدالله المنصوري' : 'Eng. Abdullah Al Mansoori'}</p>
            <p className="text-[10px] text-slate-500">{isAr ? 'مدير المكتب' : 'Office Manager'}</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
