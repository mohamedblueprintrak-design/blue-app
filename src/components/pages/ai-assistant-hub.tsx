"use client";


import { useTranslations } from 'next-intl';
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from '@/components/ui/card'
import { Input } from "@/components/ui/input";

import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sparkles, BookMarked, HelpCircle, Send, Search, MessageSquare, ChevronRight, Star, Clock, TrendingUp, Bot, User, FolderOpen, Globe, Shield } from 'lucide-react'

import { cn } from "@/lib/utils";
import { streamAIChat } from "@/hooks/api/ai-chat";

// ===== Types =====
interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface KnowledgeArticle {
  id: string;
  title: string;
  content: string;
  category: string;
  createdAt: string;
  updatedAt: string;
  author: string;
}

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
  helpful: number;
}

// ===== FAQ Data =====
const faqs: FAQ[] = [
  {
    id: "1",
    question: "كيف أنشئ مشروع جديد؟",
    answer: "اذهب إلى المشاريع من الشريط الجانبي ثم اضغط على 'مشروع جديد'. املأ بيانات المشروع الأساسية واختر العميل من القائمة. بعد الحفظ يمكنك إضافة التفاصيل من تابات المشروع.",
    category: "projects",
    helpful: 15,
  },
  {
    id: "2",
    question: "كيف أرسل طلب عرض سعر لمقاول؟",
    answer: "من داخل المشروع، اذهب إلى تاب 'تعيين مقاول'. اختر المقاولين المناسبين من القائمة واضغط 'إرسال RFQ'. سيتم إبلاغ المقاولين ويمكنهم تقديم عروض أسعارهم.",
    category: "contractors",
    helpful: 12,
  },
  {
    id: "3",
    question: "كيف أتابع مرحلة التصميم؟",
    answer: "من تاب 'مرحلة التصميم' داخل المشروع، ستجد Pipeline لكل تخصص (معماري، إنشائي، MEP، دفاع مدني). كل تخصص له مراحله الخاصة ويمكنك تتبع التقدم بصرياً.",
    category: "design",
    helpful: 10,
  },
  {
    id: "4",
    question: "كيف أضيف عميل جديد؟",
    answer: "اضغط على 'إنشاء عميل' في الشريط الجانبي ثم 'عميل جديد'. املأ بيانات العميل الأساسية وحدد الغرض من التواصل (استشارة، تصميم، ترخيص، إشراف، فحص).",
    category: "clients",
    helpful: 8,
  },
  {
    id: "5",
    question: "كيف أسجل مقاول جديد؟",
    answer: "من 'المقاولون' في الشريط الجانبي، اضغط 'إضافة مقاول'. سجل كل بيانات المقاول: الاسم، الشركة، التصنيف، الترخيص، عدد العمال، التخصصات، وغيرها.",
    category: "contractors",
    helpful: 7,
  },
  {
    id: "6",
    question: "ما الفرق بين المساعد الذكي هنا وزر AI في المشروع؟",
    answer: "المساعد الذكي هنا يرى كل المشاريع ويمكنه عمل تقارير ومقارنات شاملة. زر AI داخل المشروع يركز على سياق ذلك المشروع فقط ويكون أسرع للاستخدام المباشر.",
    category: "general",
    helpful: 20,
  },
];

// ===== Knowledge Articles (Sample) =====
const knowledgeArticles: KnowledgeArticle[] = [
  {
    id: "1",
    title: "دليل إنشاء المشاريع الجديدة",
    content: "شرح مفصل لخطوات إنشاء مشروع جديد في النظام، من بيانات العميل الأساسية وحتى تعيين فريق العمل.",
    category: "projects",
    createdAt: "2025-01-15",
    updatedAt: "2025-03-01",
    author: "الإدارة",
  },
  {
    id: "2",
    title: "سياسات الترخيص البلدي في رأس الخيمة",
    content: "إجراءات ومتطلبات استخراج تراخيص البناء من بلدية رأس الخيمة، بما في ذلك المستندات المطلوبة والرسوم.",
    category: "municipality",
    createdAt: "2025-02-01",
    updatedAt: "2025-02-15",
    author: "قسم البلديات",
  },
  {
    id: "3",
    title: "معايير تقييم المقاولين",
    content: "المعايير المعتمدة لتقييم أداء المقاولين تشمل: جودة التنفيذ، الالتزام بالجدول الزمني، السلامة، والتعامل مع المخالفات.",
    category: "contractors",
    createdAt: "2025-01-20",
    updatedAt: "2025-01-20",
    author: "إدارة المشاريع",
  },
  {
    id: "4",
    title: "إجراءات فحص المباني",
    content: "خطوات فحص المباني الهيكلي والسلامة، أنواع الفحوصات المتاحة، وكيفية إعداد تقارير الفحص.",
    category: "supervision",
    createdAt: "2025-03-01",
    updatedAt: "2025-03-10",
    author: "قسم الإشراف",
  },
];

