import * as React from "react"
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr",
  "May", "Jun", "Jul", "Aug",
  "Sep", "Oct", "Nov", "Dec",
]

interface MonthPickerProps {
  /** Controlled value in "YYYY-MM" format, or empty string for "none" */
  value: string
  onChange: (value: string) => void
  placeholder?: string
  /** If true, shows a clear button and "Clear" option */
  clearable?: boolean
  className?: string
  disabled?: boolean
}

export function MonthPicker({
  value,
  onChange,
  placeholder = "Select month",
  clearable = false,
  className,
  disabled = false,
}: MonthPickerProps) {
  const [open, setOpen] = React.useState(false)

  const today = new Date()
  const parsedYear  = value ? parseInt(value.slice(0, 4), 10) : today.getFullYear()
  const parsedMonth = value ? parseInt(value.slice(5, 7), 10) - 1 : -1 // 0-indexed, -1 = none

  const [viewYear, setViewYear] = React.useState(parsedYear)

  // Keep viewYear in sync when value changes externally
  React.useEffect(() => {
    if (value) setViewYear(parseInt(value.slice(0, 4), 10))
  }, [value])

  const selectMonth = (monthIndex: number) => {
    const mm = String(monthIndex + 1).padStart(2, "0")
    onChange(`${viewYear}-${mm}`)
    setOpen(false)
  }

  const displayLabel = value
    ? `${MONTHS[parsedMonth]} ${parsedYear}`
    : placeholder

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "justify-start gap-2 font-normal",
            !value && "text-muted-foreground",
            className
          )}
        >
          <CalendarDays className="size-4 shrink-0" />
          <span className="flex-1 text-left">{displayLabel}</span>
          {clearable && value && (
            <X
              className="size-3.5 shrink-0 text-muted-foreground hover:text-foreground"
              onClick={(e) => {
                e.stopPropagation()
                onChange("")
              }}
            />
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-56 p-3" align="start">
        {/* Year navigation */}
        <div className="mb-3 flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => setViewYear((y) => y - 1)}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="text-sm font-semibold tabular-nums">{viewYear}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => setViewYear((y) => y + 1)}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>

        {/* Month grid */}
        <div className="grid grid-cols-3 gap-1">
          {MONTHS.map((name, idx) => {
            const isSelected = !!value && parsedYear === viewYear && parsedMonth === idx
            const isCurrent  = today.getFullYear() === viewYear && today.getMonth() === idx
            return (
              <Button
                key={name}
                type="button"
                variant={isSelected ? "default" : "ghost"}
                size="sm"
                onClick={() => selectMonth(idx)}
                className={cn(
                  "h-8 w-full text-xs font-medium",
                  isCurrent && !isSelected && "border border-primary/40 text-primary"
                )}
              >
                {name}
              </Button>
            )
          })}
        </div>

        {/* Clear */}
        {clearable && value && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-2 h-7 w-full text-xs text-muted-foreground"
            onClick={() => { onChange(""); setOpen(false) }}
          >
            Clear selection
          </Button>
        )}
      </PopoverContent>
    </Popover>
  )
}
