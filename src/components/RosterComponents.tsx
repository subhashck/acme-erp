import * as React from "react";
import { Trash2, Palmtree, Plus, Calendar, Clock, Check, Edit2, Moon } from "lucide-react";
import type { RosterRow, ShiftRow, StaffRow } from "../types";
import { getShiftConfig, today, shortDay } from "../lib/roster-utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function ShiftBadge({ shift, size = "sm" }: { shift: string; size?: "sm" | "lg" }) {
  const cfg = getShiftConfig(shift);
  const Icon = cfg.Icon;
  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold whitespace-nowrap border ${cfg.bgClass} ${cfg.borderClass} ${cfg.textColorClass} ${size === "lg" ? "gap-1.5 px-3 py-[5px] text-[13px]" : "gap-1 px-2 py-[2px] text-[11px]"
        }`}
    >
      <Icon size={size === "lg" ? 14 : 11} />
      {shift}
    </span>
  );
}

export function OnDutyCard({
  roster,
  initials,
}: {
  roster: RosterRow;
  initials?: string;
}) {
  const cfg = getShiftConfig(roster.shift);
  const Icon = cfg.Icon;
  const staffInitials =
    initials ??
    roster.staffName
      .split(" ")
      .map((n) => n[0] ?? "")
      .filter(Boolean)
      .join("")
      .slice(0, 2)
      .toUpperCase();

  return (
    <div
      className={`bg-linear-to-br border-[1.5px] rounded-lg sm:rounded-xl px-2.5 py-2 sm:px-3 sm:py-2 flex items-center gap-2 w-full min-w-0 transition-all hover:shadow-xs ${cfg.gradientClass} ${cfg.borderClass}`}
    >
      <span
        className={`w-6 h-6 sm:w-7 sm:h-7 rounded-md text-[9px] sm:text-[10px] flex items-center justify-center font-black shrink-0 select-none bg-background/80 shadow-2xs border border-border/40 ${cfg.textColorClass}`}
      >
        {staffInitials}
      </span>
      <div className="min-w-0 flex-1">
        <p
          className={`font-semibold text-xs sm:text-[13px] m-0 truncate leading-tight ${cfg.textColorClass}`}
          title={roster.staffName}
        >
          {roster.staffName}
        </p>
        <p
          className="text-[10px] sm:text-[11px] font-medium mt-0.5 mb-0 flex items-center gap-1 leading-tight text-muted-foreground"
          title={roster.shift}
        >
          <Icon size={11} className={`${cfg.colorClass} shrink-0`} />
          <span className="truncate">{roster.shift}</span>
        </p>
      </div>
    </div>
  );
}

const MINUTES_IN_DAY = 24 * 60;
const DAY_START_MINUTES = 7 * 60;
const DAY_END_MINUTES = 19 * 60;
const NIGHT_SCALE = 0.5;
const WEIGHTED_DAY_MINUTES = (DAY_END_MINUTES - DAY_START_MINUTES) +
  (MINUTES_IN_DAY - (DAY_END_MINUTES - DAY_START_MINUTES)) * NIGHT_SCALE;

function timeToMinutes(value?: string | null) {
  if (!value) return null;
  const [hours, minutes] = value.slice(0, 5).split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return Math.min(MINUTES_IN_DAY, Math.max(0, hours * 60 + minutes));
}

function timelinePercent(minutes: number) {
  const clamped = Math.min(MINUTES_IN_DAY, Math.max(0, minutes));
  let weightedMinutes: number;

  if (clamped <= DAY_START_MINUTES) {
    weightedMinutes = clamped * NIGHT_SCALE;
  } else if (clamped <= DAY_END_MINUTES) {
    weightedMinutes = DAY_START_MINUTES * NIGHT_SCALE + (clamped - DAY_START_MINUTES);
  } else {
    weightedMinutes = DAY_START_MINUTES * NIGHT_SCALE +
      (DAY_END_MINUTES - DAY_START_MINUTES) +
      (clamped - DAY_END_MINUTES) * NIGHT_SCALE;
  }

  return (weightedMinutes / WEIGHTED_DAY_MINUTES) * 100;
}

export function DailyGanttView({
  date,
  rosters,
  shifts,
  allStaff,
  isOffDay,
  initialsMap,
  onEditRoster,
  onDeleteRoster,
  onAssignShift,
  canAssign,
}: {
  date: string;
  rosters: RosterRow[];
  shifts: ShiftRow[];
  allStaff: StaffRow[];
  isOffDay?: (staffId: number, dateStr: string) => boolean;
  initialsMap?: Map<number, string>;
  onEditRoster: (roster: RosterRow) => void;
  onDeleteRoster: (rosterId: number) => void;
  onAssignShift: (staffId: number, date: string, shiftId: number) => void | Promise<void>;
  canAssign?: boolean;
}) {
  const [assigningStaff, setAssigningStaff] = React.useState<StaffRow | null>(null);
  const hourMarkers = Array.from({ length: 25 }, (_, hour) => hour);
  const previousDateValue = new Date(date + "T00:00:00");
  previousDateValue.setDate(previousDateValue.getDate() - 1);
  const previousDate = `${previousDateValue.getFullYear()}-${String(previousDateValue.getMonth() + 1).padStart(2, "0")}-${String(previousDateValue.getDate()).padStart(2, "0")}`;
  const todayRosters = rosters.filter((roster) => roster.date === date);
  const rosterByStaff = new Map(todayRosters.map((roster) => [roster.staffId, roster]));
  const shiftById = new Map(shifts.map((shift) => [shift.id, shift]));
  const previousOvernightByStaff = new Map(
    rosters
      .filter((roster) => {
        if (roster.date !== previousDate) return false;
        const shift = shiftById.get(roster.shiftId);
        const start = timeToMinutes(shift?.startTime);
        const end = timeToMinutes(shift?.endTime);
        return start !== null && end !== null && end <= start && end > 0;
      })
      .map((roster) => [roster.staffId, roster])
  );
  const staff = [...allStaff].sort((a, b) => {
    const aRoster = rosterByStaff.get(a.staffId);
    const bRoster = rosterByStaff.get(b.staffId);
    const aCarryOver = previousOvernightByStaff.get(a.staffId);
    const bCarryOver = previousOvernightByStaff.get(b.staffId);
    const aShift = aRoster ? shiftById.get(aRoster.shiftId) : undefined;
    const bShift = bRoster ? shiftById.get(bRoster.shiftId) : undefined;
    const aStart = aCarryOver ? 0 : timeToMinutes(aShift?.startTime) ?? MINUTES_IN_DAY + (aRoster ? 0 : 1);
    const bStart = bCarryOver ? 0 : timeToMinutes(bShift?.startTime) ?? MINUTES_IN_DAY + (bRoster ? 0 : 1);

    return aStart - bStart || (aShift?.sortOrder ?? 0) - (bShift?.sortOrder ?? 0) || a.name.localeCompare(b.name);
  });
  const currentMinutes = new Date().getHours() * 60 + new Date().getMinutes();

  if (staff.length === 0) {
    return <div className="p-8 text-center text-sm text-muted-foreground">No staff members found in this department.</div>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <div className="min-w-[980px]">
        <div className="grid grid-cols-[220px_minmax(720px,1fr)] border-b border-border bg-muted/40">
          <div className="sticky left-0 z-30 flex items-center border-r border-border bg-muted/90 px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Staff member
          </div>
          <div className="relative h-12">
            {hourMarkers.map((hour) => (
              <div
                key={hour}
                className="absolute inset-y-0 border-l border-border/70"
                style={{ left: `${timelinePercent(hour * 60)}%` }}
              >
                {hour < 24 && (
                  <span className="absolute left-1 top-2 text-[10px] font-semibold text-muted-foreground">
                    {String(hour).padStart(2, "0")}:00
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="divide-y divide-border">
          {staff.map((member) => {
            const assignment = rosterByStaff.get(member.staffId);
            const shift = assignment ? shiftById.get(assignment.shiftId) : undefined;
            const previousAssignment = previousOvernightByStaff.get(member.staffId);
            const previousShift = previousAssignment ? shiftById.get(previousAssignment.shiftId) : undefined;
            const previousEnd = timeToMinutes(previousShift?.endTime);
            const staffIsOff = isOffDay?.(member.staffId, date) ?? false;
            const start = timeToMinutes(shift?.startTime);
            const rawEnd = timeToMinutes(shift?.endTime);
            const isUntimed = start === null || rawEnd === null || shift?.isOffDay;
            const end = !isUntimed && rawEnd! <= start! ? MINUTES_IN_DAY : rawEnd;
            const left = isUntimed ? 0 : timelinePercent(start!);
            const width = isUntimed ? 100 : Math.max(2.5, timelinePercent(end!) - timelinePercent(start!));
            const cfg = getShiftConfig(assignment?.shift ?? "");
            const Icon = cfg.Icon;

            return (
              <div key={member.staffId} className="grid min-h-16 grid-cols-[220px_minmax(720px,1fr)] hover:bg-muted/20">
                <div className="sticky left-0 z-20 flex items-center gap-2 border-r border-border bg-card px-3 py-2">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-[10px] font-black text-foreground">
                    {initialsMap?.get(member.staffId) ?? member.name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="m-0 truncate text-xs font-bold text-foreground">{member.name}</p>
                    <p className="m-0 truncate text-[10px] text-muted-foreground">{member.role}</p>
                  </div>
                </div>

                <div className="relative my-2 min-h-12 overflow-hidden">
                  {hourMarkers.map((hour) => (
                    <div key={hour} className="absolute inset-y-0 border-l border-border/45" style={{ left: `${timelinePercent(hour * 60)}%` }} />
                  ))}
                  <div className="absolute inset-y-0 bg-muted/25" style={{ left: 0, width: `${timelinePercent(DAY_START_MINUTES)}%` }} />
                  <div className="absolute inset-y-0 bg-muted/25" style={{ left: `${timelinePercent(DAY_END_MINUTES)}%`, right: 0 }} />
                  {date === today() && currentMinutes >= 0 && currentMinutes <= MINUTES_IN_DAY && (
                    <div className="absolute inset-y-0 z-10 w-px bg-destructive/70" style={{ left: `${timelinePercent(currentMinutes)}%` }} />
                  )}

                  {previousAssignment && previousShift && previousEnd !== null && (
                    <div
                      className={`group absolute top-1 bottom-1 z-10 flex min-w-9 items-center gap-1.5 overflow-hidden rounded-lg rounded-l-none border border-l-0 border-dashed px-2 shadow-xs ${getShiftConfig(previousAssignment.shift).bgClass} ${getShiftConfig(previousAssignment.shift).borderClass} ${getShiftConfig(previousAssignment.shift).textColorClass}`}
                      style={{ left: 0, width: `${Math.max(2.5, timelinePercent(previousEnd))}%` }}
                      title={`${previousAssignment.shift} continued from yesterday (${previousShift.startTime.slice(0, 5)} - ${previousShift.endTime.slice(0, 5)})`}
                    >
                      <Moon size={13} className="shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="m-0 truncate text-[11px] font-bold leading-tight">{previousAssignment.shift}</p>
                        <p className="m-0 truncate text-[9px] font-medium opacity-75">From yesterday · until {previousShift.endTime.slice(0, 5)}</p>
                      </div>
                    </div>
                  )}

                  {assignment ? (
                    <div
                      className={`group absolute top-1 bottom-1 z-10 flex min-w-9 items-center gap-1.5 overflow-hidden rounded-lg border px-2 shadow-xs ${cfg.bgClass} ${cfg.borderClass} ${cfg.textColorClass}`}
                      style={{ left: `${left}%`, width: `${width}%` }}
                      title={`${assignment.shift}${shift?.startTime && shift?.endTime ? ` (${shift.startTime.slice(0, 5)} - ${shift.endTime.slice(0, 5)})` : ""}`}
                    >
                      <Icon size={13} className="shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="m-0 truncate text-[11px] font-bold leading-tight">{assignment.shift}</p>
                        {shift?.startTime && shift?.endTime && (
                          <p className="m-0 truncate text-[9px] font-medium opacity-75">{shift.startTime.slice(0, 5)}–{shift.endTime.slice(0, 5)}</p>
                        )}
                      </div>
                      {canAssign && (
                        <div className="ml-auto hidden shrink-0 items-center gap-0.5 rounded-md bg-background/85 p-0.5 shadow-sm group-hover:flex">
                          <button type="button" onClick={() => onEditRoster(assignment)} className="rounded p-1 hover:bg-muted" title="Edit assignment"><Edit2 size={11} /></button>
                          <button type="button" onClick={() => onDeleteRoster(assignment.id)} className="rounded p-1 text-destructive hover:bg-destructive/10" title="Remove assignment"><Trash2 size={11} /></button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={!canAssign}
                      onClick={() => setAssigningStaff(member)}
                      className={`absolute inset-y-1 right-2 flex items-center rounded-lg border border-dashed px-3 text-left text-[10px] font-semibold transition-colors ${staffIsOff ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400" : "border-border text-muted-foreground/55"} ${canAssign ? "cursor-pointer hover:border-primary hover:bg-primary/10 hover:text-primary" : "cursor-default"}`}
                      style={{ left: previousEnd !== null ? `${Math.max(0.75, timelinePercent(previousEnd))}%` : "0.5rem" }}
                      title={canAssign ? `Assign a shift to ${member.name}` : undefined}
                    >
                      {staffIsOff ? <><Palmtree size={12} className="mr-1.5" /> Scheduled off</> : <><Plus size={12} className="mr-1.5" /> Click to assign shift</>}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Dialog open={Boolean(assigningStaff)} onOpenChange={(open) => !open && setAssigningStaff(null)}>
        <DialogContent className="w-[92vw] max-w-sm p-5">
          <DialogHeader className="text-left">
            <DialogTitle>Assign shift</DialogTitle>
            <DialogDescription>
              Select a shift for <strong className="text-foreground">{assigningStaff?.name}</strong> on {new Date(date + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2 flex max-h-[55vh] flex-col gap-2 overflow-y-auto">
            {shifts.filter((shift) => shift.active).map((shift) => {
              const cfg = getShiftConfig(shift.name);
              const Icon = cfg.Icon;
              const timeLabel = shift.startTime && shift.endTime
                ? `${shift.startTime.slice(0, 5)} - ${shift.endTime.slice(0, 5)}`
                : "No fixed time";
              return (
                <button
                  key={shift.id}
                  type="button"
                  onClick={async () => {
                    if (!assigningStaff) return;
                    await onAssignShift(assigningStaff.staffId, date, shift.id);
                    setAssigningStaff(null);
                  }}
                  className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 text-left transition-colors hover:border-primary hover:bg-primary/5"
                >
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${cfg.bgClass} ${cfg.borderClass} ${cfg.textColorClass}`}>
                    <Icon size={17} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-foreground">{shift.name}</span>
                    <span className="block text-[11px] text-muted-foreground">{timeLabel}</span>
                  </span>
                  <Plus size={16} className="shrink-0 text-primary" />
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
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
  selectedStaffId?: number | null;
  onTapAssign?: (staffId: number, date: string, shiftId: number) => void;
}

export function ShiftSlot({
  date,
  shift,
  assignments,
  onDropStaff,
  onDeleteRoster,
  canAssign,
  initialsMap,
  selectedStaffId,
  onTapAssign,
}: ShiftSlotProps) {
  const [isOver, setIsOver] = React.useState(false);
  const cfg = getShiftConfig(shift.name);
  const Icon = cfg.Icon;

  const isSelectableTarget = Boolean(canAssign && selectedStaffId);

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

  const handleClick = (e: React.MouseEvent) => {
    if (isSelectableTarget && selectedStaffId) {
      e.stopPropagation();
      onTapAssign?.(selectedStaffId, date, shift.id);
    }
  };

  const timeLabel =
    shift.startTime && shift.endTime
      ? `${shift.startTime.slice(0, 5)} - ${shift.endTime.slice(0, 5)}`
      : null;

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={isSelectableTarget ? handleClick : undefined}
      className={`rounded-xl p-2 min-h-14 transition-all border flex flex-col justify-between gap-1.5 ${isOver
          ? "border-primary border-dashed bg-primary/15 scale-[1.02] shadow-sm"
          : isSelectableTarget
            ? `cursor-pointer ring-1 ring-primary/40 hover:ring-2 hover:ring-primary hover:bg-primary/10 border-dashed ${cfg.bgClass} ${cfg.borderClass}`
            : `${cfg.bgClass} ${cfg.borderClass}`
        }`}
    >
      {assignments.length === 0 ? (
        <div className="flex flex-col justify-center h-full min-h-11 px-0.5">
          <div className="flex flex-col items-start w-full">
            <span className={`text-[11px] font-bold flex items-center gap-1 leading-tight ${cfg.textColorClass}`}>
              <Icon size={12} className={cfg.colorClass} />
              {shift.name}
            </span>
            {timeLabel && (
              <span className="text-[9px] text-muted-foreground/75 font-medium leading-tight mt-0.5">
                {timeLabel}
              </span>
            )}
          </div>
          {canAssign && isSelectableTarget && (
            <span className="text-[10px] font-bold text-primary flex items-center gap-1 mt-1.5 bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20 animate-pulse self-start">
              <Plus size={10} /> Tap to assign
            </span>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-1.5 w-full">
          <div className="flex flex-col items-start w-full px-0.5">
            <span className="text-[10px] font-bold text-muted-foreground/80 uppercase tracking-wider flex items-center gap-1 leading-tight">
              <span className="opacity-70"><Icon size={11} /></span> {shift.name}
            </span>
            {timeLabel && (
              <span className="text-[9px] text-muted-foreground/70 font-medium leading-tight mt-0.5">
                {timeLabel}
              </span>
            )}
          </div>
          <div className="flex flex-col gap-0.5 w-full">
            {assignments.map((assignment) => (
              <div
                key={assignment.id}
                className={`group relative flex items-center gap-1 p-0 m-0  py-0.5 w-full max-w-full overflow-hidden transition-all ${cfg.bgClass} ${cfg.borderClass}`}
                title={assignment.staffName}
              >
                {/* Unique initials badge */}
                <span
                  className={`w-4 h-4 rounded text-[7px] flex items-center justify-center font-black leading-none shrink-0 select-none bg-background/80 ${cfg.textColorClass}`}
                >
                  {initialsMap?.get(assignment.staffId) ??
                    assignment.staffName
                      .split(" ")
                      .map((n: string) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                </span>

                {/* Staff Name in text-[8px] without margin/padding */}
                <span className="text-[9px]  truncate flex-1 min-w-0 text-foreground p-0 m-0 leading-none">
                  {assignment.staffName}
                </span>

                {canAssign && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteRoster(assignment.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-0 rounded text-destructive hover:bg-destructive/15 cursor-pointer transition-opacity shrink-0"
                    title={`Remove ${assignment.staffName}`}
                  >
                    <Trash2 size={10} />
                  </button>
                )}
              </div>
            ))}
            {isSelectableTarget && (
              <button
                type="button"
                onClick={handleClick}
                className="w-full py-1 rounded-lg border border-dashed border-primary text-primary flex items-center justify-center gap-1 hover:bg-primary/20 text-xs font-bold transition-colors"
                title="Tap to assign selected staff"
              >
                <Plus size={12} /> Assign
              </button>
            )}
          </div>
        </div>
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
  selectedStaffId,
  onTapAssign,
  isMobile = false,
}: {
  date: string;
  rosters: RosterRow[];
  shifts: ShiftRow[];
  onDropStaff: (staffId: number, date: string, shiftId: number) => void;
  onDeleteRoster: (rosterId: number) => void;
  canAssign?: boolean;
  initialsMap?: Map<number, string>;
  offStaffList?: StaffRow[];
  selectedStaffId?: number | null;
  onTapAssign?: (staffId: number, date: string, shiftId: number) => void;
  isMobile?: boolean;
}) {
  const isToday = date === today();
  const isPast = date < today();

  const sortByStartTime = (a: ShiftRow, b: ShiftRow) => {
    const timeA = a.startTime || "";
    const timeB = b.startTime || "";
    if (timeA && timeB) {
      const cmp = timeA.localeCompare(timeB);
      if (cmp !== 0) return cmp;
    } else if (timeA) {
      return -1;
    } else if (timeB) {
      return 1;
    }
    return (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name);
  };

  const leaveShifts = shifts
    .filter((s) => s.name.toLowerCase().includes("leave") || s.isOffDay)
    .sort(sortByStartTime);
  const workShifts = shifts
    .filter((s) => !s.name.toLowerCase().includes("leave") && !s.isOffDay)
    .sort(sortByStartTime);

  const totalWork = workShifts.length;
  const coveredCount = workShifts.filter((s) =>
    rosters.some((r) => r.date === date && r.shiftId === s.id)
  ).length;

  return (
    <div
      className={`${isMobile ? "w-full" : "flex-1 min-w-[155px]"
        } rounded-2xl p-3 flex flex-col gap-2 border transition-all ${isToday
          ? "border-2 border-primary bg-primary/5 shadow-xs"
          : "border-border bg-card"
        } ${isPast && !isMobile ? "opacity-60 hover:opacity-100" : ""}`}
    >
      {/* Day header */}
      <div className="text-center mb-1">
        <div
          className={`text-[10px] font-bold uppercase tracking-wider ${isToday ? "text-primary" : "text-muted-foreground"
            }`}
        >
          {shortDay(date)}
        </div>
        <div
          className={`text-2xl font-black leading-none my-0.5 ${isToday ? "text-primary" : "text-foreground"
            }`}
        >
          {new Date(date + "T00:00:00").getDate()}
        </div>
        <div className="text-[10px] font-medium text-muted-foreground">
          {new Date(date + "T00:00:00").toLocaleDateString("en-US", { month: "short" })}
        </div>
        <div className="flex flex-wrap items-center justify-center gap-1 mt-1">
          {isToday && (
            <span className="text-[8px] font-black text-primary-foreground bg-primary rounded-full px-2 py-0.5 tracking-wider">
              TODAY
            </span>
          )}
          {totalWork > 0 && (
            coveredCount === totalWork ? (
              <span className="text-[8px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 rounded-full px-1.5 py-0.5">
                Full Cover
              </span>
            ) : coveredCount === 0 ? (
              <span className="text-[8px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/15 border border-amber-500/30 rounded-full px-1.5 py-0.5">
                No Cover
              </span>
            ) : (
              <span className="text-[8px] font-medium text-muted-foreground bg-muted rounded-full px-1.5 py-0.5">
                {coveredCount}/{totalWork}
              </span>
            )
          )}
        </div>
      </div>

      {/* ── TOP SECTION: Scheduled Off, Leave, Half Day Leave ── */}
      {offStaffList && offStaffList.length > 0 && (
        <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 mb-1">
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
                {initialsMap?.get(s.staffId) ??
                  s.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
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
            selectedStaffId={selectedStaffId}
            onTapAssign={onTapAssign}
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
              selectedStaffId={selectedStaffId}
              onTapAssign={onTapAssign}
            />
          );
        })}
      </div>
    </div>
  );
}

interface CellDialogTarget {
  staffId: number;
  staffName: string;
  dateStr: string;
  activeAssignment?: RosterRow;
  isOffDay?: boolean;
}

function MonthlyTableCell({
  dateStr,
  staffId,
  staffName,
  activeAssignment,
  shiftCode,
  cfg,
  isOffDay,
  onDropShift,
  onDeleteRoster,
  canAssign,
  onLongPress
}: {
  dateStr: string;
  staffId: number;
  staffName: string;
  activeAssignment?: RosterRow;
  shiftCode?: string;
  cfg?: any;
  isOffDay?: boolean;
  onDropShift: (staffId: number, date: string, shiftId: number) => void;
  onDeleteRoster: (rosterId: number) => void;
  canAssign?: boolean;
  onLongPress?: (target: CellDialogTarget) => void;
}) {
  const [isOver, setIsOver] = React.useState(false);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const startPosRef = React.useRef<{ x: number; y: number } | null>(null);
  const isLongPressTriggeredRef = React.useRef(false);

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const openDialog = () => {
    if (!canAssign) return;
    onLongPress?.({
      staffId,
      staffName,
      dateStr,
      activeAssignment,
      isOffDay
    });
  };

  const triggerLongPress = () => {
    if (!canAssign) return;
    isLongPressTriggeredRef.current = true;
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      try {
        navigator.vibrate(40);
      } catch (_) {}
    }
    openDialog();
  };

  // Mobile Touch Long-Press Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!canAssign) return;
    const touch = e.touches[0];
    startPosRef.current = { x: touch.clientX, y: touch.clientY };
    isLongPressTriggeredRef.current = false;
    clearTimer();
    timerRef.current = setTimeout(triggerLongPress, 450);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!startPosRef.current || !timerRef.current) return;
    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - startPosRef.current.x);
    const dy = Math.abs(touch.clientY - startPosRef.current.y);
    if (dx > 8 || dy > 8) {
      clearTimer();
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    clearTimer();
    if (isLongPressTriggeredRef.current) {
      e.preventDefault();
    }
  };

  const handleTouchCancel = () => {
    clearTimer();
  };

  // Desktop Double-Click Handler
  const handleDoubleClick = (e: React.MouseEvent) => {
    if (!canAssign) return;
    e.preventDefault();
    openDialog();
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    if (isLongPressTriggeredRef.current) {
      e.preventDefault();
    }
  };

  React.useEffect(() => {
    return () => clearTimer();
  }, []);

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

  const cellProps = {
    onDragOver: handleDragOver,
    onDragLeave: handleDragLeave,
    onDrop: handleDrop,
    onDoubleClick: handleDoubleClick,
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
    onTouchCancel: handleTouchCancel,
    onContextMenu: handleContextMenu
  };

  if (activeAssignment && shiftCode && cfg) {
    return (
      <td
        {...cellProps}
        className={`p-0 border-l border-border relative group transition-colors select-none ${
          isOver ? "bg-primary/20" : ""
        } ${canAssign ? "cursor-pointer active:opacity-75" : ""}`}
      >
        <div
          className={`flex items-center justify-center w-full h-full min-h-9 font-bold text-[11px] ${cfg.bgClass} ${cfg.textColorClass}`}
          title={`${activeAssignment.shift}${canAssign ? " (Double-click to change)" : ""}`}
        >
          {shiftCode}
        </div>
        {canAssign && (
          <button
            onClick={() => onDeleteRoster(activeAssignment.id)}
            className="absolute inset-0 hidden sm:flex items-center justify-center w-full h-full opacity-0 group-hover:opacity-100 bg-destructive/80 text-destructive-foreground cursor-pointer transition-opacity"
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
        {...cellProps}
        className={`p-0 border-l border-border transition-colors select-none ${
          isOver ? "bg-primary/20" : ""
        } ${canAssign ? "cursor-pointer active:opacity-75" : ""}`}
      >
        <div
          className="flex items-center justify-center w-full h-full min-h-[36px] font-bold text-[10px] bg-amber-500/10 text-amber-700 dark:text-amber-400"
          title={`Scheduled Off Day${canAssign ? " (Double-click to assign shift)" : ""}`}
        >
          OFF
        </div>
      </td>
    );
  }

  return (
    <td
      {...cellProps}
      className={`p-0 border-l border-border transition-colors select-none ${
        isOver ? "bg-primary/20" : ""
      } ${canAssign ? "cursor-pointer active:opacity-75" : ""}`}
    >
      <div
        className="flex items-center justify-center w-full h-full min-h-[36px] bg-transparent text-muted-foreground/30"
        title={canAssign ? "Unassigned (Double-click to assign shift)" : "Unassigned"}
      >
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
  const [dialogTarget, setDialogTarget] = React.useState<CellDialogTarget | null>(null);

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
    <div className="flex flex-col gap-2">
      {canAssign && (
        <p className="text-[11px] text-muted-foreground/80 flex items-center gap-1.5 px-0.5 m-0">
          <Clock size={12} className="text-primary shrink-0" />
          <span className="hidden sm:inline">Tip: Double-click any cell to select and assign a shift</span>
          <span className="sm:hidden">Tip: Long-press any cell to select and assign a shift</span>
        </p>
      )}

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
                const isWeekend = dayOfWeekNum === 0;

                return (
                  <th
                    key={dateStr}
                    className={`px-1 py-1 text-center font-medium min-w-9 border-l border-border select-none ${
                      isWeekend ? "bg-amber-500/10 dark:bg-rose-800" : ""
                    }`}
                  >
                    <div
                      className={`text-[9px] font-bold uppercase ${
                        isWeekend ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground/70"
                      }`}
                    >
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
                        staffName={staff.name}
                        activeAssignment={activeAssignment}
                        shiftCode={shiftCode}
                        cfg={cfg}
                        isOffDay={staffIsOff}
                        onDropShift={onDropShift}
                        onDeleteRoster={onDeleteRoster}
                        canAssign={canAssign}
                        onLongPress={setDialogTarget}
                      />
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Mobile/Long-Press Shift Selection Dialog ── */}
      <Dialog
        open={Boolean(dialogTarget)}
        onOpenChange={(open) => !open && setDialogTarget(null)}
      >
        <DialogContent className="w-[92vw] max-w-sm sm:max-w-md max-h-[85vh] flex flex-col p-5 gap-3.5 rounded-2xl">
          <DialogHeader className="gap-1 pb-2 border-b border-border text-left">
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
              <Calendar size={18} className="text-primary shrink-0" />
              <span>Assign Shift</span>
            </DialogTitle>
            {dialogTarget && (
              <DialogDescription className="text-xs text-muted-foreground flex flex-col gap-0.5 mt-0.5">
                <span>
                  Staff: <strong className="text-foreground font-semibold">{dialogTarget.staffName}</strong>
                </span>
                <span>
                  Date:{" "}
                  <strong className="text-foreground font-semibold">
                    {new Date(dialogTarget.dateStr + "T00:00:00").toLocaleDateString("en-US", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                      year: "numeric"
                    })}
                  </strong>
                </span>
              </DialogDescription>
            )}
          </DialogHeader>

          {/* Current status / active assignment banner */}
          {dialogTarget?.activeAssignment && (
            <div className="p-2.5 rounded-xl bg-muted/40 border border-border flex items-center justify-between gap-2">
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                  Current Shift
                </span>
                <span className="text-xs font-bold text-foreground truncate">
                  {dialogTarget.activeAssignment.shift}
                </span>
              </div>
              {canAssign && (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    if (dialogTarget?.activeAssignment) {
                      onDeleteRoster(dialogTarget.activeAssignment.id);
                      setDialogTarget(null);
                    }
                  }}
                  className="h-7 px-2.5 text-xs flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  <Trash2 size={12} /> Remove
                </Button>
              )}
            </div>
          )}

          {dialogTarget?.isOffDay && !dialogTarget?.activeAssignment && (
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-2 text-amber-700 dark:text-amber-400 text-xs font-semibold">
              <Palmtree size={14} className="text-amber-500 shrink-0" />
              <span>Scheduled Weekly Off Day</span>
            </div>
          )}

          {/* Shifts List to select */}
          <div className="flex flex-col gap-1.5 overflow-y-auto max-h-[45vh] pr-0.5 scrollbar-thin">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-0.5">
              Select Shift
            </span>
            {shifts
              .filter((s) => s.active)
              .map((shift) => {
                const cfg = getShiftConfig(shift.name);
                const Icon = cfg.Icon;
                const isCurrent = dialogTarget?.activeAssignment?.shiftId === shift.id;
                const timeLabel =
                  shift.startTime && shift.endTime
                    ? `${shift.startTime.slice(0, 5)} - ${shift.endTime.slice(0, 5)}`
                    : null;

                return (
                  <button
                    key={shift.id}
                    type="button"
                    onClick={() => {
                      if (dialogTarget) {
                        onDropShift(dialogTarget.staffId, dialogTarget.dateStr, shift.id);
                        setDialogTarget(null);
                      }
                    }}
                    className={`w-full p-2.5 rounded-xl border flex items-center justify-between gap-2 transition-all cursor-pointer text-left select-none ${
                      isCurrent
                        ? `border-primary bg-primary/10 ring-1 ring-primary/40`
                        : `border-border bg-card hover:bg-muted/50 hover:border-border/80 active:scale-[0.99]`
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${cfg.bgClass} ${cfg.borderClass} ${cfg.textColorClass}`}
                      >
                        <Icon size={16} />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-bold text-foreground truncate">
                          {shift.name}
                        </span>
                        {timeLabel && (
                          <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                            <Clock size={10} className="opacity-60" /> {timeLabel}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${cfg.bgClass} ${cfg.borderClass} ${cfg.textColorClass}`}
                      >
                        {shift.code || shift.name.substring(0, 2).toUpperCase()}
                      </span>
                      {isCurrent && (
                        <Check size={15} className="text-primary shrink-0" />
                      )}
                    </div>
                  </button>
                );
              })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
