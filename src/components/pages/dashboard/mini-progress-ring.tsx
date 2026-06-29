import { cn } from "@/lib/utils";

export function MiniProgressRing({ progress, size = 40, strokeWidth = 3.5, className }: { progress: number; size?: number; strokeWidth?: number; className?: string }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;
  const color = progress >= 80 ? "#10b981" : progress >= 50 ? "#0d9488" : progress >= 25 ? "#f59e0b" : "#ef4444";

  return (
    <svg className={cn("shrink-0 -rotate-90", className)} width={size} height={size}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="text-slate-100 dark:text-slate-800"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        className="transition-all duration-700 ease-out"
      />
    </svg>
  );
}
