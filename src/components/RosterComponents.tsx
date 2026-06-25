import * as React from "react";
import { Trash2 } from "lucide-react";
import type { RosterRow, ShiftRow } from "../types";
import { getShiftConfig, today, shortDay } from "../lib/roster-utils";

export function ShiftBadge({ shift, size = "sm" }: { shift: string; size?: "sm" | "lg" }) {
  const cfg = getShiftConfig(shift);
  const Icon = cfg.Icon;
  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold whitespace-nowrap border ${cfg.bgClass} ${cfg.borderClass} ${cfg.textColorClass} ${
        size === "lg" ? "gap-1.5 px-3 py-[5px] text-[13px]" : "gap-1 px-2 py-[2px] text-[11px]"
      }`}
    >
      <Icon size={size === "lg" ? 14 : 11} />
      {shift}
    </span>
  );
}

export function OnDutyCard({ roster }: { roster: RosterRow }) {
  const cfg = getShiftConfig(roster.shift);
  return (
    <div
      className={`bg-linear-to-br border-[1.5px] rounded-xl px-4 py-3.5 flex items-center justify-between gap-3 min-w-[180px] ${cfg.gradientClass} ${cfg.borderClass}`}
    >
      <div>
        <p className={`font-bold text-[15px] m-0 ${cfg.textColorClass}`}>{roster.staffName}</p>
        <p className="text-xs text-muted-foreground mt-0.5 mb-0">{roster.departmentName}</p>
      </div>
      <ShiftBadge shift={roster.shift} size="lg" />
    </div>
  );
}

interface ShiftSlotProps {
  date: string;
  shift: ShiftRow;
  assignment?: RosterRow;
  onDropStaff: (staffId: number, date: string, shiftId: number) => void;
  onDeleteRoster: (rosterId: number) => void;
}

export function ShiftSlot({ date, shift, assignment, onDropStaff, onDeleteRoster }: ShiftSlotProps) {
  const [isOver, setIsOver] = React.useState(false);
  const cfg = getShiftConfig(shift.name);
  const Icon = cfg.Icon;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsOver(true);
  };

  const handleDragLeave = () => {
    setIsOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsOver(false);
    const staffIdStr = e.dataTransfer.getData("staffId");
    if (staffIdStr) {
      onDropStaff(parseInt(staffIdStr, 10), date, shift.id);
    }
  };

  if (assignment) {
    return (
      <div
        className={`group relative rounded-xl p-2.5 text-[12px] border transition-all duration-155 shadow-xs flex flex-col gap-1 ${cfg.bgClass} ${cfg.borderClass}`}
      >
        <div className="flex justify-between items-start gap-1">
          <span className={`font-semibold truncate pr-4 ${cfg.textColorClass}`} title={assignment.staffName}>
            {assignment.staffName}
          </span>
          <button
            onClick={() => onDeleteRoster(assignment.id)}
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 transition-opacity p-0.5 rounded-md hover:bg-destructive/15 dark:hover:bg-red-950/30 cursor-pointer border-0 bg-transparent"
            title="Remove assignment"
          >
            <Trash2 size={12} />
          </button>
        </div>
        <div className={`flex items-center gap-1.5 ${cfg.colorClass}`}>
          <Icon size={11} />
          <span className="text-[10px] font-bold uppercase tracking-wider">{shift.name}</span>
        </div>
      </div>
    );
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`rounded-xl border-[1.5px] border-dashed p-3 text-center transition-all duration-155 flex flex-col items-center justify-center gap-1 min-h-[58px] ${
        isOver
          ? "border-primary bg-primary/10 scale-[1.02]"
          : "border-border bg-muted/20 hover:bg-muted/40 hover:border-muted-foreground/30"
      }`}
    >
      <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider flex items-center gap-1">
        <span className="opacity-60"><Icon size={10} /></span> {shift.name}
      </span>
      <span className="text-[9px] text-muted-foreground/40">Drop staff here</span>
    </div>
  );
}

export function DayColumn({
  date,
  rosters,
  shifts,
  onDropStaff,
  onDeleteRoster
}: {
  date: string;
  rosters: RosterRow[];
  shifts: ShiftRow[];
  onDropStaff: (staffId: number, date: string, shiftId: number) => void;
  onDeleteRoster: (rosterId: number) => void;
}) {
  const isToday = date === today();

  return (
    <div
      className={`flex-1 min-w-[155px] rounded-2xl p-3 flex flex-col gap-2 border transition-all ${
        isToday
          ? "border-2 border-primary bg-primary/5 shadow-xs"
          : "border-border bg-card"
      }`}
    >
      {/* Day header */}
      <div className="text-center mb-1">
        <div
          className={`text-[10px] font-bold uppercase tracking-wider ${
            isToday ? "text-primary" : "text-muted-foreground"
          }`}
        >
          {shortDay(date)}
        </div>
        <div
          className={`text-2xl font-black leading-none my-0.5 ${
            isToday ? "text-primary" : "text-foreground"
          }`}
        >
          {new Date(date + "T00:00:00").getDate()}
        </div>
        <div className="text-[10px] font-medium text-muted-foreground">
          {new Date(date + "T00:00:00").toLocaleDateString("en-US", { month: "short" })}
        </div>
        {isToday && (
          <div className="mt-1 text-[8px] font-black text-primary-foreground bg-primary rounded-full px-2 py-0.5 inline-block tracking-wider">
            TODAY
          </div>
        )}
      </div>

      {/* Shift slots */}
      <div className="flex flex-col gap-2">
        {shifts.map((shift) => {
          const assignment = rosters.find(
            (r) => r.shiftId === shift.id || r.shift === shift.name
          );
          return (
            <ShiftSlot
              key={shift.id}
              date={date}
              shift={shift}
              assignment={assignment}
              onDropStaff={onDropStaff}
              onDeleteRoster={onDeleteRoster}
            />
          );
        })}
      </div>
    </div>
  );
}
