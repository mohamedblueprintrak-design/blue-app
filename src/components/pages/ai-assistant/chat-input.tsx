"use client";


import { useTranslations } from 'next-intl';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Send, Loader2, Mic, MicOff, MessageSquare, Zap, Sparkles } from "lucide-react";
import { quickSuggestions } from "./constants";

interface ChatInputProps {
  isAr: boolean;
  input: string;
  setInput: (value: string) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  handleKeyDown: (e: React.KeyboardEvent) => void;
  isLoading: boolean;
  isListening: boolean;
  isSupported: boolean;
  messagesLength: number;
  totalTokens: number;
  handleMicClick: () => void;
  handleSend: (text?: string) => void;
}

export function ChatInput({
  isAr,
  input,
  setInput,
  inputRef,
  handleKeyDown,
  isLoading,
  isListening,
  isSupported,
  messagesLength,
  totalTokens,
  handleMicClick,
  handleSend,
}: ChatInputProps) {
  const tAuto = useTranslations();
  return (
    <div className="border-t border-slate-200 dark:border-slate-700 p-3">
      {/* Compact suggestion chips */}
      {messagesLength > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2.5">
          {quickSuggestions.map((s) => (
            <button
              key={s.ar}
              onClick={() => handleSend(isAr ? s.arMsg : s.enMsg)}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs border border-slate-200 dark:border-slate-700 hover:border-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/30 transition-all text-slate-600 dark:text-slate-400 disabled:opacity-50 disabled:pointer-events-none hover:shadow-sm"
            >
              <s.icon className="h-3 w-3" />
              {isAr ? s.ar : s.en}
            </button>
          ))}
        </div>
      )}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={tAuto('auto.typeYourMessageHere')}
            disabled={isLoading}
            className={cn(
              "flex-1 h-11 rounded-xl bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 ps-4 text-sm",
              isListening
                ? "pe-4 border-red-400 dark:border-red-500 ring-2 ring-red-400/20 dark:ring-red-500/20"
                : "pe-24"
            )}
          />
          {/* Listening indicator overlay */}
          {isListening && (
            <div className="absolute end-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
              </span>
              <span className="text-xs text-red-500 font-medium animate-pulse">
                {tAuto('auto.listening')}
              </span>
            </div>
          )}
          {/* Message Count & Token Usage Indicator */}
          {messagesLength > 0 && !isListening && (
            <div className="absolute end-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700/50">
                <MessageSquare className="h-3 w-3 text-slate-400" />
                <span className="text-[10px] text-slate-400 tabular-nums font-medium">{messagesLength}</span>
              </div>
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700/50">
                <Zap className="h-3 w-3 text-violet-400" />
                <span className="text-[10px] text-slate-400 tabular-nums font-medium">
                  {totalTokens > 1000 ? `${(totalTokens / 1000).toFixed(1)}k` : totalTokens}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Mic Button */}
        {isSupported ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={handleMicClick}
                variant={isListening ? "default" : "outline"}
                size="icon"
                className={cn(
                  "h-11 w-11 rounded-xl shrink-0 transition-all",
                  isListening
                    ? "bg-red-500 hover:bg-red-600 text-white shadow-md shadow-red-500/25 animate-pulse"
                    : "border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:border-teal-400 dark:hover:border-teal-600"
                )}
                aria-label={isListening ? "Stop recording" : "Voice input"}
              >
                {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              {isListening
                ? tAuto('auto.stopRecording')
                : tAuto('auto.voiceInput')}
            </TooltipContent>
          </Tooltip>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="h-11 w-11 rounded-xl shrink-0 border-slate-200 dark:border-slate-700 text-slate-400 cursor-not-allowed opacity-50"
                disabled
                aria-label="Voice input not supported"
              >
                <MicOff className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              {tAuto('auto.voiceInputNotSupportedInThisBrowser')}
            </TooltipContent>
          </Tooltip>
        )}

        {/* Send Button */}
        <Button
          onClick={() => handleSend()}
          disabled={!input.trim() || isLoading}
          className="h-11 w-11 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white p-0 shrink-0 shadow-md shadow-teal-500/20 transition-all disabled:opacity-50 disabled:shadow-none"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
      <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2 text-center flex items-center justify-center gap-1.5">
        <Sparkles className="h-3 w-3" />
        {tAuto('auto.bluePrintAIUsesArtificialIntelligenceFor')}
      </p>
    </div>
  );
}
