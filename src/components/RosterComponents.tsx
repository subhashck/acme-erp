import * as React from "react";
import { Trash2, Palmtree } from "lucide-react";
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
  canAssign?: boolean;
  /** staffId → unique dept-scoped label (e.g. "AB" or "AB-2") */
  initialsMap?: Map<number, string>;
}

export function ShiftSlot({ date, shift, assignments, onDropStaff, onDeleteRoster, canAssign, initialsMap }: ShiftSlotProps) {
  const [isOver, setIsOver] = React.useState(false);
  const cfg = getShiftConfig(shift.name);
  const Icon = cfg.Icon;

  const handleDragOver = (e: React.DragEvent) => {
    if (!canAssign) return;
    e.preventDefault();
    setIsOver(true);
  };

  const handleDragLeave = () => {
    if (!canAssign) return;
    setIsOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    if (!canAssign) return;
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
      className={`rounded-xl p-2 min-h-[72px] transition-all border flex flex-col gap-1.5 ${
        isOver
          ? "border-primary border-dashed bg-primary/15 scale-[1.02] shadow-sm"
          : `${cfg.bgClass} ${cfg.borderClass}`
      }`}
    >
      {assignments.length === 0 ? (
        <div className="h-full min-h-[56px] flex flex-col items-center justify-center text-center p-1">
          <div className={`p-1 rounded-full mb-1 ${cfg.bgClass}`}>
            <Icon size={14} className={cfg.colorClass} />
          </div>
          <span className={`text-[10px] font-bold ${cfg.textColorClass}`}>{shift.name}</span>
          {canAssign && (
            <span className="text-[9px] text-muted-foreground/60 mt-0.5">Drag staff here</span>
          )}
        </div>
      ) : (
        <>
          <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider flex items-center gap-1 px-1">
            <span className="opacity-60"><Icon size={10} /></span> {shift.name}
          </span>
          <div className="flex flex-wrap gap-1">
            {assignments.map(assignment => (
              <div
                key={assignment.id}
                className={`group relative rounded-lg border shadow-xs flex items-center justify-center ${cfg.bgClass} ${cfg.borderClass} ${canAssign ? 'w-8 h-8' : 'w-7 h-7'}`}
                title={assignment.staffName}
              >
                {/* Unique initials circle */}
                <span className={`font-black leading-none select-none ${cfg.textColorClass} ${canAssign ? 'text-[10px]' : 'text-[9px]'}`}>
                  {initialsMap?.get(assignment.staffId)
                    ?? assignment.staffName.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                </span>
                {canAssign && (
                  <button
                    onClick={() => onDeleteRoster(assignment.id)}
                    className="absolute inset-0 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 bg-destructive/80 text-destructive-foreground cursor-pointer transition-opacity border-0"
                    title={`Remove ${assignment.staffName}`}
                  >
                    <Trash2 size={10} />
                  </button>
                )}
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
  onDeleteRoster,
  canAssign,
  initialsMap,
  offStaffList,
}: {
  date: string;
  rosters: RosterRow[];
  shifts: ShiftRow[];
  onDropStaff: (staffId: number, date: string, shiftId: number) => void;
  onDeleteRoster: (rosterId: number) => void;
  canAssign?: boolean;
  initialsMap?: Map<number, string>;
  offStaffList?: StaffRow[];
}) {
  const isToday = date === today();
  const isPast = date < today();

  const leaveShifts = shifts.filter(
    (s) => s.name.toLowerCase().includes("leave") || s.isOffDay
  );
  const workShifts = shifts.filter(
    (s) => !s.name.toLowerCase().includes("leave") && !s.isOffDay
  );

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

      {/* ── TOP SECTION: Scheduled Off, Leave, Half Day Leave ── */}
      {offStaffList && offStaffList.length > 0 && (
        <div className="rounded-xl p-2 bg-amber-500/10 border border-amber-500/30 mb-1">
          <div className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1 mb-1 px-0.5">
            <Palmtree size={11} className="text-amber-500" /> Scheduled Off ({offStaffList.length})
          </div>
          <div className="flex flex-wrap gap-1">
            {offStaffList.map((s) => (
              <div
                key={s.staffId}
                className="w-7 h-7 rounded-lg border border-amber-500/30 bg-amber-500/20 flex items-center justify-center text-[9px] font-black text-amber-800 dark:text-amber-300"
                title={`${s.name} (Scheduled Off Day)`}
              >
                {initialsMap?.get(s.staffId) ?? s.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Leave & Half Day Leave shifts (placed at top) */}
      {leaveShifts.map((shift) => {
        const assignments = rosters.filter(
          (r) => r.date === date && r.shiftId === shift.id
        );
        if (assignments.length === 0 && !canAssign) return null;
        return (
          <ShiftSlot
            key={shift.id}
            date={date}
            shift={shift}
            assignments={assignments}
            onDropStaff={onDropStaff}
            onDeleteRoster={onDeleteRoster}
            canAssign={canAssign}
            initialsMap={initialsMap}
          />
        );
      })}

      {/* ── WORK SHIFTS SECTION: Morning, Afternoon, Evening, Night ── */}
      <div className="flex flex-col gap-2">
        {workShifts.map((shift) => {
          const assignments = rosters.filter(
            (r) => r.date === date && r.shiftId === shift.id
          );
          return (
            <ShiftSlot
              key={shift.id}
              date={date}
              shift={shift}
              assignments={assignments}
              onDropStaff={onDropStaff}
              onDeleteRoster={onDeleteRoster}
              canAssign={canAssign}
              initialsMap={initialsMap}
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
  isOffDay,
  onDropShift,
  onDeleteRoster,
  canAssign
}: {
  dateStr: string;
  staffId: number;
  activeAssignment?: RosterRow;
  shiftCode?: string;
  cfg?: any;
  isOffDay?: boolean;
  onDropShift: (staffId: number, date: string, shiftId: number) => void;
  onDeleteRoster: (rosterId: number) => void;
  canAssign?: boolean;
}) {
  const [isOver, setIsOver] = React.useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    if (!canAssign) return;
    e.preventDefault();
    setIsOver(true);
  };

  const handleDragLeave = () => {
    if (!canAssign) return;
    setIsOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    if (!canAssign) return;
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
          className={`flex items-center justify-center w-full h-full min-h-9 font-bold text-[11px] ${cfg.bgClass} ${cfg.textColorClass}`}
          title={activeAssignment.shift}
        >
          {shiftCode}
        </div>
        {canAssign && (
          <button
            onClick={() => onDeleteRoster(activeAssignment.id)}
            className="absolute inset-0 flex items-center justify-center w-full h-full opacity-0 group-hover:opacity-100 bg-destructive/80 text-destructive-foreground cursor-pointer transition-opacity"
            title="Remove assignment"
          >
            <Trash2 size={14} />
          </button>
        )}
      </td>
    );
  }

  if (isOffDay) {
    return (
      <td
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`p-0 border-l border-border transition-colors ${isOver ? "bg-primary/20" : ""}`}
      >
        <div
          className="flex items-center justify-center w-full h-full min-h-[36px] font-bold text-[10px] bg-amber-500/10 text-amber-700 dark:text-amber-400"
          title="Scheduled Off Day"
        >
          OFF
        </div>
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
  isOffDay,
  onDropShift,
  onDeleteRoster,
  canAssign
}: {
  exportMonth: string;
  rosters: RosterRow[];
  shifts: ShiftRow[];
  allStaff: StaffRow[];
  isOffDay?: (staffId: number, dateStr: string) => boolean;
  onDropShift: (staffId: number, date: string, shiftId: number) => void;
  onDeleteRoster: (rosterId: number) => void;
  canAssign?: boolean;
}) {
  const [year, month] = exportMonth.split("-").map(Number);
  if (!year || !month) return <div className="p-8 text-center text-muted-foreground">Invalid month selected</div>;

  const numDays = new Date(year, month, 0).getDate();
  const firstDay = `${exportMonth}-01`;
  const lastDay = `${exportMonth}-${numDays.toString().padStart(2, "0")}`;

  const monthRosters = rosters.filter(
    (r) => r.date >= firstDay && r.date <= lastDay
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
            {dayDates.map((dateStr, idx) => {
              const dayDate = new Date(dateStr + "T00:00:00");
              const dayOfWeekStr = dayDate.toLocaleDateString("en-US", { weekday: "short" }).slice(0, 2);
              const dayOfWeekNum = dayDate.getDay();
              // const isWeekend = dayOfWeekNum === 0 || dayOfWeekNum === 6;
              const isWeekend = dayOfWeekNum === 0;

              return (
                <th
                  key={dateStr}
                  className={`px-1 py-1 text-center font-medium min-w-9 border-l border-border select-none ${
                    isWeekend ? "bg-amber-500/10 dark:bg-rose-800" : ""
                  }`}
                >
                  <div className={`text-[9px] font-bold uppercase ${isWeekend ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground/70"}`}>
                    {dayOfWeekStr}
                  </div>
                  <div className="text-[11px] font-extrabold text-foreground leading-tight">
                    {idx + 1}
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {staffList.map((staff) => {
            const staffRosters = monthRosters.filter((r) => r.staffId === staff.staffId);
            return (
              <tr key={staff.staffId} className="hover:bg-muted/30">
                <td className="px-3 py-2 font-medium sticky left-0 bg-card z-10 shadow-[1px_0_0_rgba(0,0,0,0.1)] truncate border-r border-border">
                  {staff.name}
                </td>
                {dayDates.map((dateStr) => {
                  const activeAssignment = staffRosters.find(
                    (r) => r.date === dateStr
                  );

                  let shiftCode;
                  let cfg;

                  if (activeAssignment) {
                    shiftCode = getShiftCode(activeAssignment.shift);
                    cfg = getShiftConfig(activeAssignment.shift);
                  }

                  const staffIsOff = isOffDay ? isOffDay(staff.staffId, dateStr) : false;

                  return (
                    <MonthlyTableCell
                      key={dateStr}
                      dateStr={dateStr}
                      staffId={staff.staffId}
                      activeAssignment={activeAssignment}
                      shiftCode={shiftCode}
                      cfg={cfg}
                      isOffDay={staffIsOff}
                      onDropShift={onDropShift}
                      onDeleteRoster={onDeleteRoster}
                      canAssign={canAssign}
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
