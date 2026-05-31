"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Bot, User, Sparkles, Copy, Check, AlertCircle, RefreshCw, Zap, Volume2, StopCircle, Lightbulb } from "lucide-react";
import { Message } from "./types";
import { MarkdownRenderer } from "./markdown-renderer";
import { quickSuggestions } from "./constants";

interface ChatMessagesProps {
  isAr: boolean;
  messages: Message[];
  isLoading: boolean;
  copiedMsgId: string | null;
  speakingMsgId: string | null;
  ttsSupported: boolean;
  suggestedReplies: string[];
  initialSuggestions: typeof quickSuggestions;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  handleSend: (text?: string) => void;
  handleCopyMessage: (msg: Message) => void;
  handleRetry: () => void;
  handleSpeak: (msg: Message) => void;
}

export function ChatMessages({
  isAr,
  messages,
  isLoading,
  copiedMsgId,
  speakingMsgId,
  ttsSupported,
  suggestedReplies,
  initialSuggestions,
  messagesEndRef,
  handleSend,
  handleCopyMessage,
  handleRetry,
  handleSpeak,
}: ChatMessagesProps) {
  return (
    <Card className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar" style={{ scrollbarGutter: "stable" }}>
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center px-4">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-950 dark:to-cyan-950 flex items-center justify-center mb-5 shadow-lg shadow-teal-500/5">
              <Sparkles className="h-10 w-10 text-teal-500" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
              {isAr ? "مرحباً بك في مساعد بلوبرنت الذكي 👋" : "Welcome to BluePrint AI Assistant 👋"}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 max-w-md leading-relaxed">
              {isAr
                ? "يمكنني مساعدتك في إدارة المشاريع، متابعة المهام، مراجعة الفواتير، وتحليل البيانات. اطرح سؤالاً أو اختر من الاقتراحات أدناه للبدء."
                : "I can help you manage projects, track tasks, review invoices, and analyze data. Ask a question or choose from the suggestions below to get started."}
            </p>

            {/* Initial Quick Suggestions - Enhanced Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg w-full">
              {initialSuggestions.map((suggestion) => (
                <button
                  key={suggestion.ar}
                  onClick={() => handleSend(isAr ? suggestion.arMsg : suggestion.enMsg)}
                  className="group relative flex items-center gap-3 px-4 py-3.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-teal-400 dark:hover:border-teal-600 bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-800/50 hover:from-teal-50/80 hover:to-cyan-50/80 dark:hover:from-teal-950/30 dark:hover:to-cyan-950/30 transition-all text-sm text-start hover:shadow-lg hover:shadow-teal-500/5 hover:scale-[1.02] active:scale-[0.98]"
                >
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-100 to-cyan-100 dark:from-teal-900/50 dark:to-cyan-900/50 flex items-center justify-center shrink-0 group-hover:from-teal-200 group-hover:to-cyan-200 dark:group-hover:from-teal-800 dark:group-hover:to-cyan-800 transition-colors shadow-sm">
                    <suggestion.icon className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                  </div>
                  <span className="text-slate-700 dark:text-slate-300 font-medium">
                    {isAr ? suggestion.ar : suggestion.en}
                  </span>
                  <div className="absolute inset-0 rounded-xl border-2 border-transparent group-hover:border-teal-400/30 dark:group-hover:border-teal-600/30 transition-colors pointer-events-none" />
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4 max-w-3xl mx-auto">
            <AnimatePresence initial={false}>
              {messages.map((msg, idx) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className={cn("flex gap-3 group", msg.role === "user" ? "flex-row-reverse" : "")}
                >
                  {/* Avatar */}
                  <Avatar className="h-9 w-9 shrink-0 mt-0.5">
                    <AvatarFallback
                      className={
                        msg.role === "user"
                          ? "bg-gradient-to-br from-teal-500 to-cyan-600 text-white text-xs shadow-sm shadow-teal-500/20"
                          : "bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 text-slate-700 dark:text-slate-300 text-xs"
                      }
                    >
                      {msg.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                    </AvatarFallback>
                  </Avatar>

                  {/* Message Bubble */}
                  <div className={cn("max-w-[80%] relative", msg.role === "user" ? "text-end" : "text-start")}>
                    {msg.role === "user" ? (
                      <div className="inline-block rounded-2xl rounded-tr-sm bg-gradient-to-br from-teal-500 to-teal-600 text-white px-4 py-3 shadow-md shadow-teal-500/15">
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                        <div className="flex items-center justify-end gap-2 mt-1.5">
                          <span className="text-[10px] text-teal-200">
                            {msg.timestamp.toLocaleTimeString(isAr ? "ar-AE" : "en-US", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          <button
                            onClick={() => handleCopyMessage(msg)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-white/10"
                            title={isAr ? "نسخ" : "Copy"}
                          >
                            {copiedMsgId === msg.id ? (
                              <Check className="h-3 w-3 text-teal-200" />
                            ) : (
                              <Copy className="h-3 w-3 text-teal-200" />
                            )}
                          </button>
                        </div>
                      </div>
                    ) : msg.isError ? (
                      /* Error Message with Retry */
                      <div className="inline-block text-start">
                        <div className="rounded-2xl rounded-tl-sm bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-200 px-4 py-3 border border-red-200 dark:border-red-800/50">
                          <div className="flex items-start gap-2">
                            <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                            <div className="text-sm leading-relaxed">{msg.content}</div>
                          </div>
                          <div className="flex items-center justify-between mt-2.5 pt-1.5 border-t border-red-200/50 dark:border-red-800/50">
                            <span className="text-[10px] text-red-400 dark:text-red-500">
                              {msg.timestamp.toLocaleTimeString(isAr ? "ar-AE" : "en-US", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                            <button
                              onClick={handleRetry}
                              disabled={isLoading}
                              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/60 transition-colors disabled:opacity-50 disabled:pointer-events-none"
                            >
                              <RefreshCw className={cn("h-3 w-3", isLoading && "animate-spin")} />
                              {isAr ? "إعادة المحاولة" : "Retry"}
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="inline-block text-start">
                        <div className="rounded-2xl rounded-tl-sm bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-4 py-3 border-s-2 border-s-0 border-s-teal-500 dark:border-s-teal-600">
                          <div className="text-sm leading-relaxed">
                            {msg.content ? (
                              <MarkdownRenderer content={msg.content} />
                            ) : null}
                            {/* Streaming cursor: show when message is still being streamed (empty or loading) */}
                            {isLoading && msg.content.length === 0 && (
                              <span className="inline-block w-1.5 h-4 bg-teal-500 animate-pulse rounded-sm ml-0.5 align-text-bottom" />
                            )}
                          </div>
                          {/* Only show action bar when content is present (not during initial streaming) */}
                          {msg.content.length > 0 && (
                          <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-200/50 dark:border-slate-700/50">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-slate-400 dark:text-slate-500">
                                {msg.timestamp.toLocaleTimeString(isAr ? "ar-AE" : "en-US", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                              {msg.tokensUsed && (
                                <span className="text-[10px] text-violet-400 dark:text-violet-500 flex items-center gap-0.5">
                                  <Zap className="h-2.5 w-2.5" />
                                  {msg.tokensUsed}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-0.5">
                              {/* TTS Button for AI messages */}
                              {ttsSupported && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      onClick={() => handleSpeak(msg)}
                                      className={cn(
                                        "opacity-0 group-hover:opacity-100 transition-all p-0.5 rounded hover:bg-slate-200/50 dark:hover:bg-slate-700/50",
                                        speakingMsgId === msg.id && "opacity-100"
                                      )}
                                    >
                                      {speakingMsgId === msg.id ? (
                                        <StopCircle className="h-3 w-3 text-red-500 animate-pulse" />
                                      ) : (
                                        <Volume2 className="h-3 w-3 text-slate-400" />
                                      )}
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="text-xs">
                                    {speakingMsgId === msg.id
                                      ? isAr
                                        ? "إيقاف القراءة"
                                        : "Stop reading"
                                      : isAr
                                        ? "قراءة بصوت عالٍ"
                                        : "Read aloud"}
                                  </TooltipContent>
                                </Tooltip>
                              )}
                              {/* Copy button */}
                              <button
                                onClick={() => handleCopyMessage(msg)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-slate-200/50 dark:hover:bg-slate-700/50"
                                title={isAr ? "نسخ" : "Copy"}
                              >
                                {copiedMsgId === msg.id ? (
                                  <Check className="h-3 w-3 text-emerald-500" />
                                ) : (
                                  <Copy className="h-3 w-3 text-slate-400" />
                                )}
                              </button>
                            </div>
                          </div>
                        )}
                        </div>

                        {/* Suggested Replies - show after last AI message */}
                        {idx === messages.length - 1 && suggestedReplies.length > 0 && !isLoading && (
                          <motion.div
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: 0.3 }}
                            className="flex flex-wrap gap-1.5 mt-2"
                          >
                            {suggestedReplies.map((reply) => (
                              <button
                                key={reply}
                                onClick={() => handleSend(reply)}
                                className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border border-teal-200 dark:border-teal-800/50 text-teal-700 dark:text-teal-400 bg-teal-50/50 dark:bg-teal-950/20 hover:bg-teal-100 dark:hover:bg-teal-950/40 hover:border-teal-300 dark:hover:border-teal-700 transition-all"
                              >
                                <Lightbulb className="h-2.5 w-2.5" />
                                {reply}
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Typing Indicator - Enhanced */}
            {/* Show typing dots while loading AND the last AI message has no content yet (tokens haven't started arriving) */}
            {isLoading && (() => {
              const lastMsg = messages[messages.length - 1];
              // If the last message is an assistant message that already has streaming content, hide the dots
              if (lastMsg && lastMsg.role === "assistant" && lastMsg.content.length > 0) return null;
              return (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-3"
              >
                <Avatar className="h-9 w-9 shrink-0 mt-0.5">
                  <AvatarFallback className="bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 text-slate-500 text-xs">
                    <Bot className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="rounded-2xl rounded-tl-sm bg-slate-100 dark:bg-slate-800 border-s-2 border-s-0 border-s-teal-500 dark:border-s-teal-600 px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <span
                        className="w-2 h-2 rounded-full bg-teal-500 animate-bounce"
                        style={{ animationDelay: "0ms" }}
                      />
                      <span
                        className="w-2 h-2 rounded-full bg-teal-500 animate-bounce"
                        style={{ animationDelay: "150ms" }}
                      />
                      <span
                        className="w-2 h-2 rounded-full bg-teal-500 animate-bounce"
                        style={{ animationDelay: "300ms" }}
                      />
                    </div>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {isAr ? "جاري التفكير..." : "Thinking..."}
                    </span>
                  </div>
                </div>
              </motion.div>
              );
            })()}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
    </Card>
  );
}
