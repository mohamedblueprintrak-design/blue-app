'use client'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { MessageCircle, Search, Send, ExternalLink } from 'lucide-react'

import { DEMO_WHATSAPP_MESSAGES, WHATSAPP_TEMPLATES } from './constants'

interface WhatsAppContact {
  name: string
  phone: string
  projectName: string
}

interface WhatsAppSectionProps {
  language: 'ar' | 'en'
  whatsappContacts: WhatsAppContact[]
  selectedWhatsappContact: string | null
  setSelectedWhatsappContact: (phone: string | null) => void
  whatsappSearch: string
  setWhatsappSearch: (search: string) => void
  whatsappMessage: string
  setWhatsappMessage: (message: string) => void
}

export default function WhatsAppSection({
  language: _language,
  whatsappContacts,
  selectedWhatsappContact,
  setSelectedWhatsappContact,
  whatsappSearch,
  setWhatsappSearch,
  whatsappMessage,
  setWhatsappMessage,
}: WhatsAppSectionProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">واتساب</h2>
          <p className="text-sm text-slate-500">التواصل مع العملاء عبر واتساب</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[600px]">
        {/* Contact List */}
        <Card className="border-slate-200 dark:border-slate-700/50 flex flex-col">
          <CardHeader className="pb-3">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="بحث في جهات الاتصال..."
                className="pr-9 h-9 text-sm"
                value={whatsappSearch}
                onChange={e => setWhatsappSearch(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent className="flex-1 p-0 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="px-3 space-y-1">
                {whatsappContacts.map(contact => (
                  <button
                    key={contact.phone}
                    className={cn('w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-right',
                      selectedWhatsappContact === contact.phone ? 'bg-teal-50 dark:bg-teal-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    )}
                    onClick={() => setSelectedWhatsappContact(contact.phone)}
                  >
                    <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                      <MessageCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{contact.name}</p>
                      <p className="text-[10px] text-slate-500 truncate">{contact.projectName}</p>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Chat Area */}
        <Card className="border-slate-200 dark:border-slate-700/50 lg:col-span-2 flex flex-col">
          <CardHeader className="pb-3 border-b">
            {selectedWhatsappContact ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                    <MessageCircle className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{whatsappContacts.find(c => c.phone === selectedWhatsappContact)?.name}</p>
                    <p className="text-[10px] text-slate-500">{whatsappContacts.find(c => c.phone === selectedWhatsappContact)?.projectName}</p>
                  </div>
                </div>
                <a
                  href={`https://wa.me/${selectedWhatsappContact?.replace('+', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="outline" size="sm" className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 text-xs">
                    <ExternalLink className="h-3 w-3 me-1" />
                    فتح واتساب
                  </Button>
                </a>
              </div>
            ) : (
              <p className="text-sm text-slate-500 text-center">اختر جهة اتصال للبدء</p>
            )}
          </CardHeader>
          <CardContent className="flex-1 p-0 overflow-hidden flex flex-col">
            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-3">
                {DEMO_WHATSAPP_MESSAGES
                  .filter(m => !selectedWhatsappContact || m.phone === selectedWhatsappContact)
                  .map(msg => (
                  <div key={msg.id} className={cn('flex', msg.direction === 'sent' ? 'justify-start' : 'justify-end')}>
                    <div className={cn('max-w-[70%] rounded-2xl px-4 py-2.5',
                      msg.direction === 'sent'
                        ? 'bg-emerald-500 text-white rounded-tr-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-tl-sm'
                    )}>
                      {msg.direction === 'received' && (
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-1">{msg.contactName}</p>
                      )}
                      <p className="text-sm">{msg.message}</p>
                      <p className={cn('text-[10px] mt-1', msg.direction === 'sent' ? 'text-emerald-100' : 'text-slate-400')}>
                        {msg.timestamp}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Quick Templates */}
            <div className="px-3 py-2 border-t">
              <div className="flex gap-1.5 overflow-x-auto pb-2">
                {WHATSAPP_TEMPLATES.map((template, i) => (
                  <button
                    key={i}
                    className="flex-shrink-0 text-[10px] px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-teal-50 hover:text-teal-700 dark:hover:bg-teal-900/20 dark:hover:text-teal-400 transition-colors whitespace-nowrap"
                    onClick={() => setWhatsappMessage(template)}
                  >
                    {template.substring(0, 40)}...
                  </button>
                ))}
              </div>
              {/* Input */}
              <div className="flex items-center gap-2">
                <Input
                  placeholder="اكتب رسالتك..."
                  className="flex-1 h-10 text-sm"
                  value={whatsappMessage}
                  onChange={e => setWhatsappMessage(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && whatsappMessage.trim()) setWhatsappMessage('') }}
                />
                {selectedWhatsappContact && whatsappMessage.trim() && (
                  <a href={`https://wa.me/${selectedWhatsappContact.replace('+', '')}?text=${encodeURIComponent(whatsappMessage)}`} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" className="h-10 bg-emerald-500 hover:bg-emerald-600 text-white px-4">
                      <Send className="h-4 w-4" />
                    </Button>
                  </a>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
