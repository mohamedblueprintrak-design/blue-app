'use client'


import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import dynamic from 'next/dynamic'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { MapPin, TrendingUp, AlertTriangle, CheckCircle2, DollarSign } from 'lucide-react'

import type { RealProject, DemoProject, Stats, MapProjectItem } from './types'
import { DEMO_PROJECTS } from './constants'
import { formatCurrency, getStatusColor, getStatusLabel, getStatusBg } from './utils'

// Dynamic import for Leaflet map (needs DOM)
const ProjectMap = dynamic(() => import('@/components/ui/project-map'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[500px] md:h-[600px] bg-slate-50 dark:bg-slate-900 rounded-lg flex items-center justify-center">
      <div className="text-center space-y-2">
        <div className="w-10 h-10 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center mx-auto animate-pulse">
          <MapPin className="h-5 w-5 text-teal-500" />
        </div>
        <p className="text-sm text-slate-400">Loading map...</p>
      </div>
    </div>
  )
})

interface MapSectionProps {
  language: 'ar' | 'en'
  hasRealData: boolean
  projectsApiResponse: RealProject[] | undefined
  realProjectsForMap: MapProjectItem[]
  mapProjects: MapProjectItem[]
  selectedProject: DemoProject | null
  selectedRealProject: RealProject | null
  setSelectedProject: (project: DemoProject | null) => void
  setSelectedRealProject: (project: RealProject | null) => void
  stats: Stats
}

