'use client'

import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Download, Plus } from 'lucide-react'

import type { BOQItem, BoqStats } from './types'
import { BOQ_AI_SUGGESTIONS } from './constants'
import { formatCurrency, getCategoryLabel, getCategoryColor } from './utils'

interface BoqSectionProps {
  language: 'ar' | 'en'
  boqItems: BOQItem[]
  boqStats: BoqStats
  contingencyPercent: number
  setContingencyPercent: (percent: number) => void
  onAddBoqItem: () => void
}

export default function BoqSection({
  language: _language,
  boqItems,
  boqStats,
  contingencyPercent,
  setContingencyPercent,
  onAddBoqItem,
}: BoqSectionProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">حاسبة تكاليف الكميات</h2>
          <p className="text-sm text-slate-500">حساب تفصيلي لتكاليف البناء مع ضريبة القيمة المضافة</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="border-teal-300 text-teal-700 hover:bg-teal-50">
            <Download className="h-4 w-4 me-2" /> تصدير PDF
          </Button>
          <Button onClick={onAddBoqItem} className="bg-teal-600 hover:bg-teal-700 text-white">
            <Plus className="h-4 w-4 me-2" /> بند جديد
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {Object.entries(boqStats.byCategory).map(([cat, total]) => (
          <Card key={cat} className="border-slate-200 dark:border-slate-700/50">
            <CardContent className="p-3">
              <Badge variant="outline" className={cn('text-[10px] mb-2', getCategoryColor(cat))}>
                {getCategoryLabel(cat)}
              </Badge>
              <p className="text-sm font-bold text-slate-900 dark:text-white">{formatCurrency(total)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* BOQ Table */}
      <Card className="border-slate-200 dark:border-slate-700/50">
        <CardContent className="p-0">
          <div className="max-h-[400px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 dark:bg-slate-800/50">
                  <TableHead className="text-xs">البند</TableHead>
                  <TableHead className="text-xs">الوصف</TableHead>
                  <TableHead className="text-xs">الفئة</TableHead>
                  <TableHead className="text-xs">الوحدة</TableHead>
                  <TableHead className="text-xs text-center">الكمية</TableHead>
                  <TableHead className="text-xs text-center">سعر الوحدة</TableHead>
                  <TableHead className="text-xs text-center">الإجمالي</TableHead>
                  <TableHead className="text-xs text-center">تقدير AI</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {boqItems.map(item => {
                  const aiSuggestion = Object.entries(BOQ_AI_SUGGESTIONS).find(([key]) => item.description.includes(key))
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="text-xs font-mono text-slate-400">{item.id.replace('b', 'BOQ-')}</TableCell>
                      <TableCell className="text-xs font-medium">{item.description}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn('text-[10px]', getCategoryColor(item.category))}>
                          {getCategoryLabel(item.category)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">{item.unit}</TableCell>
                      <TableCell className="text-xs text-center tabular-nums">{item.quantity.toLocaleString('ar-AE')}</TableCell>
                      <TableCell className="text-xs text-center tabular-nums">{formatCurrency(item.unitCost)}</TableCell>
                      <TableCell className="text-xs text-center font-semibold tabular-nums">{formatCurrency(item.total)}</TableCell>
                      <TableCell className="text-xs text-center">
                        {aiSuggestion ? (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <Badge variant="outline" className="text-[10px] text-teal-600 border-teal-300 cursor-help">
                                  {formatCurrency(aiSuggestion[1].min)} - {formatCurrency(aiSuggestion[1].max)}
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-xs">نطاق السعر التقديري {aiSuggestion[1].unit}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : <span className="text-slate-300">-</span>}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Totals */}
      <Card className="border-slate-200 dark:border-slate-700/50">
        <CardContent className="p-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600 dark:text-slate-400">المجموع الفرعي</span>
              <span className="text-lg font-bold tabular-nums">{formatCurrency(boqStats.subtotal)}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-600 dark:text-slate-400">ضريبة القيمة المضافة (5%)</span>
                <Badge variant="outline" className="text-[10px]">UAE VAT</Badge>
              </div>
              <span className="text-lg font-bold tabular-nums">{formatCurrency(boqStats.vat)}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-600 dark:text-slate-400">احتياطي طوارئ</span>
                <Select value={String(contingencyPercent)} onValueChange={v => setContingencyPercent(Number(v))}>
                  <SelectTrigger className="w-20 h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[5, 10, 15, 20].map(p => (
                      <SelectItem key={p} value={String(p)}>{p}%</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <span className="text-lg font-bold tabular-nums">{formatCurrency(boqStats.contingency)}</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-base font-bold text-slate-900 dark:text-white">الإجمالي الكلي</span>
              <span className="text-2xl font-bold text-teal-600 dark:text-teal-400 tabular-nums">{formatCurrency(boqStats.grandTotal)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
