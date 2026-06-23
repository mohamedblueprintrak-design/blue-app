'use client'


import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ClipboardList, Archive, CheckCircle2, FileText, Download } from 'lucide-react'

// Types used via constants re-export
import { DEMO_PROJECTS, DEMO_CLIENT_PROJECTS } from './constants'
import { getStatusLabel, getStatusBg } from './utils'

interface PortalSectionProps {
  language: 'ar' | 'en'
}

export default function PortalSection({ language }: PortalSectionProps) {
  const tAuto = useTranslations();
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">{tAuto('auto.clientPortal')}</h2>
          <p className="text-sm text-slate-500">{tAuto('auto.viewProjectStatusAndMilestones')}</p>
        </div>
        <Select defaultValue="1">
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DEMO_PROJECTS.map(p => (
              <SelectItem key={p.id} value={p.id}>{p.client}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {DEMO_CLIENT_PROJECTS.map(project => (
        <Card key={project.id} className="border-slate-200 dark:border-slate-700/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold">{project.name}</CardTitle>
              <Badge className={cn('text-xs', getStatusBg(project.status))}>{getStatusLabel(project.status, language)}</Badge>
            </div>
            <div className="mt-2">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-slate-600">{tAuto('auto.overallProgress')}</span>
                <span className="font-bold">{project.progress}%</span>
              </div>
              <Progress value={project.progress} className="h-3" />
            </div>
          </CardHeader>
          <CardContent>
            {/* Milestones */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-teal-600" />
                {tAuto('auto.milestones')}
              </h3>
              <div className="space-y-3">
                {project.milestones.map((ms, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className={cn('w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5', ms.completed ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-400')}>
                      {ms.completed ? <CheckCircle2 className="h-4 w-4" /> : <span className="text-[10px] font-bold">{i + 1}</span>}
                    </div>
                    <div className="flex-1">
                      <p className={cn('text-sm', ms.completed ? 'text-slate-900 dark:text-white' : 'text-slate-500')}>{ms.name}</p>
                      <p className="text-[10px] text-slate-400">{ms.date}</p>
                    </div>
                    <Badge variant="outline" className={cn('text-[10px]', ms.completed ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-500')}>
                      {ms.completed
                        ? (tAuto('auto.completed'))
                        : (tAuto('auto.pending'))}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            {/* Documents */}
            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Archive className="h-4 w-4 text-teal-600" />
                {tAuto('auto.sharedDocuments')}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {project.documents.map((doc, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                    <FileText className="h-4 w-4 text-teal-600" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{doc.name}</p>
                      <p className="text-[10px] text-slate-400">{doc.date} • {doc.type.toUpperCase()}</p>
                    </div>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" aria-label="Download">
                      <Download className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