// ===== Category Helpers =====
const categoryConfig: Record<string, { ar: string; en: string; color: string; icon: React.ElementType }> = {
  projects: { ar: "المشاريع", en: "Projects", color: "bg-brand-navy-100 text-brand-navy-700 dark:bg-brand-navy-900/50 dark:text-brand-navy-300", icon: FolderOpen },
  contractors: { ar: "المقاولون", en: "Contractors", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300", icon: TrendingUp },
  DESIGN: { ar: "التصميم", en: "Design", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300", icon: Sparkles },
  clients: { ar: "العملاء", en: "Clients", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300", icon: User },
  municipality: { ar: "البلدية", en: "Municipality", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300", icon: Globe },
  supervision: { ar: "الإشراف", en: "Supervision", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300", icon: Shield },
  general: { ar: "عام", en: "General", color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300", icon: HelpCircle },
};

// ===== Main Component =====
interface AIAssistantHubProps { language: "ar" | "en"; }

export default function AIAssistantHub({ language }: AIAssistantHubProps) {
  const tAuto = useTranslations();
  const ar = language === "ar";

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: tAuto('auto.helloIMBluePrintSAIAssistantICanHelpYouA'),
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [kbSearch, setKbSearch] = useState("");
  const [faqFilter, setFaqFilter] = useState("all");
  const [hubConversationId] = useState(() => {
    if (typeof window === 'undefined') return 'hub-ssr';
    return `hub-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  });

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Quick suggestions
  const quickSuggestions = ar
    ? ["قارن عروض المقاولين", "ملخص مشروع", "متى تستحق فاتورة؟", "كيف أتابع التصميم؟"]
    : ["Compare contractor bids", "Project summary", "When is an invoice due?", "How to track design?"];

  // Handle send message
  const handleSend = async (text?: string) => {
    const message = text || inputValue.trim();
    if (!message) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: message,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setIsTyping(true);

    // Call real AI API with SSE streaming
    const aiMsgId = (Date.now() + 1).toString();
    setMessages((prev) => [...prev, { id: aiMsgId, role: "assistant", content: "", timestamp: new Date() }]);

    try {
      const result = await streamAIChat(
        {
          message,
          conversationId: hubConversationId,
          language: ar ? "ar" : "en",
        },
        (token: string) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === aiMsgId ? { ...m, content: m.content + token } : m
            )
          );
        }
      );
      // Final update with complete content
      setMessages((prev) =>
        prev.map((m) =>
          m.id === aiMsgId ? { ...m, content: result.content } : m
        )
      );
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === aiMsgId
            ? {
                ...m,
                content: tAuto('auto.sorryThereWasAnErrorConnectingToTheAIAss'),
              }
            : m
        )
      );
    } finally {
      setIsTyping(false);
    }
  };

  // Filter knowledge articles (AND logic: both search text and category must match when both are active)
  const filteredArticles = knowledgeArticles.filter((a) => {
    const matchesSearch = !kbSearch || a.title.includes(kbSearch) || a.content.includes(kbSearch);
    const matchesCategory = faqFilter === "all" || a.category === faqFilter;
    return matchesSearch && matchesCategory;
  });

  // Filter FAQs
  const filteredFaqs = faqs.filter(
    (f) =>
      (faqFilter === "all" || f.category === faqFilter) &&
      (f.question.includes(kbSearch) || f.answer.includes(kbSearch))
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-navy-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-brand-navy-500/20">
          <Sparkles className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            {tAuto('auto.smartHub')}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {tAuto('auto.aIAssistantKnowledgeBaseHelp')}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="chat" dir={ar ? "rtl" : "ltr"}>
        <TabsList className="grid w-full grid-cols-3 h-11 bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
          <TabsTrigger value="chat" className="gap-2 rounded-lg text-sm font-medium data-[state=active]:bg-white data-[state=active]:dark:bg-slate-900 data-[state=active]:shadow-sm">
            <Bot className="h-4 w-4 text-brand-navy-500" />
            {tAuto('auto.aIChat')}
          </TabsTrigger>
          <TabsTrigger value="knowledge" className="gap-2 rounded-lg text-sm font-medium data-[state=active]:bg-white data-[state=active]:dark:bg-slate-900 data-[state=active]:shadow-sm">
            <BookMarked className="h-4 w-4 text-purple-500" />
            {tAuto('auto.knowledge')}
          </TabsTrigger>
          <TabsTrigger value="help" className="gap-2 rounded-lg text-sm font-medium data-[state=active]:bg-white data-[state=active]:dark:bg-slate-900 data-[state=active]:shadow-sm">
            <HelpCircle className="h-4 w-4 text-amber-500" />
            {tAuto('auto.help')}
          </TabsTrigger>
        </TabsList>

        {/* ===== AI Chat Tab ===== */}
        <TabsContent value="chat" className="mt-4">
          <div className="rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 overflow-hidden shadow-sm flex flex-col" style={{ height: "calc(100vh - 280px)", minHeight: "500px" }}>
            {/* Chat Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4 max-w-3xl mx-auto">
                {messages.map((msg) => (
                  <div key={msg.id} className={cn("flex gap-3", msg.role === "user" ? "flex-row-reverse" : "")}>
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                      msg.role === "assistant"
                        ? "bg-gradient-to-br from-brand-navy-500 to-cyan-500"
                        : "bg-slate-200 dark:bg-slate-700"
                    )}>
                      {msg.role === "assistant" ? (
                        <Sparkles className="h-4 w-4 text-white" />
                      ) : (
                        <User className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                      )}
                    </div>
                    <div className={cn(
                      "max-w-[75%] rounded-2xl px-4 py-3",
                      msg.role === "assistant"
                        ? "bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700"
                        : "bg-brand-navy-600 text-white"
                    )}>
                      {msg.content ? (
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                      ) : isTyping && msg.role === "assistant" ? (
                      <span className="inline-block w-1.5 h-4 bg-brand-navy-500 animate-pulse rounded-sm align-text-bottom" />
                      ) : null}
                      <p className={cn(
                        "text-[10px] mt-1.5",
                        msg.role === "assistant" ? "text-slate-400" : "text-brand-navy-200"
                      )}>
                        {msg.timestamp.toLocaleTimeString(ar ? "ar-AE" : "en-US", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                ))}
                {isTyping && (() => {
                  const lastMsg = messages[messages.length - 1];
                  if (lastMsg && lastMsg.role === "assistant" && lastMsg.content.length > 0) return null;
                  return (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-navy-500 to-cyan-500 flex items-center justify-center shrink-0">
                      <Sparkles className="h-4 w-4 text-white" />
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl px-4 py-3 border border-slate-100 dark:border-slate-700">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                        <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                        <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>
                  </div>
                  );
                })()}
                <div ref={chatEndRef} />
              </div>
            </ScrollArea>

            {/* Quick Suggestions */}
            {messages.length <= 1 && (
              <div className="px-4 pb-3">
                <div className="flex flex-wrap gap-2 max-w-3xl mx-auto">
                  {quickSuggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => handleSend(suggestion)}
                      className="text-xs px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-brand-navy-50 hover:text-brand-navy-700 hover:border-brand-navy-200 dark:hover:bg-brand-navy-950 dark:hover:text-brand-navy-400 dark:hover:border-brand-navy-800 transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input Area */}
            <div className="p-3 border-t border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center gap-2 max-w-3xl mx-auto">
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                  placeholder={tAuto('auto.typeYourQuestionHere')}
                  className="flex-1 h-10 rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
                <Button
                  onClick={() => handleSend()}
                  disabled={!inputValue.trim() || isTyping}
                  className="h-10 w-10 rounded-xl bg-brand-navy-600 hover:bg-brand-navy-700 text-white p-0 shrink-0"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ===== Knowledge Base Tab ===== */}
        <TabsContent value="knowledge" className="mt-4">
          <div className="space-y-4">
            {/* Search & Filter */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  value={kbSearch}
                  onChange={(e) => setKbSearch(e.target.value)}
                  placeholder={tAuto('auto.searchKnowledgeBase')}
                  className="ps-9 h-9 rounded-lg"
                />
              </div>
              <Select value={faqFilter} onValueChange={setFaqFilter}>
                <SelectTrigger className="w-[160px] h-9 rounded-lg">
                  <SelectValue placeholder={tAuto('auto.category')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{tAuto('auto.all')}</SelectItem>
                  <SelectItem value="projects">{tAuto('auto.projects')}</SelectItem>
                  <SelectItem value="contractors">{tAuto('auto.contractors')}</SelectItem>
                  <SelectItem value="design">{tAuto('auto.design')}</SelectItem>
                  <SelectItem value="municipality">{tAuto('auto.municipality')}</SelectItem>
                  <SelectItem value="supervision">{tAuto('auto.supervision')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              <Card className="py-0 gap-0 border-0 shadow-sm overflow-hidden">
                <div className="bg-gradient-to-br from-purple-500 to-violet-500 p-3">
                  <div className="flex items-center gap-2">
                    <BookMarked className="h-4 w-4 text-white/80" />
                    <span className="text-xs text-purple-100">{tAuto('auto.articles')}</span>
                  </div>
                  <div className="text-lg font-bold text-white mt-1">{knowledgeArticles.length}</div>
                </div>
              </Card>
              <Card className="py-0 gap-0 border-0 shadow-sm overflow-hidden">
                <div className="bg-gradient-to-br from-brand-navy-500 to-cyan-500 p-3">
                  <div className="flex items-center gap-2">
                    <FolderOpen className="h-4 w-4 text-white/80" />
                    <span className="text-xs text-brand-navy-100">{tAuto('auto.categories')}</span>
                  </div>
                  <div className="text-lg font-bold text-white mt-1">{Object.keys(categoryConfig).length}</div>
                </div>
              </Card>
              <Card className="py-0 gap-0 border-0 shadow-sm overflow-hidden">
                <div className="bg-gradient-to-br from-amber-500 to-orange-500 p-3">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-white/80" />
                    <span className="text-xs text-amber-100">{tAuto('auto.mostRead')}</span>
                  </div>
                  <div className="text-lg font-bold text-white mt-1">
                    {knowledgeArticles.reduce((max, a) => (a.id > max.id ? a : max), knowledgeArticles[0])?.title.substring(0, 15)}...
                  </div>
                </div>
              </Card>
            </div>

            {/* Articles List */}
            <div className="space-y-3">
              {(kbSearch || faqFilter !== "all" ? filteredArticles : knowledgeArticles).map((article) => {
                const cat = categoryConfig[article.category] || categoryConfig.general;
                const CatIcon = cat.icon;
                return (
                  <Card key={article.id} className="border-slate-200 dark:border-slate-700/50 hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", cat.color)}>
                          <CatIcon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{article.title}</h3>
                            <Badge className={cn("text-[9px] shrink-0", cat.color)}>{ar ? cat.ar : cat.en}</Badge>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{article.content}</p>
                          <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-400">
                            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{article.updatedAt}</span>
                            <span className="flex items-center gap-1"><User className="h-3 w-3" />{article.author}</span>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-slate-400 shrink-0 mt-1" />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </TabsContent>

        {/* ===== Help & FAQ Tab ===== */}
        <TabsContent value="help" className="mt-4">
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                value={kbSearch}
                onChange={(e) => setKbSearch(e.target.value)}
                placeholder={tAuto('auto.searchFAQs')}
                className="ps-9 h-9 rounded-lg"
              />
            </div>

            {/* Category Filter */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFaqFilter("all")}
                className={cn(
                  "text-xs px-3 py-1.5 rounded-full transition-colors",
                  faqFilter === "all" ? "bg-brand-navy-600 text-white" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                )}
              >
                {tAuto('auto.all')}
              </button>
              {Object.entries(categoryConfig).map(([key, cat]) => (
                <button
                  key={key}
                  onClick={() => setFaqFilter(key)}
                  className={cn(
                    "text-xs px-3 py-1.5 rounded-full transition-colors",
                    faqFilter === key ? "bg-brand-navy-600 text-white" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                  )}
                >
                  {ar ? cat.ar : cat.en}
                </button>
              ))}
            </div>

            {/* FAQ Items */}
            <div className="space-y-2">
              {filteredFaqs.map((faq) => {
                const cat = categoryConfig[faq.category] || categoryConfig.general;
                return (
                  <Card key={faq.id} className="border-slate-200 dark:border-slate-700/50 overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0 mt-0.5">
                          <HelpCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{faq.question}</h3>
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{faq.answer}</p>
                          <div className="flex items-center gap-3 mt-2">
                            <Badge className={cn("text-[9px]", cat.color)}>{ar ? cat.ar : cat.en}</Badge>
                            <span className="text-[10px] text-slate-400 flex items-center gap-1">
                              <Star className="h-3 w-3" />{faq.helpful} {tAuto('auto.helpful')}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Contact Support */}
            <Card className="border-brand-navy-200 dark:border-brand-navy-800/50 bg-gradient-to-br from-brand-navy-50 to-cyan-50 dark:from-brand-navy-950/30 dark:to-cyan-950/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-navy-100 dark:bg-brand-navy-900/50 flex items-center justify-center">
                    <MessageSquare className="h-5 w-5 text-brand-navy-600 dark:text-brand-navy-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{tAuto('auto.needMoreHelp')}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{tAuto('auto.contactOurTechnicalSupportTeam')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
