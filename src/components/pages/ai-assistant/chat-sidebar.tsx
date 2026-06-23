"use client";


import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Plus, PanelLeftClose, History, Clock, MessageSquare, Trash2 } from "lucide-react";
import { ConversationMeta } from "./types";

interface ChatSidebarProps {
  isAr: boolean;
  sidebarOpen: boolean;
  conversations: ConversationMeta[];
  conversationId: string;
  startNewChat: () => void;
  setSidebarOpen: (open: boolean) => void;
  loadConversation: (conv: ConversationMeta) => void;
  deleteConversation: (e: React.MouseEvent, convId: string) => void;
  formatRelativeTime: (timestamp: string) => string;
}

export function ChatSidebar({
  isAr,
  sidebarOpen,
  conversations,
  conversationId,
  startNewChat,
  setSidebarOpen,
  loadConversation,
  deleteConversation,
  formatRelativeTime,
}: ChatSidebarProps) {
  const tAuto = useTranslations();
  return (
    <AnimatePresence>
      {sidebarOpen && (
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 280, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
          className="shrink-0 overflow-hidden"
        >
          <Card className="h-full flex flex-col p-0 overflow-hidden">
            {/* Sidebar Header */}
            <div className="p-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-teal-500" />
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  {tAuto('auto.chatHistory')}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-slate-400 hover:text-teal-600"
                      onClick={startNewChat}
                      aria-label="New chat"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    {tAuto('auto.newChat')}
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-slate-400 hover:text-slate-600"
                      onClick={() => setSidebarOpen(false)}
                      aria-label="Close sidebar"
                    >
                      <PanelLeftClose className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    {tAuto('auto.close')}
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>

            {/* Conversation List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {conversations.length === 0 ? (
                <div className="p-4 text-center">
                  <MessageSquare className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    {tAuto('auto.noPreviousConversations')}
                  </p>
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {conversations.map((conv) => (
                    <div
                      key={conv.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => loadConversation(conv)}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); loadConversation(conv); } }}
                      className={cn(
                        "w-full group flex items-start gap-2.5 p-2.5 rounded-lg text-start transition-all hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer",
                        conv.id === conversationId &&
                          "bg-teal-50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-800/50"
                      )}
                    >
                      <div className="mt-0.5 shrink-0">
                        <MessageSquare className="h-3.5 w-3.5 text-slate-400 group-hover:text-teal-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">
                          {conv.title}
                        </p>
                        <div className="flex items-center gap-1 mt-1">
                          <Clock className="h-2.5 w-2.5 text-slate-400" />
                          <span className="text-[10px] text-slate-400">
                            {formatRelativeTime(conv.timestamp)}
                          </span>
                          <span className="text-[10px] text-slate-300 dark:text-slate-600 mx-0.5">•</span>
                          <span className="text-[10px] text-slate-400">
                            {conv.messages.length} {tAuto('auto.msgs')}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={(e) => deleteConversation(e, conv.id)}
                        className="opacity-0 group-hover:opacity-100 shrink-0 p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 transition-all"
                        title={tAuto('auto.delete')}
                      >
                        <Trash2 className="h-3 w-3 text-slate-400 hover:text-red-500" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Sidebar Footer */}
            <div className="p-2 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={startNewChat}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/30 hover:bg-teal-100 dark:hover:bg-teal-950/50 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                {tAuto('auto.newChat')}
              </button>
            </div>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
