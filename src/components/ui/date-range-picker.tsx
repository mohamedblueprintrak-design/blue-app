"use client"

import { useTranslations } from 'next-intl';
import * as React from "react"
import { format } from "date-fns"
import { ar } from "date-fns/locale"
import { Calendar as CalendarIcon } from "lucide-react"
import { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerWithRangeProps extends React.HTMLAttributes<HTMLDivElement> {
  date?: DateRange
  setDate?: (date: DateRange | undefined) => void
  isAr?: boolean
}

export function DatePickerWithRange({
  className,
  date,
  setDate,
  isAr,
}: DatePickerWithRangeProps) {
  const tAuto = useTranslations();
  
  // Prevent Next.js hydration mismatches by deferring date format rendering
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => {
    setMounted(true)
  }, [])

  const formatDate = (d: Date) => {
    return format(d, isAr ? "dd LLL yyyy" : "LLL dd, y", {
      locale: isAr ? ar : undefined
    })
  }

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-[260px] justify-start font-normal",
              !date && "text-muted-foreground",
              isAr ? "text-right" : "text-left"
            )}
          >
            <CalendarIcon className={cn("h-4 w-4", isAr ? "ml-2" : "mr-2")} />
            {mounted && date?.from ? (
              date.to ? (
                <>
                  {formatDate(date.from)} - {formatDate(date.to)}
                </>
              ) : (
                formatDate(date.from)
              )
            ) : (
              <span>{tAuto('auto.pickADateRange')}</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align={isAr ? "end" : "start"}>
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={setDate}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
