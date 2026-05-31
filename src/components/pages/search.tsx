"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useNavStore } from "@/store/nav-store";
import {
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FolderKanban,
  List,
  Users,
  Receipt,
  FileText,
  ArrowRight,
  ArrowLeft,
  Clock,
  X,
  Sparkles,
  Search,
} from "lucide-react";

interface Props {
  language: "ar" | "en";
  projectId?: string;
}

interface SearchResult {
  type: string;
  id: string;
  title: string;
  subtitle: string;
  status: string;
  data?: Record<string, unknown>;
}

interface GroupedResults {
  project?: SearchResult[];
  task?: SearchResult[];
  client?: SearchResult[];
  invoice?: SearchResult[];
  document?: SearchResult[];
  [key: string]: SearchResult[] | undefined;
}

const typeConfig: Record<
  string,
  {
    icon: typeof FolderKanban;
    color: string;
    bgHover: string;
    ar: string;
    en: string;
    order: number;
  }
> = {
  project: {
    icon: FolderKanban,
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300",
    bgHover: "hover:bg-blue-50 dark:hover:bg-blue-950/30",
    ar: "المشاريع",
    en: "Projects",
    order: 1,
  },
  task: {
    icon: List,
    color: "bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300",
    bgHover: "hover:bg-amber-50 dark:hover:bg-amber-950/30",
    ar: "المهام",
    en: "Tasks",
    order: 2,
  },
  client: {
    icon: Users,
    color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300",
    bgHover: "hover:bg-emerald-50 dark:hover:bg-emerald-950/30",
    ar: "العملاء",
    en: "Clients",
    order: 3,
  },
  invoice: {
    icon: Receipt,
    color: "bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300",
    bgHover: "hover:bg-rose-50 dark:hover:bg-rose-950/30",
    ar: "الفواتير",
    en: "Invoices",
    order: 4,
  },
  document: {
    icon: FileText,
    color: "bg-violet-100 text-violet-700 dark:bg-violet-900/60 dark:text-violet-300",
    bgHover: "hover:bg-violet-50 dark:hover:bg-violet-950/30",
    ar: "المستندات",
    en: "Documents",
    order: 5,
  },
};

const statusColors: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400",
  COMPLETED: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  DELAYED: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400",
  ON_HOLD: "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-400",
  CANCELLED: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400",
  TODO: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  IN_PROGRESS: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400",
  REVIEW: "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-400",
  DONE: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400",
  DRAFT: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  SENT: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400",
  PAID: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400",
  OVERDUE: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400",
  PARTIALLY_PAID: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400",
  PENDING: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-400",
  OPEN: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400",
  AVAILABLE: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400",
};

const RECENT_SEARCHES_KEY = "blueprint-recent-searches";

