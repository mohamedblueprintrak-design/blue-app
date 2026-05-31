'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { VAT_RATE } from '@/lib/constants'

import type { TabId, RealProject, DemoProject, BOQItem, DemoVisit, TimeEntry, ClientInteraction } from './features-hub/types'
import {
  DEMO_PROJECTS,
  DEMO_ENGINEERS,
  DEMO_VISITS,
  DEMO_BOQ_ITEMS,
  DEMO_TIME_ENTRIES,
  DEMO_INTERACTIONS,
} from './features-hub/constants'

// Sub-components
import MapSection from './features-hub/map-section'
import VisitsSection from './features-hub/visits-section'
import BoqSection from './features-hub/boq-section'
import TimeSection from './features-hub/time-section'
import PortalSection from './features-hub/portal-section'
import WhatsAppSection from './features-hub/whatsapp-section'
import CommunicationsSection from './features-hub/communications-section'
import DesignSection from './features-hub/design-section'
import { AddVisitDialog, AddBoqItemDialog, AddInteractionDialog } from './features-hub/dialogs'
import { MobileHeader, Sidebar } from './features-hub/sidebar'

// ===== Props =====
interface FeaturesHubProps {
  language: 'ar' | 'en'
}

// ===== MAIN COMPONENT =====
export default function FeaturesHub({ language }: FeaturesHubProps) {
  const [activeTab, setActiveTab] = useState<TabId>('map')
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [selectedProject, setSelectedProject] = useState<DemoProject | null>(null)
  const [selectedRealProject, setSelectedRealProject] = useState<RealProject | null>(null)
  const [showAddVisit, setShowAddVisit] = useState(false)
  const [showAddInteraction, setShowAddInteraction] = useState(false)
  const [showAddBoqItem, setShowAddBoqItem] = useState(false)
  const [contingencyPercent, setContingencyPercent] = useState(10)
  const [whatsappSearch, setWhatsappSearch] = useState('')
  const [selectedWhatsappContact, setSelectedWhatsappContact] = useState<string | null>(null)
  const [whatsappMessage, setWhatsappMessage] = useState('')
  const [newVisit, setNewVisit] = useState({ engineerId: '', projectId: '', date: '', timeIn: '', notes: '' })
  const [newInteraction, setNewInteraction] = useState({ clientId: '', projectId: '', type: 'meeting', date: '', subject: '', description: '', outcome: '' })
  const [boqItems, setBoqItems] = useState<BOQItem[]>(DEMO_BOQ_ITEMS)
  const [visits, setVisits] = useState<DemoVisit[]>(DEMO_VISITS)
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>(DEMO_TIME_ENTRIES)
  const [interactions, setInteractions] = useState<ClientInteraction[]>(DEMO_INTERACTIONS)
  const [newBoqItem, setNewBoqItem] = useState({ description: '', unit: 'م²', quantity: 0, unitCost: 0, category: 'civil' as BOQItem['category'] })
  const [commFilter, setCommFilter] = useState({ type: 'all', clientId: 'all' })
  const [activeTimer, setActiveTimer] = useState<string | null>('t6')
  const [timerSeconds, setTimerSeconds] = useState(0)

  // ===== Fetch Real Projects from API =====
  const { data: projectsApiResponse, isLoading: _isLoadingProjects } = useQuery({
    queryKey: ['projects-map'],
    queryFn: async () => {
      const res = await fetch('/api/projects?limit=200')
      if (!res.ok) throw new Error('Failed to fetch projects')
      const data = await res.json()
      return data.projects as RealProject[]
    },
    staleTime: 30000, // 30s cache
    retry: 1,
  })

  // Merge real projects with coordinates into map data
  const realProjectsForMap = useMemo(() => {
    if (!projectsApiResponse) return []
    return projectsApiResponse.filter(p => p.latitude && p.longitude).map(p => ({
      id: p.id,
      name: p.name,
      nameEn: p.nameEn || '',
      client: p.client,
      status: p.status,
      progress: p.progress || 0,
      latitude: p.latitude!,
      longitude: p.longitude!,
      budget: p.budget || 0,
      type: p.type,
      location: p.location,
    }))
  }, [projectsApiResponse])

  // Use real projects for stats if available, otherwise fallback to demo
  const mapProjects = useMemo(() => {
    return realProjectsForMap.length > 0 ? realProjectsForMap : DEMO_PROJECTS.map(p => ({
      id: p.id,
      name: p.name,
      nameEn: p.name,
      client: { id: p.id, name: p.client, company: '' },
      status: p.status,
      progress: p.progress,
      latitude: p.lat,
      longitude: p.lng,
      budget: p.budget,
      type: p.type,
      location: '',
    }))
  }, [realProjectsForMap])

  const hasRealData = realProjectsForMap.length > 0

  // Timer logic
  useEffect(() => {
    if (!activeTimer) return
    const interval = setInterval(() => {
      setTimerSeconds(s => s + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [activeTimer])

  const formatTimer = useCallback((secs: number) => {
    const h = Math.floor(secs / 3600)
    const m = Math.floor((secs % 3600) / 60)
    const s = secs % 60
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }, [])

  // Stats calculations
  const stats = useMemo(() => {
    const completedVisits = visits.filter(v => v.status === 'COMPLETED')
    const avgDuration = completedVisits.length > 0
      ? completedVisits.reduce((acc, v) => {
          if (v.timeIn && v.timeOut) {
            const [h1, m1] = v.timeIn.split(':').map(Number)
            const [h2, m2] = v.timeOut.split(':').map(Number)
            return acc + (h2 * 60 + m2) - (h1 * 60 + m1)
          }
          return acc
        }, 0) / completedVisits.length / 60
      : 0

    const totalBillable = timeEntries.filter(t => t.isBillable).reduce((acc, t) => acc + t.duration, 0)
    const totalNonBillable = timeEntries.filter(t => !t.isBillable).reduce((acc, t) => acc + t.duration, 0)

    // Use real projects for map stats if available
    const sourceProjects = hasRealData ? realProjectsForMap : DEMO_PROJECTS

    return {
      totalVisitsThisMonth: visits.length,
      avgVisitDuration: avgDuration.toFixed(1),
      totalBillableHours: totalBillable,
      totalNonBillableHours: totalNonBillable,
      activeProjects: sourceProjects.filter(p => p.status === 'ACTIVE').length,
      delayedProjects: sourceProjects.filter(p => p.status === 'DELAYED').length,
      completedProjects: sourceProjects.filter(p => p.status === 'COMPLETED').length,
    }
  }, [visits, timeEntries, hasRealData, realProjectsForMap])

  // BOQ calculations
  const boqStats = useMemo(() => {
    const subtotal = boqItems.reduce((acc, item) => acc + item.total, 0)
    const vat = subtotal * VAT_RATE
    const contingency = subtotal * (contingencyPercent / 100)
    const grandTotal = subtotal + vat + contingency

    const byCategory = boqItems.reduce((acc, item) => {
      if (!acc[item.category]) acc[item.category] = 0
      acc[item.category] += item.total
      return acc
    }, {} as Record<string, number>)

    return { subtotal, vat, contingency, grandTotal, byCategory }
  }, [boqItems, contingencyPercent])

  // Project time allocation for pie chart
  const projectTimeAllocation = useMemo(() => {
    return timeEntries.reduce((acc, t) => {
      if (!acc[t.projectName]) acc[t.projectName] = 0
      acc[t.projectName] += t.duration
      return acc
    }, {} as Record<string, number>)
  }, [timeEntries])

  // WhatsApp contacts (unique from projects)
  const whatsappContacts = useMemo(() => {
    const contacts: { name: string; phone: string; projectName: string }[] = [
      { name: 'أحمد المريعي', phone: '+971501112233', projectName: 'فيلا المريعي' },
      { name: 'خالد الشامسي', phone: '+971502223344', projectName: 'فيلا الشامسي' },
      { name: 'سالم الكعبي', phone: '+971503334455', projectName: 'فيلا الكعبي' },
      { name: 'شركة النخيل', phone: '+971504445566', projectName: 'برج النخيل' },
      { name: 'مجموعة الواحة', phone: '+971505556677', projectName: 'مجمع الواحة التجاري' },
      { name: 'شركة الخليج', phone: '+971506667788', projectName: 'فندق الخليج' },
    ]
    return contacts.filter(c => c.name.includes(whatsappSearch) || c.projectName.includes(whatsappSearch))
  }, [whatsappSearch])

  const filteredInteractions = useMemo(() => {
    return interactions.filter(i => {
      if (commFilter.type !== 'all' && i.type !== commFilter.type) return false
      if (commFilter.clientId !== 'all' && i.clientId !== commFilter.clientId) return false
      return true
    })
  }, [interactions, commFilter])

  const handleAddVisit = () => {
    const engineer = DEMO_ENGINEERS.find(e => e.id === newVisit.engineerId)
    const project = DEMO_PROJECTS.find(p => p.id === newVisit.projectId)
    if (!engineer || !project) return

    const visit: DemoVisit = {
      id: `v${Date.now()}`,
      engineerId: newVisit.engineerId,
      projectId: newVisit.projectId,
      engineerName: engineer.name,
      projectName: project.name,
      date: newVisit.date,
      timeIn: newVisit.timeIn,
      timeOut: null,
      status: 'PLANNED',
      lat: project.lat,
      lng: project.lng,
      notes: newVisit.notes,
    }
    setVisits(prev => [visit, ...prev])
    setShowAddVisit(false)
    setNewVisit({ engineerId: '', projectId: '', date: '', timeIn: '', notes: '' })
  }

  const handleAddBoqItem = () => {
    const item: BOQItem = {
      id: `b${Date.now()}`,
      description: newBoqItem.description,
      unit: newBoqItem.unit,
      quantity: newBoqItem.quantity,
      unitCost: newBoqItem.unitCost,
      category: newBoqItem.category,
      total: newBoqItem.quantity * newBoqItem.unitCost,
    }
    setBoqItems(prev => [...prev, item])
    setShowAddBoqItem(false)
    setNewBoqItem({ description: '', unit: 'م²', quantity: 0, unitCost: 0, category: 'civil' })
  }

  const handleAddInteraction = () => {
    const client = DEMO_PROJECTS.find(p => p.id === newInteraction.clientId)
    const project = DEMO_PROJECTS.find(p => p.id === newInteraction.projectId)
    if (!client || !project) return
    const interaction: ClientInteraction = {
      id: `c${Date.now()}`,
      clientId: newInteraction.clientId,
      clientName: client.client,
      projectId: newInteraction.projectId,
      projectName: project.name,
      type: newInteraction.type as ClientInteraction['type'],
      date: newInteraction.date,
      subject: newInteraction.subject,
      description: newInteraction.description,
      outcome: newInteraction.outcome,
    }
    setInteractions(prev => [interaction, ...prev])
    setShowAddInteraction(false)
    setNewInteraction({ clientId: '', projectId: '', type: 'meeting', date: '', subject: '', description: '', outcome: '' })
  }

  const handleToggleTimer = (entryId: string) => {
    setTimeEntries(prev => prev.map(e => {
      if (e.id === entryId) {
        const isRunning = !e.isTimerRunning
        return { ...e, isTimerRunning: isRunning, endTime: isRunning ? null : (e.endTime || new Date().toLocaleTimeString('ar-AE', { hour: '2-digit', minute: '2-digit' })) }
      }
      return { ...e, isTimerRunning: false, endTime: e.endTime || (e.isTimerRunning ? new Date().toLocaleTimeString('ar-AE', { hour: '2-digit', minute: '2-digit' }) : e.endTime) }
    }))
    setActiveTimer(prev => prev === entryId ? null : entryId)
  }

  // ===== RENDER CONTENT =====
  const renderContent = () => {
    switch (activeTab) {
      case 'map': return (
        <MapSection
          language={language}
          hasRealData={hasRealData}
          projectsApiResponse={projectsApiResponse}
          realProjectsForMap={realProjectsForMap}
          mapProjects={mapProjects}
          selectedProject={selectedProject}
          selectedRealProject={selectedRealProject}
          setSelectedProject={setSelectedProject}
          setSelectedRealProject={setSelectedRealProject}
          stats={stats}
        />
      )
      case 'visits': return (
        <VisitsSection
          language={language}
          visits={visits}
          stats={stats}
          onAddVisit={() => setShowAddVisit(true)}
        />
      )
      case 'boq': return (
        <BoqSection
          language={language}
          boqItems={boqItems}
          boqStats={boqStats}
          contingencyPercent={contingencyPercent}
          setContingencyPercent={setContingencyPercent}
          onAddBoqItem={() => setShowAddBoqItem(true)}
        />
      )
      case 'time': return (
        <TimeSection
          language={language}
          timeEntries={timeEntries}
          stats={stats}
          activeTimer={activeTimer}
          timerSeconds={timerSeconds}
          formatTimer={formatTimer}
          projectTimeAllocation={projectTimeAllocation}
          onToggleTimer={handleToggleTimer}
        />
      )
      case 'portal': return <PortalSection language={language} />
      case 'whatsapp': return (
        <WhatsAppSection
          language={language}
          whatsappContacts={whatsappContacts}
          selectedWhatsappContact={selectedWhatsappContact}
          setSelectedWhatsappContact={setSelectedWhatsappContact}
          whatsappSearch={whatsappSearch}
          setWhatsappSearch={setWhatsappSearch}
          whatsappMessage={whatsappMessage}
          setWhatsappMessage={setWhatsappMessage}
        />
      )
      case 'communications': return (
        <CommunicationsSection
          language={language}
          interactions={interactions}
          filteredInteractions={filteredInteractions}
          commFilter={commFilter}
          setCommFilter={setCommFilter}
          onAddInteraction={() => setShowAddInteraction(true)}
        />
      )
      case 'design': return <DesignSection language={language} />
      default: return (
        <MapSection
          language={language}
          hasRealData={hasRealData}
          projectsApiResponse={projectsApiResponse}
          realProjectsForMap={realProjectsForMap}
          mapProjects={mapProjects}
          selectedProject={selectedProject}
          selectedRealProject={selectedRealProject}
          setSelectedProject={setSelectedProject}
          setSelectedRealProject={setSelectedRealProject}
          stats={stats}
        />
      )
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900" dir={language === "ar" ? "rtl" : "ltr"}>
      {/* Mobile Header */}
      <MobileHeader mobileSidebarOpen={mobileSidebarOpen} setMobileSidebarOpen={setMobileSidebarOpen} />

      <div className="flex">
        {/* Sidebar */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          mobileSidebarOpen={mobileSidebarOpen}
          setMobileSidebarOpen={setMobileSidebarOpen}
        />

        {/* Mobile Overlay */}
        {mobileSidebarOpen && (
          <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setMobileSidebarOpen(false)} />
        )}

        {/* Main Content */}
        <main className="flex-1 min-h-screen">
          <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {renderContent()}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>

      {/* ===== DIALOGS ===== */}

      {/* Add Visit Dialog */}
      <AddVisitDialog
        open={showAddVisit}
        onOpenChange={setShowAddVisit}
        newVisit={newVisit}
        setNewVisit={setNewVisit}
        onAdd={handleAddVisit}
      />

      {/* Add BOQ Item Dialog */}
      <AddBoqItemDialog
        open={showAddBoqItem}
        onOpenChange={setShowAddBoqItem}
        newBoqItem={newBoqItem}
        setNewBoqItem={setNewBoqItem}
        onAdd={handleAddBoqItem}
      />

      {/* Add Interaction Dialog */}
      <AddInteractionDialog
        open={showAddInteraction}
        onOpenChange={setShowAddInteraction}
        newInteraction={newInteraction}
        setNewInteraction={setNewInteraction}
        onAdd={handleAddInteraction}
      />
    </div>
  )
}
