import * as React from "react";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import {
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

export type ColumnDef<T> =
  | [keyof T & string, string]
  | {
      id: string;
      label: string;
      render: (row: T) => React.ReactNode;
      sortKey?: keyof T & string;
      className?: string;
      headerClassName?: string;
    };


export interface DataTableProps<T> {
  rows: T[];
  columns: ColumnDef<T>[];
  lowStock?: boolean;
  enablePagination?: boolean;
  enableSorting?: boolean;
  enableFiltering?: boolean;
  filterPlaceholder?: string;
  defaultPageSize?: number;
}

export function DataTable<T extends Record<string, unknown>>({
  rows,
  columns,
  lowStock,
  enablePagination = false,
  enableSorting = false,
  enableFiltering = false,
  filterPlaceholder = "Search...",
  defaultPageSize = 10,
}: DataTableProps<T>) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [sortKey, setSortKey] = React.useState<string | null>(null);
  const [sortDirection, setSortDirection] = React.useState<"asc" | "desc" | null>(null);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(defaultPageSize);

  // Reset page when search query changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Handle header click for sorting
  const handleSort = (key: string) => {
    if (!enableSorting) return;
    if (sortKey === key) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else if (sortDirection === "desc") {
        setSortKey(null);
        setSortDirection(null);
      } else {
        setSortDirection("asc");
      }
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  // 1. Filtering
  const filteredRows = React.useMemo(() => {
    if (!enableFiltering || !searchQuery) return rows;
    const query = searchQuery.toLowerCase().trim();
    return rows.filter((row) => {
      return columns.some((col) => {
        let val: unknown;
        if (Array.isArray(col)) {
          val = row[col[0]];
        } else {
          const key = col.sortKey || col.id;
          if (key && key in row) {
            val = row[key];
          }
        }
        if (val === null || val === undefined || typeof val === "object") return false;
        return String(val).toLowerCase().includes(query);
      });
    });
  }, [rows, columns, enableFiltering, searchQuery]);

  // 2. Sorting
  const sortedRows = React.useMemo(() => {
    if (!enableSorting || !sortKey || !sortDirection) return filteredRows;

    return [...filteredRows].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];

      if (aVal === null || aVal === undefined) return sortDirection === "asc" ? 1 : -1;
      if (bVal === null || bVal === undefined) return sortDirection === "asc" ? -1 : 1;

      // Handle numbers
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
      }

      // Convert to strings for localeCompare
      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();

      return sortDirection === "asc"
        ? aStr.localeCompare(bStr)
        : bStr.localeCompare(aStr);
    });
  }, [filteredRows, enableSorting, sortKey, sortDirection]);

  // 3. Pagination
  const paginatedRows = React.useMemo(() => {
    if (!enablePagination) return sortedRows;
    const startIndex = (currentPage - 1) * pageSize;
    return sortedRows.slice(startIndex, startIndex + pageSize);
  }, [sortedRows, enablePagination, currentPage, pageSize]);

  const totalPages = Math.ceil(sortedRows.length / pageSize);
  const startRowIndex = sortedRows.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endRowIndex = Math.min(currentPage * pageSize, sortedRows.length);

  return (
    <div className="flex flex-col gap-4">
      {enableFiltering && (
        <div className="relative px-4 pt-4 flex items-center max-w-sm">
          <Search className="absolute left-7  h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={filterPlaceholder} 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full md:min-w-[720px] text-sm">
          <thead>
            <tr className="border-b bg-muted/45 text-left text-xs uppercase text-muted-foreground">
              {columns.map((col) => {
                const label = Array.isArray(col) ? col[1] : col.label;
                const colKey = Array.isArray(col) ? col[0] : (col.sortKey || col.id);
                const isSortable = enableSorting && colKey && colKey !== "actions";

                return (
                  <th
                    key={label}
                    onClick={() => isSortable && handleSort(colKey)}
                    className={`px-4 py-3 font-semibold ${
                      isSortable ? "cursor-pointer select-none hover:bg-muted/70 transition-colors" : ""
                    } ${!Array.isArray(col) && col.headerClassName ? col.headerClassName : ""}`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>{label}</span>
                      {isSortable && (
                        <span className="text-muted-foreground/60">
                          {sortKey === colKey ? (
                            sortDirection === "asc" ? (
                              <ArrowUp className="h-3.5 w-3.5 text-primary" />
                            ) : (
                              <ArrowDown className="h-3.5 w-3.5 text-primary" />
                            )
                          ) : (
                            <ArrowUpDown className="h-3.5 w-3.5 hover:text-foreground transition-colors" />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {paginatedRows.map((row, index) => (
              <tr key={String(row.id ?? index)} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                {columns.map((col) => {
                  if (!Array.isArray(col)) {
                    return (
                      <td key={col.id} className={`px-4 py-3 ${col.className || ""}`}>
                        {col.render(row)}
                      </td>
                    );
                  }
                  const [key] = col;
                  const value = row[key];
                  const isStatus = key.toLowerCase().includes("status");
                  const isLow = lowStock && key === "quantity" && Number(value) <= Number(row.reorderLevel);
                  return (
                    <td key={key} className="px-4 py-3">
                      {isStatus || isLow ? (
                        <Badge variant={isLow ? "destructive" : "default"}>
                          {String(value)}
                        </Badge>
                      ) : (
                        String(value ?? "")
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
            {!paginatedRows.length && (
              <tr>
                <td className="px-4 py-8 text-center text-muted-foreground" colSpan={columns.length}>
                  No records yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {enablePagination && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 pb-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>Show</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="h-8 rounded-md border border-input bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {[5, 10, 20, 50, 100].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
            <span>entries</span>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            <span>
              Showing {startRowIndex} to {endRowIndex} of {sortedRows.length} entries
            </span>

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="px-2 text-xs font-medium">
                Page {currentPage} of {totalPages || 1}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages || totalPages === 0}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages || totalPages === 0}
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
