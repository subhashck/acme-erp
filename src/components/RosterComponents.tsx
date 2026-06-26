import * as React from "react";
import { Trash2 } from "lucide-react";
import type { RosterRow, ShiftRow, StaffRow } from "../types";
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
  assignments: RosterRow[];
  onDropStaff: (staffId: number, date: string, shiftId: number) => void;
  onDeleteRoster: (rosterId: number) => void;
}

export function ShiftSlot({ date, shift, assignments, onDropStaff, onDeleteRoster }: ShiftSlotProps) {
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

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`rounded-xl border-[1.5px] p-2 transition-all duration-155 flex flex-col gap-1.5 min-h-[58px] ${
        isOver
          ? "border-primary bg-primary/10 scale-[1.02]"
          : assignments.length === 0 
            ? "border-dashed border-border bg-muted/20 hover:bg-muted/40 hover:border-muted-foreground/30 items-center justify-center" 
            : "border-transparent bg-transparent"
      }`}
    >
      {assignments.length === 0 ? (
        <>
          <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider flex items-center gap-1">
            <span className="opacity-60"><Icon size={10} /></span> {shift.name}
          </span>
          <span className="text-[9px] text-muted-foreground/40">Drop staff here</span>
        </>
      ) : (
        <>
          <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider flex items-center gap-1 px-1">
            <span className="opacity-60"><Icon size={10} /></span> {shift.name}
          </span>
          <div className="flex flex-col gap-1.5">
            {assignments.map(assignment => (
              <div
                key={assignment.id}
                className={`group relative rounded-lg p-2 text-[12px] border shadow-xs flex justify-between items-center ${cfg.bgClass} ${cfg.borderClass}`}
              >
                <span className={`font-semibold truncate pr-2 ${cfg.textColorClass}`} title={assignment.staffName}>
                  {assignment.staffName}
                </span>
                <button
                  onClick={() => onDeleteRoster(assignment.id)}
                  className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 transition-opacity p-0.5 rounded-md hover:bg-destructive/15 dark:hover:bg-red-950/30 cursor-pointer border-0 bg-transparent shrink-0"
                  title="Remove assignment"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        </>
      )}
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
  const isPast = date < today();

  return (
    <div
      className={`flex-1 min-w-[155px] rounded-2xl p-3 flex flex-col gap-2 border transition-all ${
        isToday
          ? "border-2 border-primary bg-primary/5 shadow-xs"
          : "border-border bg-card"
      } ${isPast ? "opacity-50 grayscale hover:opacity-100 hover:grayscale-0" : ""}`}
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
          const assignments = rosters.filter(
            (r) => r.shiftId === shift.id || r.shift === shift.name
          );
          return (
            <ShiftSlot
              key={shift.id}
              date={date}
              shift={shift}
              assignments={assignments}
              onDropStaff={onDropStaff}
              onDeleteRoster={onDeleteRoster}
            />
          );
        })}
      </div>
    </div>
  );
}

function MonthlyTableCell({
  dateStr,
  staffId,
  activeAssignment,
  shiftCode,
  cfg,
  onDropShift,
  onDeleteRoster
}: {
  dateStr: string;
  staffId: number;
  activeAssignment?: RosterRow;
  shiftCode?: string;
  cfg?: any;
  onDropShift: (staffId: number, date: string, shiftId: number) => void;
  onDeleteRoster: (rosterId: number) => void;
}) {
  const [isOver, setIsOver] = React.useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsOver(true);
  };

  const handleDragLeave = () => setIsOver(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsOver(false);
    const shiftIdStr = e.dataTransfer.getData("shiftId");
    if (shiftIdStr) {
      onDropShift(staffId, dateStr, parseInt(shiftIdStr, 10));
    }
  };

  if (activeAssignment && shiftCode && cfg) {
    return (
      <td
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`p-0 border-l border-border relative group transition-colors ${isOver ? "bg-primary/20" : ""}`}
      >
        <div
          className={`flex items-center justify-center w-full h-full min-h-[36px] font-bold text-[11px] ${cfg.bgClass} ${cfg.textColorClass}`}
          title={activeAssignment.shift}
        >
          {shiftCode}
        </div>
        <button
          onClick={() => onDeleteRoster(activeAssignment.id)}
          className="absolute inset-0 flex items-center justify-center w-full h-full opacity-0 group-hover:opacity-100 bg-destructive/80 text-destructive-foreground cursor-pointer transition-opacity"
          title="Remove assignment"
        >
          <Trash2 size={14} />
        </button>
      </td>
    );
  }

  return (
    <td
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`p-0 border-l border-border transition-colors ${isOver ? "bg-primary/20" : ""}`}
    >
      <div className="flex items-center justify-center w-full h-full min-h-[36px] bg-transparent text-muted-foreground/30">
        -
      </div>
    </td>
  );
}

