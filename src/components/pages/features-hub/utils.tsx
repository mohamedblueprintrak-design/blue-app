import { Users, PhoneCall, Mail } from 'lucide-react'

type Lang = 'ar' | 'en'

// ===== Utility Functions =====
export function formatCurrency(amount: number, language: Lang = 'ar'): string {
  const locale = language === 'en' ? 'en-AE' : 'ar-AE'
  return new Intl.NumberFormat(locale, { style: 'currency', currency: 'AED', minimumFractionDigits: 0 }).format(amount)
}

export function _formatDateAr(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ar-AE', { year: 'numeric', month: 'long', day: 'numeric' })
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'ACTIVE': return 'bg-emerald-500'
    case 'DELAYED': return 'bg-red-500'
    case 'COMPLETED': return 'bg-blue-500'
    case 'ON_HOLD': return 'bg-amber-500'
    default: return 'bg-slate-400'
  }
}

export function getStatusLabel(status: string, language: Lang = 'ar'): string {
  if (language === 'en') {
    switch (status) {
      case 'ACTIVE': return 'Active'
      case 'DELAYED': return 'Delayed'
      case 'COMPLETED': return 'Completed'
      case 'ON_HOLD': return 'On Hold'
      default: return status
    }
  }
  switch (status) {
    case 'ACTIVE': return 'نشط'
    case 'DELAYED': return 'متأخر'
    case 'COMPLETED': return 'مكتمل'
    case 'ON_HOLD': return 'متوقف'
    default: return status
  }
}

export function getStatusBg(status: string): string {
  switch (status) {
    case 'ACTIVE': return 'bg-emerald-100 text-emerald-700'
    case 'DELAYED': return 'bg-red-100 text-red-700'
    case 'COMPLETED': return 'bg-blue-100 text-blue-700'
    case 'ON_HOLD': return 'bg-amber-100 text-amber-700'
    default: return 'bg-slate-100 text-slate-700'
  }
}

export function getVisitStatusLabel(status: string, language: Lang = 'ar'): string {
  if (language === 'en') {
    switch (status) {
      case 'PLANNED': return 'Planned'
      case 'IN_PROGRESS': return 'In Progress'
      case 'COMPLETED': return 'Completed'
      default: return status
    }
  }
  switch (status) {
    case 'PLANNED': return 'مخطط'
    case 'IN_PROGRESS': return 'جاري الزيارة'
    case 'COMPLETED': return 'مكتمل'
    default: return status
  }
}

export function getVisitStatusColor(status: string): string {
  switch (status) {
    case 'PLANNED': return 'bg-slate-100 text-slate-700'
    case 'IN_PROGRESS': return 'bg-amber-100 text-amber-700'
    case 'COMPLETED': return 'bg-emerald-100 text-emerald-700'
    default: return 'bg-slate-100 text-slate-700'
  }
}

export function getInteractionIcon(type: string) {
  switch (type) {
    case 'meeting': return <Users className="h-4 w-4" />
    case 'call': return <PhoneCall className="h-4 w-4" />
    case 'email': return <Mail className="h-4 w-4" />
    default: return <PhoneCall className="h-4 w-4" />
  }
}

export function getInteractionTypeLabel(type: string, language: Lang = 'ar'): string {
  if (language === 'en') {
    switch (type) {
      case 'meeting': return 'Meeting'
      case 'call': return 'Call'
      case 'email': return 'Email'
      default: return 'Communication'
    }
  }
  switch (type) {
    case 'meeting': return 'اجتماع'
    case 'call': return 'مكالمة'
    case 'email': return 'بريد إلكتروني'
    default: return 'تواصل'
  }
}

export function getCategoryLabel(cat: string, language: Lang = 'ar'): string {
  if (language === 'en') {
    switch (cat) {
      case 'civil': return 'Civil'
      case 'structural': return 'Structural'
      case 'mep': return 'MEP'
      case 'finishing': return 'Finishing'
      case 'landscape': return 'Landscape'
      default: return cat
    }
  }
  switch (cat) {
    case 'civil': return 'مدني'
    case 'structural': return 'إنشائي'
    case 'mep': return 'MEP'
    case 'finishing': return 'تشطيبات'
    case 'landscape': return 'تنسيق مواقع'
    default: return cat
  }
}

export function getCategoryColor(cat: string): string {
  switch (cat) {
    case 'civil': return 'bg-amber-100 text-amber-700'
    case 'structural': return 'bg-red-100 text-red-700'
    case 'mep': return 'bg-blue-100 text-blue-700'
    case 'finishing': return 'bg-purple-100 text-purple-700'
    case 'landscape': return 'bg-green-100 text-green-700'
    default: return 'bg-slate-100 text-slate-700'
  }
}

// ===== OpenStreetMap Embed URL Builder (kept for visits tab) =====
export function _buildMapUrl(center?: { lat: number; lng: number }, demoProjects?: { lat: number; lng: number }[]): string {
  if (center) {
    const bbox = `${center.lng - 0.008},${center.lat - 0.008},${center.lng + 0.008},${center.lat + 0.008}`
    return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${center.lat},${center.lng}`
  }
  const projects = demoProjects || []
  const markers = projects.map(p => `marker=${p.lat},${p.lng}`).join('&')
  return `https://www.openstreetmap.org/export/embed.html?bbox=55.90,25.76,56.00,25.82&layer=mapnik&${markers}`
}
