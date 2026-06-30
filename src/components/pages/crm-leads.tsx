'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Target, TrendingUp, Coins, Users, Phone, Mail,
  Trash2, X,
  Building, Check, ArrowRightLeft, MessageCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from "@/components/ui/card"
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useTranslations } from 'next-intl'

interface Lead {
  id: string
  name: string
  company: string | null
  email: string | null
  phone: string | null
  status: string
  estimatedValue: number | string
  notes: string | null
  createdAt: string
}

const COLUMNS = [
  { id: 'NEW', labelAr: 'جديد', labelEn: 'New', color: 'border-blue-500 bg-blue-500/10 text-blue-700 dark:text-blue-400' },
  { id: 'CONTACTED', labelAr: 'تم الاتصال', labelEn: 'Contacted', color: 'border-yellow-500 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400' },
  { id: 'PROPOSAL_SENT', labelAr: 'تم إرسال العرض', labelEn: 'Proposal Sent', color: 'border-purple-500 bg-purple-500/10 text-purple-700 dark:text-purple-400' },
  { id: 'WON', labelAr: 'تم كسبه', labelEn: 'Won', color: 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' },
  { id: 'LOST', labelAr: 'خسر الصفقة', labelEn: 'Lost', color: 'border-rose-500 bg-rose-500/10 text-rose-700 dark:text-rose-400' },
]

export default function CrmLeadsPage({ language = 'ar' }: { language?: 'ar' | 'en' }) {
  const _tAuto = useTranslations()
  const isAr = language === 'ar'

  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [_error, setError] = useState<string | null>(null)

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)

  // Form states
  const [formName, setFormName] = useState('')
  const [formCompany, setFormCompany] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formPhone, setFormPhone] = useState('')
  const [formValue, setFormValue] = useState('')
  const [formStatus, setFormStatus] = useState('NEW')
  const [formNotes, setFormNotes] = useState('')

  // Conversion state
  const [convertingId, setConvertingId] = useState<string | null>(null)
  const [convertSuccess, setConvertSuccess] = useState<string | null>(null)

  // Fetch leads
  const fetchLeads = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/crm/leads')
      if (!res.ok) throw new Error('Failed to fetch leads')
      const data = await res.json()
      // API response structure helper successResponse wraps it in { data: [...] } or just direct array
      const items = data.data ?? data ?? []
      setLeads(items)
      setError(null)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLeads()
  }, [])

  // Handle Drag & Drop
  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    e.dataTransfer.setData('text/plain', leadId)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = async (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault()
    const leadId = e.dataTransfer.getData('text/plain')
    if (!leadId) return

    // Optimistic UI update
    const previousLeads = [...leads]
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: targetStatus } : l))

    try {
      const res = await fetch(`/api/crm/leads/${leadId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: targetStatus }),
      })
      if (!res.ok) throw new Error('Failed to update lead status')
    } catch (err: any) {
      // Revert if error
      setLeads(previousLeads)
      alert(isAr ? 'عذراً، فشل تحديث حالة العميل المحتمل' : 'Sorry, failed to update lead status')
    }
  }

  // Create lead
  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formName.trim()) return

    try {
      const res = await fetch('/api/crm/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName,
          company: formCompany,
          email: formEmail,
          phone: formPhone,
          estimatedValue: formValue ? Number(formValue) : 0,
          status: formStatus,
          notes: formNotes,
        }),
      })

      if (!res.ok) throw new Error('Failed to create lead')
      setIsAddOpen(false)
      resetForm()
      fetchLeads()
    } catch (err: any) {
      alert(err.message)
    }
  }

  // Edit lead details
  const handleEditLead = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedLead) return

    try {
      const res = await fetch(`/api/crm/leads/${selectedLead.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName,
          company: formCompany,
          email: formEmail,
          phone: formPhone,
          estimatedValue: formValue ? Number(formValue) : 0,
          status: formStatus,
          notes: formNotes,
        }),
      })

      if (!res.ok) throw new Error('Failed to update lead')
      setIsEditOpen(false)
      resetForm()
      fetchLeads()
    } catch (err: any) {
      alert(err.message)
    }
  }

  // Delete lead
  const handleDeleteLead = async (leadId: string) => {
    if (!confirm(isAr ? 'هل أنت متأكد من حذف هذا العميل المحتمل؟' : 'Are you sure you want to delete this lead?')) return

    try {
      const res = await fetch(`/api/crm/leads/${leadId}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to delete lead')
      fetchLeads()
    } catch (err: any) {
      alert(err.message)
    }
  }

  // Convert Won lead to Client
  const handleConvertLead = async (leadId: string) => {
    setConvertingId(leadId)
    try {
      const res = await fetch(`/api/crm/leads/${leadId}/convert`, {
        method: 'POST',
      })
      if (!res.ok) throw new Error('Failed to convert lead')
      setConvertSuccess(leadId)
      setTimeout(() => {
        setConvertSuccess(null)
      }, 3000)
      fetchLeads()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setConvertingId(null)
    }
  }

  const openAddModal = () => {
    resetForm()
    setIsAddOpen(true)
  }

  const openEditModal = (lead: Lead) => {
    setSelectedLead(lead)
    setFormName(lead.name)
    setFormCompany(lead.company || '')
    setFormEmail(lead.email || '')
    setFormPhone(lead.phone || '')
    setFormValue(lead.estimatedValue.toString())
    setFormStatus(lead.status)
    setFormNotes(lead.notes || '')
    setIsEditOpen(true)
  }

  const resetForm = () => {
    setFormName('')
    setFormCompany('')
    setFormEmail('')
    setFormPhone('')
    setFormValue('')
    setFormStatus('NEW')
    setFormNotes('')
    setSelectedLead(null)
  }

  // Statistics calculation
  const totalLeads = leads.length
  const pipelineValue = leads.reduce((acc, curr) => acc + Number(curr.estimatedValue || 0), 0)
  const wonLeads = leads.filter(l => l.status === 'WON').length
  const winRate = totalLeads > 0 ? ((wonLeads / totalLeads) * 100).toFixed(0) : '0'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-navy-900 dark:text-white">
            {isAr ? 'إدارة العملاء المحتملين (CRM)' : 'CRM Leads Pipeline'}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {isAr ? 'متابعة مسار مبيعات العملاء الجدد وتحويلهم إلى مشاريع معتمدة' : 'Track and convert new sales prospects into active clients.'}
          </p>
        </div>
        <Button onClick={openAddModal} className="bg-brand-navy-600 hover:bg-brand-navy-700 text-white shadow-md transition-all duration-200">
          <Plus className="h-4 w-4 me-2" />
          {isAr ? 'إضافة عميل محتمل' : 'Add New Lead'}
        </Button>
      </div>

      {/* Stats Board */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200/60 dark:border-slate-800 shadow-sm">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/10 flex items-center justify-center text-blue-600">
              <Target className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">{isAr ? 'إجمالي العملاء المحتملين' : 'Total Leads'}</p>
              <h3 className="text-2xl font-bold text-slate-800 dark:text-white mt-1">{totalLeads}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/60 dark:border-slate-800 shadow-sm">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-900/10 flex items-center justify-center text-emerald-600">
              <Coins className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">{isAr ? 'القيمة المتوقعة للصفقات' : 'Pipeline Value'}</p>
              <h3 className="text-2xl font-bold text-slate-800 dark:text-white mt-1">
                {pipelineValue.toLocaleString(isAr ? 'ar-AE' : 'en-US')} AED
              </h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/60 dark:border-slate-800 shadow-sm">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-900/10 flex items-center justify-center text-purple-600">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">{isAr ? 'معدل النجاح' : 'Win Rate'}</p>
              <h3 className="text-2xl font-bold text-slate-800 dark:text-white mt-1">{winRate}%</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/60 dark:border-slate-800 shadow-sm">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-brand-navy-50 dark:bg-brand-navy-900/10 flex items-center justify-center text-brand-navy-600 dark:text-brand-navy-400">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">{isAr ? 'صفقات ناجحة' : 'Won Deals'}</p>
              <h3 className="text-2xl font-bold text-slate-800 dark:text-white mt-1">{wonLeads}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Kanban Board Container */}
      {loading ? (
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-brand-navy-600" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 overflow-x-auto pb-4">
          {COLUMNS.map(col => {
            const colLeads = leads.filter(l => l.status === col.id)
            const colTotalValue = colLeads.reduce((acc, curr) => acc + Number(curr.estimatedValue || 0), 0)

            return (
              <div
                key={col.id}
                onDragOver={handleDragOver}
                onDrop={e => handleDrop(e, col.id)}
                className="flex flex-col min-w-[240px] bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-200/40 dark:border-slate-800/40 p-4 h-[650px]"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 dark:border-slate-800 mb-4">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${col.color.split(' ').slice(0,2).join(' ')}`}>
                      {colLeads.length}
                    </span>
                    <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200">
                      {isAr ? col.labelAr : col.labelEn}
                    </h4>
                  </div>
                  <span className="text-[10px] text-slate-400 font-semibold">
                    {colTotalValue.toLocaleString()} AED
                  </span>
                </div>

                {/* Cards Scroll */}
                <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                  {colLeads.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-slate-200/40 dark:border-slate-800/40 rounded-xl text-slate-400">
                      <span className="text-xs">{isAr ? 'اسحب البطاقات هنا' : 'Drag cards here'}</span>
                    </div>
                  ) : (
                    colLeads.map(lead => (
                      <motion.div
                        key={lead.id}
                        layoutId={lead.id}
                        draggable
                        onDragStart={e => handleDragStart(e as any, lead.id)}
                        onClick={() => openEditModal(lead)}
                        className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md cursor-grab active:cursor-grabbing p-4 rounded-xl shadow-sm transition-all duration-200 relative group"
                      >
                        <div className="space-y-2 text-right">
                          <div className="flex justify-between items-start gap-2">
                            <span className="text-xs font-bold text-brand-navy-600 dark:text-brand-navy-400">
                              {Number(lead.estimatedValue).toLocaleString()} AED
                            </span>
                            <h5 className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate flex-1 leading-snug">
                              {lead.name}
                            </h5>
                          </div>

                          {lead.company && (
                            <div className="flex items-center gap-1.5 justify-end text-xs text-slate-400">
                              <span>{lead.company}</span>
                              <Building className="h-3 w-3" />
                            </div>
                          )}

                          {(lead.phone || lead.email) && (
                            <div className="flex justify-end gap-2 text-xs text-slate-500 pt-1 border-t border-slate-100/50 dark:border-slate-800/50">
                              {lead.phone && (
                                <a
                                  href={`tel:${lead.phone}`}
                                  onClick={e => e.stopPropagation()}
                                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
                                >
                                  <Phone className="h-3.5 w-3.5 text-slate-400 hover:text-slate-600" />
                                </a>
                              )}
                              {lead.email && (
                                <a
                                  href={`mailto:${lead.email}`}
                                  onClick={e => e.stopPropagation()}
                                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
                                >
                                  <Mail className="h-3.5 w-3.5 text-slate-400 hover:text-slate-600" />
                                </a>
                              )}
                              {lead.phone && (
                                <a
                                  href={`https://wa.me/${lead.phone.replace('+', '')}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={e => e.stopPropagation()}
                                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
                                >
                                  <MessageCircle className="h-3.5 w-3.5 text-emerald-500" />
                                </a>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Convert Button overlay for Won status */}
                        {lead.status === 'WON' && (
                          <div className="mt-3 pt-2 border-t border-slate-100/60 dark:border-slate-800/60 flex justify-end">
                            <Button
                              size="sm"
                              disabled={convertingId === lead.id}
                              onClick={e => {
                                e.stopPropagation()
                                handleConvertLead(lead.id)
                              }}
                              className="bg-emerald-500 hover:bg-emerald-600 text-white font-medium text-[10px] py-1 px-2.5 rounded-lg flex items-center gap-1 shadow-sm"
                            >
                              {convertSuccess === lead.id ? (
                                <>
                                  <Check className="h-3 w-3" />
                                  {isAr ? 'تم التحويل!' : 'Converted!'}
                                </>
                              ) : convertingId === lead.id ? (
                                <div className="animate-spin rounded-full h-3 w-3 border-t border-white" />
                              ) : (
                                <>
                                  <ArrowRightLeft className="h-3 w-3" />
                                  {isAr ? 'تحويل لعميل' : 'Convert to Client'}
                                </>
                              )}
                            </Button>
                          </div>
                        )}

                        {/* Delete button (hidden by default, shows on hover) */}
                        <button
                          onClick={e => {
                            e.stopPropagation()
                            handleDeleteLead(lead.id)
                          }}
                          className="absolute left-2 top-2 opacity-0 group-hover:opacity-100 p-1 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-rose-500 rounded-md transition-all duration-200"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </motion.div>
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add Lead Modal */}
      <AnimatePresence>
        {isAddOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-lg rounded-2xl shadow-xl overflow-hidden text-right"
              dir="rtl"
            >
              <div className="flex justify-between items-center p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                <button onClick={() => setIsAddOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                  <X className="h-5 w-5" />
                </button>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                  {isAr ? 'إضافة عميل محتمل جديد' : 'Add New Lead'}
                </h3>
              </div>

              <form onSubmit={handleCreateLead} className="p-5 space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="lead-name">{isAr ? 'الاسم الثنائي / الاسم التجاري *' : 'Name *'}</Label>
                  <Input
                    id="lead-name"
                    required
                    value={formName}
                    onChange={e => setFormName(e.target.value)}
                    placeholder={isAr ? 'أدخل اسم العميل المحتمل' : 'Enter name'}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="lead-company">{isAr ? 'الشركة' : 'Company'}</Label>
                    <Input
                      id="lead-company"
                      value={formCompany}
                      onChange={e => setFormCompany(e.target.value)}
                      placeholder={isAr ? 'مثال: شركة التطوير العقاري' : 'Example: Real Estate Dev'}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="lead-value">{isAr ? 'القيمة المتوقعة للصفقة (AED)' : 'Estimated Value'}</Label>
                    <Input
                      id="lead-value"
                      type="number"
                      value={formValue}
                      onChange={e => setFormValue(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="lead-phone">{isAr ? 'رقم الهاتف (الواتساب)' : 'Phone Number'}</Label>
                    <Input
                      id="lead-phone"
                      value={formPhone}
                      onChange={e => setFormPhone(e.target.value)}
                      placeholder="+971501234567"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="lead-email">{isAr ? 'البريد الإلكتروني' : 'Email Address'}</Label>
                    <Input
                      id="lead-email"
                      type="email"
                      value={formEmail}
                      onChange={e => setFormEmail(e.target.value)}
                      placeholder="example@mail.com"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="lead-status">{isAr ? 'المرحلة الأولية' : 'Initial Stage'}</Label>
                  <select
                    id="lead-status"
                    value={formStatus}
                    onChange={e => setFormStatus(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy-500"
                  >
                    {COLUMNS.map(col => (
                      <option key={col.id} value={col.id}>{isAr ? col.labelAr : col.labelEn}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="lead-notes">{isAr ? 'ملاحظات وتفاصيل' : 'Notes & Details'}</Label>
                  <Textarea
                    id="lead-notes"
                    value={formNotes}
                    onChange={e => setFormNotes(e.target.value)}
                    placeholder={isAr ? 'شروط المشروع، تاريخ التواصل، إلخ...' : 'Any extra details...'}
                    rows={3}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t dark:border-slate-800">
                  <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
                    {isAr ? 'إلغاء' : 'Cancel'}
                  </Button>
                  <Button type="submit" className="bg-brand-navy-600 hover:bg-brand-navy-700 text-white">
                    {isAr ? 'حفظ وإضافة' : 'Save & Add'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit/View Lead Modal */}
      <AnimatePresence>
        {isEditOpen && selectedLead && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-lg rounded-2xl shadow-xl overflow-hidden text-right"
              dir="rtl"
            >
              <div className="flex justify-between items-center p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                <button onClick={() => setIsEditOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                  <X className="h-5 w-5" />
                </button>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                  {isAr ? 'تفاصيل العميل المحتمل' : 'Lead Details'}
                </h3>
              </div>

              <form onSubmit={handleEditLead} className="p-5 space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="edit-name">{isAr ? 'الاسم *' : 'Name *'}</Label>
                  <Input
                    id="edit-name"
                    required
                    value={formName}
                    onChange={e => setFormName(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="edit-company">{isAr ? 'الشركة' : 'Company'}</Label>
                    <Input
                      id="edit-company"
                      value={formCompany}
                      onChange={e => setFormCompany(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="edit-value">{isAr ? 'القيمة المتوقعة (AED)' : 'Value (AED)'}</Label>
                    <Input
                      id="edit-value"
                      type="number"
                      value={formValue}
                      onChange={e => setFormValue(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="edit-phone">{isAr ? 'رقم الهاتف' : 'Phone'}</Label>
                    <Input
                      id="edit-phone"
                      value={formPhone}
                      onChange={e => setFormPhone(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="edit-email">{isAr ? 'البريد الإلكتروني' : 'Email'}</Label>
                    <Input
                      id="edit-email"
                      type="email"
                      value={formEmail}
                      onChange={e => setFormEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="edit-status">{isAr ? 'الحالة الحالية' : 'Current Stage'}</Label>
                  <select
                    id="edit-status"
                    value={formStatus}
                    onChange={e => setFormStatus(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy-500"
                  >
                    {COLUMNS.map(col => (
                      <option key={col.id} value={col.id}>{isAr ? col.labelAr : col.labelEn}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="edit-notes">{isAr ? 'ملاحظات' : 'Notes'}</Label>
                  <Textarea
                    id="edit-notes"
                    value={formNotes}
                    onChange={e => setFormNotes(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="flex justify-between items-center pt-3 border-t dark:border-slate-800">
                  <Button
                    type="button"
                    variant="outline"
                    className="text-rose-600 hover:text-white hover:bg-rose-600 border-rose-200"
                    onClick={() => {
                      setIsEditOpen(false)
                      handleDeleteLead(selectedLead.id)
                    }}
                  >
                    <Trash2 className="h-4 w-4 me-1.5" />
                    {isAr ? 'حذف العميل' : 'Delete'}
                  </Button>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
                      {isAr ? 'إلغاء' : 'Cancel'}
                    </Button>
                    <Button type="submit" className="bg-brand-navy-600 hover:bg-brand-navy-700 text-white">
                      {isAr ? 'حفظ التعديلات' : 'Save Changes'}
                    </Button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
