'use client'


import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, MapPinned, Timer, Navigation, CheckCircle2 } from 'lucide-react'

import type { DemoVisit, Stats } from './types'
import { DEMO_ENGINEERS } from './constants'
import { getVisitStatusLabel, getVisitStatusColor } from './utils'

interface VisitsSectionProps {
  language: 'ar' | 'en'
  visits: DemoVisit[]
  stats: Stats
  onAddVisit: () => void
}

export default function VisitsSection({
  language,
  visits,
  stats,
  onAddVisit,
}: VisitsSectionProps) {
  const tAuto = useTranslations();
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            {tAuto('auto.engineerSiteVisitTracking')}
          </h2>
          <p className="text-sm text-slate-500">
            {tAuto('auto.manageTrackFieldSiteVisits')}
          </p>
        </div>
        <Button onClick={onAddVisit} className="bg-teal-600 hover:bg-teal-700 text-white">
          <Plus className="h-4 w-4 me-2" /> {tAuto('auto.newVisit')}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-slate-200 dark:border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
                <MapPinned className="h-5 w-5 text-teal-600 dark:text-teal-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500">{tAuto('auto.totalVisits')}</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white">{stats.totalVisitsThisMonth}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 dark:border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Timer className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500">{tAuto('auto.avgDuration')}</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white">
                  {stats.avgVisitDuration} {tAuto('auto.hrs')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 dark:border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Navigation className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500">{tAuto('auto.todaySVisits')}</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white">{visits.filter(v => v.date === '2025-04-08').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 dark:border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500">{tAuto('auto.completed')}</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white">{visits.filter(v => v.status === 'COMPLETED').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Map with visits */}
      <Card className="border-slate-200 dark:border-slate-700/50 overflow-hidden">
        <CardContent className="p-0">
          <div className="h-[300px] relative" style={{ direction: 'ltr' }}>
            <iframe
              src={`https://www.openstreetmap.org/export/embed.html?bbox=55.90,25.76,56.00,25.82&layer=mapnik&${visits.map(v => `marker=${v.lat},${v.lng}`).join('&')}`}
              className="w-full h-full border-0"
              title={tAuto('auto.visitsMap')}
              loading="lazy"
            />
          </div>
        </CardContent>
      </Card>

      {/* Visits per Engineer */}
      <Card className="border-slate-200 dark:border-slate-700/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">
            {tAuto('auto.visitsByEngineer')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {DEMO_ENGINEERS.map(eng => {
              const engVisits = visits.filter(v => v.engineerId === eng.id)
              return (
                <div key={eng.id} className="flex items-center gap-3">
                  <span className="text-xl">{eng.avatar}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium truncate">{eng.name}</span>
                      <span className="text-xs text-slate-500">
                        {engVisits.length} {tAuto('auto.visits')}
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5">
                      <div className="bg-teal-500 h-1.5 rounded-full transition-all" style={{ width: `${Math.min((engVisits.length / Math.max(...DEMO_ENGINEERS.map(e => visits.filter(v => v.engineerId === e.id).length))) * 100, 100)}%` }} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Visits List */}
      <Card className="border-slate-200 dark:border-slate-700/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">
            {tAuto('auto.visitLog')}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-[400px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 dark:bg-slate-800/50">
                  <TableHead className="text-xs">{tAuto('auto.engineer')}</TableHead>
                  <TableHead className="text-xs">{tAuto('auto.project')}</TableHead>
                  <TableHead className="text-xs">{tAuto('auto.date')}</TableHead>
                  <TableHead className="text-xs">{tAuto('auto.time')}</TableHead>
                  <TableHead className="text-xs">{tAuto('auto.status1')}</TableHead>
                  <TableHead className="text-xs">{tAuto('auto.notes')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visits.map(visit => (
                  <TableRow key={visit.id}>
                    <TableCell className="text-xs font-medium">{visit.engineerName}</TableCell>
                    <TableCell className="text-xs">{visit.projectName}</TableCell>
                    <TableCell className="text-xs">{visit.date}</TableCell>
                    <TableCell className="text-xs">{visit.timeIn} - {visit.timeOut || '...'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn('text-[10px]', getVisitStatusColor(visit.status))}>
                        {getVisitStatusLabel(visit.status, language)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-slate-500 max-w-[200px] truncate">{visit.notes}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
