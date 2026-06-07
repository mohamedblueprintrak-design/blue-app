"use client";

import { Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

interface BulkActionBarProps {
  ar?: boolean;
  selectedCount: number;
  onClearSelection: () => void;
  onDeleteSelected: () => void;
}

export function BulkActionBar({
  ar,
  selectedCount,
  onClearSelection,
  onDeleteSelected,
}: BulkActionBarProps) {
  return (
    <AnimatePresence>
      {selectedCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl shadow-slate-900/20 border border-slate-700/50"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-teal-500 text-xs font-medium text-white">
              {selectedCount}
            </span>
            <span className="text-sm font-medium">
              {ar ? "تم التحديد" : "Selected"}
            </span>
          </div>

          <div className="h-6 w-px bg-slate-700" />

          <Button
            variant="ghost"
            size="sm"
            onClick={onDeleteSelected}
            className="text-red-400 hover:text-red-300 hover:bg-red-400/10 h-8 gap-2 px-3"
          >
            <Trash2 className="h-4 w-4" />
            <span className="text-xs font-medium">{ar ? "حذف" : "Delete"}</span>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={onClearSelection}
            className="text-slate-400 hover:text-white hover:bg-slate-800 h-8 w-8 rounded-full ms-2"
            aria-label={ar ? "إلغاء التحديد" : "Clear selection"}
          >
            <X className="h-4 w-4" />
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
