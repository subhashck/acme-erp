import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type ReportSort<Column extends string> = { column: Column; direction: "asc" | "desc" } | null;
const reportCollator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

export function sortReportRows<Row, Column extends string>(
  rows: Row[],
  sorting: ReportSort<Column>,
  values: Record<Column, (row: Row) => string | number>
) {
  if (!sorting) return rows;
  const getValue = values[sorting.column];
  return [...rows].sort((left, right) => {
    const a = getValue(left);
    const b = getValue(right);
    const comparison = typeof a === "number" && typeof b === "number"
      ? a - b
      : reportCollator.compare(String(a), String(b));
    return sorting.direction === "asc" ? comparison : -comparison;
  });
}

export function ReportSortHeader<Column extends string>({ column, label, sorting, onSort, align = "left" }: {
  column: Column;
  label: string;
  sorting: ReportSort<Column>;
  onSort: (column: Column) => void;
  align?: "left" | "center" | "right";
}) {
  const active = sorting?.column === column;
  const Icon = active ? (sorting.direction === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;
  return (
    <th scope="col" aria-sort={active ? (sorting.direction === "asc" ? "ascending" : "descending") : "none"}>
      <button
        type="button"
        className={cn("flex min-h-11 w-full items-center gap-1.5 whitespace-nowrap p-3 font-semibold hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring", align === "center" && "justify-center", align === "right" && "justify-end")}
        onClick={() => onSort(column)}
        aria-label={`Sort by ${label} ${active && sorting.direction === "asc" ? "descending" : "ascending"}`}
      >
        {label}<Icon className={cn("size-3 shrink-0", !active && "opacity-50")} aria-hidden="true" />
      </button>
    </th>
  );
}

