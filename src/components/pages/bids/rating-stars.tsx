"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function RatingStars({ rating, size = "sm" }: { rating: number; size?: "sm" | "md" }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={cn(
            size === "sm" ? "h-3 w-3" : "h-4 w-4",
            i <= rating ? "fill-amber-400 text-amber-400" : "text-slate-200 dark:text-slate-600"
          )}
        />
      ))}
    </div>
  );
}