function getRecentSearches(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function addRecentSearch(term: string) {
  if (!term || term.trim().length < 2) return;
  try {
    const recent = getRecentSearches().filter(
      (s) => s.toLowerCase() !== term.toLowerCase()
    );
    recent.unshift(term.trim());
    localStorage.setItem(
      RECENT_SEARCHES_KEY,
      JSON.stringify(recent.slice(0, 5))
    );
  } catch {
    // ignore
  }
}

function clearRecentSearches() {
  try {
    localStorage.removeItem(RECENT_SEARCHES_KEY);
  } catch {
    // ignore
  }
}

export default function GlobalSearch({ language: lang, projectId }: Props) {
  const isAr = lang === "ar";
  const { setCurrentPage, setCurrentProjectId } = useNavStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isOpen, setIsOpen] = useState(true);
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    return getRecentSearches();
  });

  // Auto-focus input when opened
  useEffect(() => {
    if (isOpen) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 250);
    return () => clearTimeout(timer);
  }, [query]);

  // Fetch search results
  const { data, isLoading } = useQuery<{
    results: GroupedResults;
    total: number;
  }>({
    queryKey: ["global-search", projectId, debouncedQuery],
    queryFn: () => {
      const params = new URLSearchParams();
      params.set("q", debouncedQuery);
      if (projectId) params.set("projectId", projectId);
      return fetch(`/api/search?${params.toString()}`).then((r) =>
        r.json()
      );
    },
    enabled: debouncedQuery.length >= 2,
  });

  const results = data?.results || {};
  const totalResults = data?.total || 0;

  // Sort type groups by order
  const sortedGroups = Object.entries(results)
    .filter(([, items]) => items && items.length > 0)
    .sort(([a], [b]) => (typeConfig[a]?.order || 99) - (typeConfig[b]?.order || 99));

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setCurrentPage("dashboard");
  }, [setCurrentPage]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === backdropRef.current) {
        handleClose();
      }
    },
    [handleClose]
  );

  const handleSelect = useCallback(
    (result: SearchResult) => {
      // Save to recent searches
      addRecentSearch(query);

      switch (result.type) {
        case "project":
          setCurrentProjectId(result.id);
          setCurrentPage("projects");
          break;
        case "task":
          if (result.data?.projectId) {
            setCurrentProjectId(result.data.projectId as string);
          }
          setCurrentPage("tasks");
          break;
        case "client":
          setCurrentPage("clients");
          break;
        case "invoice":
          setCurrentPage("financial-invoices");
          break;
        case "document":
          setCurrentPage("documents");
          break;
      }
    },
    [query, setCurrentProjectId, setCurrentPage]
  );

  const handleRecentClick = useCallback((term: string) => {
    setQuery(term);
  }, []);

  const handleClearRecent = useCallback(() => {
    clearRecentSearches();
    setRecentSearches([]);
  }, []);

  // Keyboard: Escape closes the palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        e.preventDefault();
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleClose]);

  const hasQuery = query.length >= 2;
  const showRecentIdle = !hasQuery && recentSearches.length > 0;
  const showRecentWithResults = hasQuery && !isLoading && recentSearches.length > 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={backdropRef}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] sm:pt-[15vh]"
          onClick={handleBackdropClick}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

          {/* Command Palette */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-50 w-[calc(100%-2rem)] max-w-2xl mx-4 rounded-2xl border border-white/20 dark:border-slate-700/30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-2xl shadow-black/20 overflow-hidden"
          >
            {/* Search Input */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-800">
              <Search className="h-5 w-5 text-slate-400 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={
                  isAr
                    ? "ابحث عن المشاريع، المهام، العملاء، الفواتير..."
                    : "Search projects, tasks, clients, invoices..."
                }
                className="flex-1 bg-transparent text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none py-1"
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="shrink-0 w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  <X className="h-3 w-3 text-slate-500" />
                </button>
              )}
              <kbd className="hidden sm:flex shrink-0 items-center gap-0.5 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                <span className="text-[10px] font-medium text-slate-400">
                  ESC
                </span>
              </kbd>
            </div>

            {/* Results Area */}
            <div className="max-h-[50vh] overflow-y-auto">
              {/* Loading State */}
              {hasQuery && isLoading && (
                <div className="p-4 space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex items-center gap-3 p-2">
                      <Skeleton className="h-9 w-9 rounded-lg" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Empty State - No Results */}
              {hasQuery && !isLoading && totalResults === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center px-6">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
                    <Sparkles className="h-6 w-6 text-slate-400 dark:text-slate-500" />
                  </div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    {isAr
                      ? `لا توجد نتائج لـ "${query}"`
                      : `No results found for "${query}"`}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                    {isAr
                      ? "حاول البحث بكلمات مختلفة"
                      : "Try different keywords"}
                  </p>
                </div>
              )}

              {/* Search Results */}
              {hasQuery && !isLoading && totalResults > 0 && (
                <div>
                  {/* Results count */}
                  <div className="flex items-center justify-between px-4 py-2 border-b border-slate-50 dark:border-slate-800/50">
                    <span className="text-xs text-slate-400">
                      {isAr
                        ? `${totalResults} نتيجة`
                        : `${totalResults} results`}
                    </span>
                  </div>

                  {sortedGroups.map(([type, items], groupIdx) => {
                    const config = typeConfig[type];
                    if (!config || !items) return null;
                    const Icon = config.icon;

                    return (
                      <div key={type}>
                        {groupIdx > 0 && <CommandSeparator />}
                        <CommandGroup
                          heading={
                            <div className="flex items-center gap-2">
                              <Icon className="h-3.5 w-3.5" />
                              <span>
                                {isAr ? config.ar : config.en}
                              </span>
                              <Badge
                                variant="secondary"
                                className="text-[10px] h-4 px-1.5"
                              >
                                {items.length}
                              </Badge>
                            </div>
                          }
                        >
                          {items.map((item) => (
                            <CommandItem
                              key={item.id}
                              onSelect={() => handleSelect(item)}
                              className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer ${config.bgHover}`}
                            >
                              <div
                                className={`w-9 h-9 rounded-lg ${config.color} flex items-center justify-center shrink-0`}
                              >
                                <Icon className="h-4 w-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                                  {item.title}
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                  {item.subtitle}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {item.status && statusColors[item.status] && (
                                  <Badge
                                    className={`text-[10px] h-5 px-1.5 border-0 font-medium ${statusColors[item.status]}`}
                                  >
                                    {item.status}
                                  </Badge>
                                )}
                                {isAr ? (
                                  <ArrowLeft className="h-3.5 w-3.5 text-slate-300 dark:text-slate-600" />
                                ) : (
                                  <ArrowRight className="h-3.5 w-3.5 text-slate-300 dark:text-slate-600" />
                                )}
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Recent Searches - shown when idle */}
              {showRecentIdle && (
                <div className="p-2">
                  <div className="flex items-center justify-between px-2 py-2">
                    <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                      <Clock className="h-3.5 w-3.5" />
                      <span>
                        {isAr ? "عمليات البحث الأخيرة" : "Recent Searches"}
                      </span>
                    </div>
                    <button
                      onClick={handleClearRecent}
                      className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                    >
                      {isAr ? "مسح الكل" : "Clear All"}
                    </button>
                  </div>
                  <div className="space-y-0.5">
                    {recentSearches.map((term, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleRecentClick(term)}
                        className="flex items-center gap-3 w-full px-2 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-start group"
                      >
                        <Clock className="h-3.5 w-3.5 text-slate-300 dark:text-slate-600" />
                        <span className="text-sm text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                          {term}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Searches - shown alongside search results */}
              {showRecentWithResults && (
                <div className="px-4 pt-2 pb-1 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {isAr ? "عمليات البحث الأخيرة" : "Recent Searches"}
                    </span>
                    <button
                      onClick={handleClearRecent}
                      className="text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                    >
                      {isAr ? "مسح السجل" : "Clear History"}
                    </button>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    {recentSearches.slice(0, 5).map((term, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleRecentClick(term)}
                        className="inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 px-2 py-1 rounded-full bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Default Quick Categories */}
              {!hasQuery && !showRecentIdle && (
                <div className="p-4">
                  <p className="text-xs font-medium text-slate-400 dark:text-slate-500 mb-3 px-1">
                    {isAr ? "أو تصفح حسب الفئة" : "Browse by Category"}
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {Object.entries(typeConfig).map(([key, config]) => {
                      const Icon = config.icon;
                      return (
                        <button
                          key={key}
                          onClick={() => {
                            switch (key) {
                              case "project":
                                setCurrentPage("projects");
                                break;
                              case "task":
                                setCurrentPage("tasks");
                                break;
                              case "client":
                                setCurrentPage("clients");
                                break;
                              case "invoice":
                                setCurrentPage("financial-invoices");
                                break;
                              case "document":
                                setCurrentPage("documents");
                                break;
                            }
                          }}
                          className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 ${config.bgHover} transition-all text-start group`}
                        >
                          <div
                            className={`w-8 h-8 rounded-lg ${config.color} flex items-center justify-center shrink-0`}
                          >
                            <Icon className="h-4 w-4" />
                          </div>
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            {isAr ? config.ar : config.en}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 text-[11px] text-slate-400">
                  <kbd className="px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[10px] font-mono">
                    ↑↓
                  </kbd>
                  <span>{isAr ? "تنقل" : "Navigate"}</span>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-slate-400">
                  <kbd className="px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[10px] font-mono">
                    ↵
                  </kbd>
                  <span>{isAr ? "اختيار" : "Select"}</span>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-slate-400">
                  <kbd className="px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[10px] font-mono">
                    esc
                  </kbd>
                  <span>{isAr ? "إغلاق" : "Close"}</span>
                </div>
              </div>
              <div className="text-[11px] text-slate-400">
                {isAr ? "BluePrint ⌘" : "BluePrint ⌘"}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