export function MonthlyTableView({
  exportMonth,
  rosters,
  shifts,
  allStaff,
  onDropShift,
  onDeleteRoster
}: {
  exportMonth: string;
  rosters: RosterRow[];
  shifts: ShiftRow[];
  allStaff: StaffRow[];
  onDropShift: (staffId: number, date: string, shiftId: number) => void;
  onDeleteRoster: (rosterId: number) => void;
}) {
  const [year, month] = exportMonth.split("-").map(Number);
  if (!year || !month) return <div className="p-8 text-center text-muted-foreground">Invalid month selected</div>;

  const numDays = new Date(year, month, 0).getDate();
  const firstDay = `${exportMonth}-01`;
  const lastDay = `${exportMonth}-${numDays.toString().padStart(2, "0")}`;

  const monthRosters = rosters.filter(
    (r) => r.startDate <= lastDay && r.endDate >= firstDay
  );

  const dayDates: string[] = [];
  for (let d = 1; d <= numDays; d++) {
    dayDates.push(`${exportMonth}-${d.toString().padStart(2, "0")}`);
  }

  const staffList = allStaff.sort((a, b) => a.name.localeCompare(b.name));

  const getShiftCode = (name: string): string => {
    const dbShift = shifts.find((s) => s.name === name);
    if (dbShift?.code) return dbShift.code;
    return name.substring(0, 2).toUpperCase();
  };

  if (staffList.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground text-sm border rounded-lg bg-muted/20">
        No staff members found in this department.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border rounded-xl bg-card">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="bg-muted/50 border-b">
            <th className="px-3 py-2 text-left font-semibold sticky left-0 bg-muted/90 z-20 w-[150px] shadow-[1px_0_0_rgba(0,0,0,0.1)] border-r">
              Staff Member
            </th>
            {dayDates.map((dateStr, idx) => (
              <th key={dateStr} className="px-1 py-2 text-center font-medium min-w-[32px] border-l border-border">
                {idx + 1}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {staffList.map((staff) => {
            const staffRosters = monthRosters.filter((r) => r.staffId === staff.id);
            return (
              <tr key={staff.id} className="hover:bg-muted/30">
                <td className="px-3 py-2 font-medium sticky left-0 bg-card z-10 shadow-[1px_0_0_rgba(0,0,0,0.1)] truncate border-r border-border">
                  {staff.name}
                </td>
                {dayDates.map((dateStr) => {
                  const activeAssignment = staffRosters.find(
                    (r) => r.startDate <= dateStr && r.endDate >= dateStr
                  );

                  let shiftCode;
                  let cfg;

                  if (activeAssignment) {
                    shiftCode = getShiftCode(activeAssignment.shift);
                    cfg = getShiftConfig(activeAssignment.shift);
                  }

                  return (
                    <MonthlyTableCell
                      key={dateStr}
                      dateStr={dateStr}
                      staffId={staff.id}
                      activeAssignment={activeAssignment}
                      shiftCode={shiftCode}
                      cfg={cfg}
                      onDropShift={onDropShift}
                      onDeleteRoster={onDeleteRoster}
                    />
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