export default function MapSection({
  language,
  hasRealData,
  projectsApiResponse,
  realProjectsForMap,
  mapProjects,
  selectedProject,
  selectedRealProject,
  setSelectedProject,
  setSelectedRealProject,
  stats,
}: MapSectionProps) {
  const tAuto = useTranslations();
  // Total budget calculation from source
  const totalBudget = hasRealData
    ? (projectsApiResponse || []).reduce((a, p) => a + (p.budget || 0), 0)
    : DEMO_PROJECTS.reduce((a, p) => a + p.budget, 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            {tAuto('auto.projectsMap')}
          </h2>
          <p className="text-sm text-slate-500">
            {hasRealData
              ? (tAuto('auto.allRegisteredProjectsOnTheMap'))
              : (tAuto('auto.allProjectLocationsInRasAlKhaimahDemoDat'))}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {['ACTIVE', 'DELAYED', 'COMPLETED', 'ON_HOLD'].map(status => (
            <Badge key={status} variant="outline" className="flex items-center gap-1.5 text-xs cursor-pointer hover:bg-accent">
              <span className={cn('w-2.5 h-2.5 rounded-full', getStatusColor(status))} />
              {getStatusLabel(status, language)} ({mapProjects.filter(p => p.status === status).length})
            </Badge>
          ))}
        </div>
      </div>

      {/* Data source indicator */}
      {hasRealData && (
        <div className="flex items-center gap-2 text-xs text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/20 px-3 py-1.5 rounded-lg w-fit">
          <div className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
          {tAuto('auto.liveDataFromDatabase')} — {realProjectsForMap.length} {tAuto('auto.projectsOnMap')}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-slate-200 dark:border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500">{tAuto('auto.active')}</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white">{stats.activeProjects}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 dark:border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500">{tAuto('auto.delayed')}</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white">{stats.delayedProjects}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 dark:border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500">{tAuto('auto.completed')}</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white">{stats.completedProjects}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 dark:border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-teal-600 dark:text-teal-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500">{tAuto('auto.totalBudget')}</p>
                <p className="text-lg font-bold text-slate-900 dark:text-white">{formatCurrency(totalBudget, language)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Interactive Leaflet Map */}
      <Card className="border-slate-200 dark:border-slate-700/50 overflow-hidden">
        <CardContent className="p-0">
          <div style={{ direction: 'ltr' }}>
            <ProjectMap
              projects={mapProjects}
              selectedProject={selectedRealProject ? {
                id: selectedRealProject.id,
                name: selectedRealProject.name,
                nameEn: selectedRealProject.nameEn,
                client: selectedRealProject.client,
                status: selectedRealProject.status,
                progress: selectedRealProject.progress,
                latitude: selectedRealProject.latitude ?? 0,
                longitude: selectedRealProject.longitude ?? 0,
                budget: selectedRealProject.budget,
                type: selectedRealProject.type,
                location: selectedRealProject.location,
              } : (selectedProject ? {
                id: selectedProject.id,
                name: selectedProject.name,
                nameEn: selectedProject.name,
                client: { id: '', name: selectedProject.client, company: '' },
                status: selectedProject.status,
                progress: selectedProject.progress,
                latitude: selectedProject.lat,
                longitude: selectedProject.lng,
                budget: selectedProject.budget,
                type: selectedProject.type,
                location: '',
              } : null)}
              onSelectProject={(p) => {
                if (p && hasRealData) {
                  setSelectedRealProject({
                    id: p.id,
                    name: p.name,
                    nameEn: p.nameEn || '',
                    location: p.location || '',
                    type: p.type || '',
                    status: p.status,
                    progress: p.progress,
                    budget: p.budget || 0,
                    latitude: p.latitude,
                    longitude: p.longitude,
                    client: p.client ? { id: '', name: p.client.name, company: p.client.company || '' } : null,
                    contractor: null,
                  })
                  setSelectedProject(null)
                } else {
                  setSelectedRealProject(null)
                  setSelectedProject(p ? {
                    id: p.id,
                    name: p.name,
                    client: p.client?.name || '',
                    status: (['ACTIVE', 'DELAYED', 'COMPLETED', 'ON_HOLD'].includes(p.status) ? p.status : 'ACTIVE') as 'ACTIVE' | 'DELAYED' | 'COMPLETED' | 'ON_HOLD',
                    progress: p.progress,
                    lat: p.latitude,
                    lng: p.longitude,
                    budget: p.budget || 0,
                    type: p.type || '',
                    startDate: '',
                    endDate: '',
                  } : null)
                }
              }}
              height="500px"
              language={language}
            />
          </div>
        </CardContent>
      </Card>

      {/* Project Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {hasRealData ? (projectsApiResponse || []).map((project, idx) => {
          const name = language === 'ar' ? project.name : (project.nameEn || project.name)
          const clientName = project.client?.name || ''
          const clientCompany = project.client?.company || ''
          const isSelected = selectedRealProject?.id === project.id
          const hasCoords = project.latitude && project.longitude

          return (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04 }}
            >
              <Card className={cn(
                'border-slate-200 dark:border-slate-700/50 hover:shadow-lg transition-shadow cursor-pointer',
                isSelected && 'ring-2 ring-teal-500',
                !hasCoords && 'opacity-60'
              )}
                onClick={() => {
                  if (hasCoords) {
                    setSelectedRealProject(isSelected ? null : {
                      id: project.id,
                      name: project.name,
                      nameEn: project.nameEn,
                      client: project.client,
                      contractor: null,
                      status: project.status,
                      progress: project.progress || 0,
                      latitude: project.latitude ?? 0,
                      longitude: project.longitude ?? 0,
                      budget: project.budget || 0,
                      type: project.type,
                      location: project.location,
                    })
                    setSelectedProject(null)
                  }
                }}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={cn('w-3 h-3 rounded-full', getStatusColor(project.status))} />
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white">{name}</h3>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {hasCoords && (
                        <MapPin className="h-3 w-3 text-teal-500" />
                      )}
                      <Badge variant="outline" className={cn('text-[10px]', getStatusBg(project.status))}>
                        {getStatusLabel(project.status, language)}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mb-3">
                    {clientName}{clientCompany ? ` — ${clientCompany}` : ''} {project.type ? `• ${project.type}` : ''}
                  </p>
                  {project.location && (
                    <p className="text-xs text-slate-400 mb-2 flex items-center gap-1">
                      <MapPin className="h-3 w-3 shrink-0" />
                      {project.location}
                    </p>
                  )}
                  <div className="mb-2">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-slate-600 dark:text-slate-400">{tAuto('auto.progress')}</span>
                      <span className="font-medium text-slate-900 dark:text-white">{project.progress || 0}%</span>
                    </div>
                    <Progress value={project.progress || 0} className="h-2" />
                  </div>
                  {(project.budget || 0) > 0 && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">{formatCurrency(project.budget || 0, language)}</span>
                      {!hasCoords && (
                        <span className="text-amber-500 text-[10px]">{tAuto('auto.noLocation')}</span>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )
        }) : DEMO_PROJECTS.map((project, idx) => (
          <motion.div
            key={project.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
          >
            <Card className={cn('border-slate-200 dark:border-slate-700/50 hover:shadow-lg transition-shadow cursor-pointer', selectedProject?.id === project.id && 'ring-2 ring-teal-500')}
              onClick={() => setSelectedProject(selectedProject?.id === project.id ? null : project)}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={cn('w-3 h-3 rounded-full', getStatusColor(project.status))} />
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">{project.name}</h3>
                  </div>
                  <Badge variant="outline" className={cn('text-[10px]', getStatusBg(project.status))}>
                    {getStatusLabel(project.status, language)}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 mb-3">{project.client} • {project.type}</p>
                <div className="mb-2">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-600 dark:text-slate-400">{tAuto('auto.progress')}</span>
                    <span className="font-medium text-slate-900 dark:text-white">{project.progress}%</span>
                  </div>
                  <Progress value={project.progress} className="h-2" />
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">{formatCurrency(project.budget, language)}</span>
                  <span className="text-slate-400">{project.startDate} - {project.endDate}</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Tip for adding location */}
      {hasRealData && (projectsApiResponse || []).some(p => !p.latitude || !p.longitude) && (
        <div className="text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3">
          <MapPin className="h-4 w-4 inline me-1 text-amber-500" />
          {tAuto('auto.someProjectsHaveNoMapLocationYouCanAddAL')}
        </div>
      )}
    </div>
  )
}
