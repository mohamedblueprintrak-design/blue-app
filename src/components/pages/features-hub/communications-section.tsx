'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, CheckCircle2 } from 'lucide-react'

import type { ClientInteraction } from './types'
import { getInteractionIcon, getInteractionTypeLabel } from './utils'

interface CommunicationsSectionProps {
  language: 'ar' | 'en'
  interactions: ClientInteraction[]
  filteredInteractions: ClientInteraction[]
  commFilter: { type: string; clientId: string }
  setCommFilter: (filter: { type: string; clientId: string } | ((prev: { type: string; clientId: string }) => { type: string; clientId: string })) => void
  onAddInteraction: () => void
}

export default function CommunicationsSection({
  language: _language,
  interactions,
  filteredInteractions,
  commFilter,
  setCommFilter,
  onAddInteraction,
}: CommunicationsSectionProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">سجل التواصل مع العملاء</h2>
          <p className="text-sm text-slate-500">جميع التفاعلات والاجتماعات والمكالمات</p>
        </div>
        <div className="flex gap-2">
          <Select value={commFilter.type} onValueChange={v => setCommFilter(p => ({ ...p, type: v }))}>
            <SelectTrigger className="w-[130px] h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">الكل</SelectItem>
              <SelectItem value="MEETING">اجتماعات</SelectItem>
              <SelectItem value="CALL">مكالمات</SelectItem>
              <SelectItem value="email">بريد إلكتروني</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={onAddInteraction} className="bg-teal-600 hover:bg-teal-700 text-white">
            <Plus className="h-4 w-4 me-2" /> تسجيل تواصل
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(['meeting', 'call', 'email'] as const).map(type => (
          <Card key={type} className="border-slate-200 dark:border-slate-700/50">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center',
                type === 'meeting' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600' :
                type === 'call' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600' :
                type === 'email' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600' :
                'bg-green-100 dark:bg-green-900/30 text-green-600'
              )}>
                {getInteractionIcon(type)}
              </div>
              <div>
                <p className="text-xs text-slate-500">{getInteractionTypeLabel(type)}</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white">{interactions.filter(i => i.type === type).length}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Timeline */}
      <Card className="border-slate-200 dark:border-slate-700/50">
        <CardContent className="p-0">
          <div className="max-h-[500px] overflow-y-auto">
            <div className="p-4 space-y-4">
              {filteredInteractions.map((interaction, idx) => (
                <motion.div
                  key={interaction.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="flex gap-3"
                >
                  <div className="flex flex-col items-center">
                    <div className={cn('w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0',
                      interaction.type === 'meeting' ? 'bg-blue-100 text-blue-600' :
                      interaction.type === 'call' ? 'bg-emerald-100 text-emerald-600' :
                      interaction.type === 'email' ? 'bg-purple-100 text-purple-600' :
                      'bg-green-100 text-green-600'
                    )}>
                      {getInteractionIcon(interaction.type)}
                    </div>
                    {idx < filteredInteractions.length - 1 && (
                      <div className="w-px flex-1 bg-slate-200 dark:bg-slate-700 mt-1" />
                    )}
                  </div>
                  <div className="flex-1 pb-4">
                    <Card className="border-slate-200 dark:border-slate-700/50">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">{interaction.subject}</h4>
                            <p className="text-[10px] text-slate-500 mt-0.5">{interaction.clientName} • {interaction.projectName}</p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Badge variant="outline" className="text-[10px]">
                              {getInteractionTypeLabel(interaction.type)}
                            </Badge>
                            <span className="text-[10px] text-slate-400">{interaction.date}</span>
                          </div>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">{interaction.description}</p>
                        {interaction.outcome && (
                          <div className="flex items-start gap-2 p-2 rounded-md bg-emerald-50 dark:bg-emerald-900/10">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-emerald-700 dark:text-emerald-400">{interaction.outcome}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
