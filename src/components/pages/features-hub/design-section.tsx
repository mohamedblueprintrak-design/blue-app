'use client'

import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FileText, Eye, CheckCircle2, AlertTriangle, BarChart3 } from 'lucide-react'

interface DesignSectionProps {
  language: 'ar' | 'en'
}

export default function DesignSection({ language }: DesignSectionProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">{language === 'ar' ? 'إدارة التصميم' : 'Design Management'}</h2>
          <p className="text-sm text-slate-500">{language === 'ar' ? 'إدارة مراحل التصميم والرسومات الهندسية' : 'Manage design phases and engineering drawings'}</p>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: language === 'ar' ? 'المفهوم' : 'Concept', icon: '💡', status: language === 'ar' ? 'معتمد' : 'Approved', color: 'bg-emerald-100 text-emerald-700' },
          { label: language === 'ar' ? 'تصميم أولي' : 'Preliminary Design', icon: '📐', status: language === 'ar' ? 'قيد التنفيذ' : 'In Progress', color: 'bg-amber-100 text-amber-700' },
          { label: language === 'ar' ? 'تطوير التصميم' : 'Design Development', icon: '🏗️', status: language === 'ar' ? 'لم يبدأ' : 'Not Started', color: 'bg-slate-100 text-slate-600' },
          { label: language === 'ar' ? 'مستندات التنفيذ' : 'Construction Docs', icon: '📋', status: language === 'ar' ? 'لم يبدأ' : 'Not Started', color: 'bg-slate-100 text-slate-600' },
          { label: language === 'ar' ? 'كما بُني' : 'As Built', icon: '✅', status: language === 'ar' ? 'لم يبدأ' : 'Not Started', color: 'bg-slate-100 text-slate-600' },
        ].map((phase, i) => (
          <Card key={i} className="border-slate-200 dark:border-slate-700/50 cursor-pointer hover:shadow-md transition-shadow">
            <CardContent className="p-4 text-center">
              <span className="text-2xl">{phase.icon}</span>
              <p className="text-xs font-semibold mt-2 text-slate-900 dark:text-white">{phase.label}</p>
              <Badge variant="outline" className={cn('text-[10px] mt-2', phase.color)}>{phase.status}</Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Activity */}
      <Card className="border-slate-200 dark:border-slate-700/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">{language === 'ar' ? 'أحدث النشاطات' : 'Recent Activity'}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { action: language === 'ar' ? 'تم رفع مخطط الطابق الثاني' : '2nd floor plan uploaded', project: 'فيلا المريعي', time: language === 'ar' ? 'منذ ساعتين' : '2 hours ago', type: 'upload' },
              { action: language === 'ar' ? 'طلب مراجعة مخطط الواجهات' : 'Facade plan review requested', project: 'برج النخيل', time: language === 'ar' ? 'منذ 4 ساعات' : '4 hours ago', type: 'review' },
              { action: language === 'ar' ? 'تم اعتماد مخطط الأساسات' : 'Foundation plan approved', project: 'فندق الخليج', time: language === 'ar' ? 'منذ يوم' : '1 day ago', type: 'approve' },
              { action: language === 'ar' ? 'تم رصد تعارض في التمديدات' : 'MEP clash detected', project: 'مجمع الواحة التجاري', time: language === 'ar' ? 'منذ يومين' : '2 days ago', type: 'clash' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center',
                  item.type === 'upload' ? 'bg-blue-100 text-blue-600' :
                  item.type === 'review' ? 'bg-amber-100 text-amber-600' :
                  item.type === 'approve' ? 'bg-emerald-100 text-emerald-600' :
                  'bg-red-100 text-red-600'
                )}>
                  {item.type === 'upload' ? <FileText className="h-4 w-4" /> :
                   item.type === 'review' ? <Eye className="h-4 w-4" /> :
                   item.type === 'approve' ? <CheckCircle2 className="h-4 w-4" /> :
                   <AlertTriangle className="h-4 w-4" />}
                </div>
                <div className="flex-1">
                  <p className="text-xs font-medium">{item.action}</p>
                  <p className="text-[10px] text-slate-500">{item.project} • {item.time}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Design Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-slate-200 dark:border-slate-700/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">{language === 'ar' ? 'حالة الرسومات حسب التخصص' : 'Drawing Status by Discipline'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { name: language === 'ar' ? 'معماري' : 'Architectural', total: 24, approved: 18, inReview: 4, draft: 2 },
                { name: language === 'ar' ? 'إنشائي' : 'Structural', total: 18, approved: 12, inReview: 4, draft: 2 },
                { name: language === 'ar' ? 'كهربائي' : 'Electrical', total: 15, approved: 8, inReview: 5, draft: 2 },
                { name: language === 'ar' ? 'سباكة' : 'Plumbing', total: 12, approved: 6, inReview: 4, draft: 2 },
                { name: language === 'ar' ? 'تكييف' : 'HVAC', total: 10, approved: 5, inReview: 3, draft: 2 },
              ].map(disc => (
                <div key={disc.name}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-medium">{disc.name}</span>
                    <span className="text-slate-500">{disc.approved}/{disc.total} {language === 'ar' ? 'معتمد' : 'Approved'}</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 flex overflow-hidden">
                    <div className="bg-emerald-500 h-2 transition-all" style={{ width: `${(disc.approved / disc.total) * 100}%` }} />
                    <div className="bg-amber-500 h-2 transition-all" style={{ width: `${(disc.inReview / disc.total) * 100}%` }} />
                    <div className="bg-slate-300 dark:bg-slate-600 h-2 transition-all" style={{ width: `${(disc.draft / disc.total) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-4 mt-3 pt-3 border-t">
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /><span className="text-[10px] text-slate-500">{language === 'ar' ? 'معتمد' : 'Approved'}</span></div>
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-amber-500" /><span className="text-[10px] text-slate-500">{language === 'ar' ? 'قيد المراجعة' : 'In Review'}</span></div>
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-slate-300" /><span className="text-[10px] text-slate-500">{language === 'ar' ? 'مسودة' : 'Draft'}</span></div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-700/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">{language === 'ar' ? 'مؤشرات الأداء' : 'Performance Indicators'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">{language === 'ar' ? 'إجمالي الرسومات' : 'Total Drawings'}</p>
                    <p className="text-lg font-bold">79</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">{language === 'ar' ? 'نسبة الاعتماد' : 'Approval Rate'}</p>
                    <p className="text-lg font-bold text-emerald-600">62%</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">{language === 'ar' ? 'تعارضات مكتشفة' : 'Detected Clashes'}</p>
                    <p className="text-lg font-bold text-red-600">3</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                    <BarChart3 className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">{language === 'ar' ? 'متوسط التعديلات' : 'Avg Revisions'}</p>
                    <p className="text-lg font-bold">{language === 'ar' ? '2.3 لكل رسم' : '2.3 per drawing'}</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
