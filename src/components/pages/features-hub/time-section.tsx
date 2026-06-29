'use client'


import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Clock, DollarSign, AlertTriangle, BarChart3, Play, Square } from 'lucide-react'

import type { TimeEntry, Stats } from './types'
import { PIE_COLORS } from './constants'

interface TimeSectionProps {
  language: 'ar' | 'en'
  timeEntries: TimeEntry[]
  stats: Stats
  activeTimer: string | null
  timerSeconds: number
  formatTimer: (secs: number) => string
  projectTimeAllocation: Record<string, number>
  onToggleTimer: (entryId: string) => void
}

export default function TimeSection({
  language,
  timeEntries,
  stats,
  activeTimer,
  timerSeconds,
  formatTimer,
  projectTimeAllocation,
  onToggleTimer,
}: TimeSectionProps) {
  const tAuto = useTranslations();
  const hrs = tAuto('auto.hrs')
  const dayLabels = language === 'ar'
    ? ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة']
    : ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri']

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">{tAuto('auto.timeTracking')}</h2>
          <p className="text-sm text-slate-500">{tAuto('auto.trackWorkHoursAcrossProjects')}</p>
        </div>
        {activeTimer && (
          <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-2">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-sm font-mono font-bold text-amber-700 dark:text-amber-400">{formatTimer(timerSeconds)}</span>
            <span className="text-xs text-amber-600 dark:text-amber-500">
              {timeEntries.find(t => t.id === activeTimer)?.projectName}
            </span>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-slate-200 dark:border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-navy-100 dark:bg-brand-navy-900/30 flex items-center justify-center">
                <Clock className="h-5 w-5 text-brand-navy-600 dark:text-brand-navy-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500">{tAuto('auto.totalHours')}</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white">{stats.totalBillableHours + stats.totalNonBillableHours} {hrs}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 dark:border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500">{tAuto('auto.billableHours')}</p>
                <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{stats.totalBillableHours} {hrs}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 dark:border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-slate-600 dark:text-slate-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500">{tAuto('auto.nonBillable')}</p>
                <p className="text-xl font-bold text-slate-600 dark:text-slate-400">{stats.totalNonBillableHours} {hrs}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 dark:border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500">{tAuto('auto.overdueTasks')}</p>
                <p className="text-xl font-bold text-amber-600 dark:text-amber-400">2</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pie Chart - Project Time Allocation */}
      <Card className="border-slate-200 dark:border-slate-700/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">{tAuto('auto.timeAllocationByProject')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4">
            <div className="w-40 h-40 rounded-full flex-shrink-0 relative" style={{
              background: `conic-gradient(${Object.entries(projectTimeAllocation).map(([_name, hours], i) => {
                const totalHours = Object.values(projectTimeAllocation).reduce((a, b) => a + b, 0)
                const startAngle = Object.entries(projectTimeAllocation).slice(0, i).reduce((acc, [, h]) => acc + (h / totalHours) * 360, 0)
                const endAngle = startAngle + (hours / totalHours) * 360
                return `${PIE_COLORS[i % PIE_COLORS.length]} ${startAngle}deg ${endAngle}deg`
              }).join(', ')})`
            }}>
              <div className="absolute inset-4 bg-white dark:bg-slate-900 rounded-full flex items-center justify-center">
                <div className="text-center">
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{Object.values(projectTimeAllocation).reduce((a, b) => a + b, 0)}</p>
                  <p className="text-[10px] text-slate-500">{hrs}</p>
                </div>
              </div>
            </div>
            <div className="flex-1 space-y-2">
              {Object.entries(projectTimeAllocation).map(([name, hours], i) => (
                <div key={name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                  <span className="text-xs text-slate-600 dark:text-slate-400 flex-1 truncate">{name}</span>
                  <span className="text-xs font-medium tabular-nums">{hours} {hrs}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Time Entries Table */}
      <Card className="border-slate-200 dark:border-slate-700/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">{tAuto('auto.dailyTimeLog')}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-[400px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 dark:bg-slate-800/50">
                  <TableHead className="text-xs">{tAuto('auto.project')}</TableHead>
                  <TableHead className="text-xs">{tAuto('auto.task')}</TableHead>
                  <TableHead className="text-xs">{tAuto('auto.date')}</TableHead>
                  <TableHead className="text-xs">{tAuto('auto.time')}</TableHead>
                  <TableHead className="text-xs text-center">{tAuto('auto.duration')}</TableHead>
                  <TableHead className="text-xs">{tAuto('auto.type')}</TableHead>
                  <TableHead className="text-xs text-center">{tAuto('auto.control')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {timeEntries.map(entry => (
                  <TableRow key={entry.id}>
                    <TableCell className="text-xs font-medium">{entry.projectName}</TableCell>
                    <TableCell className="text-xs">{entry.task}</TableCell>
                    <TableCell className="text-xs">{entry.date}</TableCell>
                    <TableCell className="text-xs tabular-nums">{entry.startTime} - {entry.endTime || (entry.isTimerRunning ? formatTimer(timerSeconds) : '...')}</TableCell>
                    <TableCell className="text-xs text-center tabular-nums">{entry.duration || (entry.isTimerRunning ? `${Math.floor(timerSeconds / 3600)}:${Math.floor((timerSeconds % 3600) / 60)}` : '-')} {hrs}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn('text-[10px]', entry.isBillable ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-600 border-slate-200')}>
                        {entry.isBillable
                          ? (tAuto('auto.billable'))
                          : (tAuto('auto.nonBillable'))}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        className={cn('h-7 w-7 p-0', entry.isTimerRunning ? 'text-red-500 hover:text-red-700' : 'text-brand-navy-500 hover:text-brand-navy-700')}
                        onClick={() => onToggleTimer(entry.id)}
                        aria-label={entry.isTimerRunning ? 'Stop timer' : 'Start timer'}
                      >
                        {entry.isTimerRunning ? <Square className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Weekly Summary */}
      <Card className="border-slate-200 dark:border-slate-700/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">{tAuto('auto.weeklySummary')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2">
            {dayLabels.map((day, i) => {
              const dayHours = i < 3 ? [5, 4, 2][i] : i === 3 ? 8 : 0
              return (
                <div key={day} className="text-center">
                  <p className="text-[10px] text-slate-500 mb-1">{day}</p>
                  <div className={cn('w-full h-16 rounded-lg flex items-center justify-center text-xs font-bold', dayHours > 0 ? 'bg-brand-navy-50 dark:bg-brand-navy-900/20 text-brand-navy-700 dark:text-brand-navy-400' : 'bg-slate-50 dark:bg-slate-800 text-slate-400')}>
                    {dayHours > 0 ? `${dayHours}h` : '-'}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
