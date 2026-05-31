// ===== Types for Features Hub =====

export type TabId = 'map' | 'visits' | 'boq' | 'time' | 'portal' | 'whatsapp' | 'communications' | 'design'

export interface NavItem {
  id: TabId
  label: string
  icon: React.ReactNode
}

export interface RealProject {
  id: string
  name: string
  nameEn: string
  location: string
  type: string
  status: string
  progress: number
  budget: number
  latitude: number | null
  longitude: number | null
  client: { id: string; name: string; company: string } | null
  contractor: { id: string; name: string; companyName: string; category: string } | null
}

export interface DemoProject {
  id: string
  name: string
  client: string
  status: 'ACTIVE' | 'DELAYED' | 'COMPLETED' | 'ON_HOLD'
  progress: number
  lat: number
  lng: number
  budget: number
  type: string
  startDate: string
  endDate: string
}

export interface DemoEngineer {
  id: string
  name: string
  role: string
  phone: string
  avatar: string
}

export interface DemoVisit {
  id: string
  engineerId: string
  projectId: string
  engineerName: string
  projectName: string
  date: string
  timeIn: string
  timeOut: string | null
  status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED'
  lat: number
  lng: number
  notes: string
}

export interface BOQItem {
  id: string
  description: string
  unit: string
  quantity: number
  unitCost: number
  category: 'civil' | 'structural' | 'mep' | 'finishing' | 'landscape'
  total: number
}

export interface TimeEntry {
  id: string
  projectId: string
  projectName: string
  task: string
  date: string
  startTime: string
  endTime: string | null
  duration: number
  isBillable: boolean
  isTimerRunning: boolean
}

export interface ClientInteraction {
  id: string
  clientId: string
  clientName: string
  projectId: string
  projectName: string
  type: 'meeting' | 'call' | 'email' | 'whatsapp'
  date: string
  subject: string
  description: string
  outcome: string
}

export interface WhatsAppMessage {
  id: string
  contactName: string
  phone: string
  message: string
  timestamp: string
  direction: 'sent' | 'received'
  projectName: string
}

export interface ClientProject {
  id: string
  name: string
  status: string
  progress: number
  milestones: { name: string; completed: boolean; date: string }[]
  documents: { name: string; type: string; date: string }[]
}

export interface FeaturesHubProps {
  language: 'ar' | 'en'
}

export interface Stats {
  totalVisitsThisMonth: number
  avgVisitDuration: string
  totalBillableHours: number
  totalNonBillableHours: number
  activeProjects: number
  delayedProjects: number
  completedProjects: number
}

export interface BoqStats {
  subtotal: number
  vat: number
  contingency: number
  grandTotal: number
  byCategory: Record<string, number>
}

export interface MapProjectItem {
  id: string
  name: string
  nameEn: string
  client: { id: string; name: string; company: string } | null
  status: string
  progress: number
  latitude: number
  longitude: number
  budget: number
  type: string
  location: string
}
