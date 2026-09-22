import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ModuleLayout } from "@/components/ModuleLayout";
import { useRpcQuery, queryClient } from "@/lib/query";
import { client } from "@/services/rpc";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import * as React from "react";
import {
  Plus, Search, Edit, Trash2, Loader2, RefreshCw, Eye, Filter, X, Calendar as CalendarIcon
} from "lucide-react";
import { Button } from "@/ui/button";
import { Badge } from "@/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/utils/cn";
import { toNum } from "@/utils/math";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { DataTable, type ColumnDef } from "@/components/DataTable";

const grnsSearchSchema = z.object({
  page: z.number().optional().catch(1),
  limit: z.number().optional().catch(10),
  status: z.string().optional().catch(""),
  grnNo: z.string().optional().catch(""),
  dateFrom: z.string().optional().catch(""),
  dateTo: z.string().optional().catch(""),
  vendorId: z.string().optional().catch(""),
  poNo: z.string().optional().catch(""),
});

export const Route = createFileRoute("/_authenticated/purchases/grns/")({
  validateSearch: (search) => grnsSearchSchema.parse(search),
  component: GRNsList,
});

function GRNsList() {
  const searchParams = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const [showFilters, setShowFilters] = React.useState(false);

  const hasActiveFilters = !!(
    searchParams.grnNo ||
    searchParams.status ||
    searchParams.vendorId ||
    searchParams.poNo ||
    searchParams.dateFrom ||
    searchParams.dateTo
  );

  const { data, isLoading, refetch, isRefetching } = useRpcQuery<any>(
    ["grns", searchParams],
    () => (client.grns as any).$get({
      query: {
        status: searchParams.status || undefined,
        grnNo: searchParams.grnNo || undefined,
        dateFrom: searchParams.dateFrom || undefined,
        dateTo: searchParams.dateTo || undefined,
        vendorId: searchParams.vendorId || undefined,
        poNo: searchParams.poNo || undefined,
      }
    })
  );

  const { data: vendors = [] } = useRpcQuery(["vendors"], () => client.vendors.$get());

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await (client.grns as any)[":grnId"].$delete({
        param: { grnId: String(id) },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to cancel GRN");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("GRN cancelled successfully");
      queryClient.invalidateQueries({ queryKey: ["grns"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to cancel GRN");
    },
  });

  const handleDelete = (id: number) => {
    if (window.confirm("Are you sure you want to cancel this draft GRN? This action cannot be undone.")) {
      deleteMutation.mutate(id);
    }
  };

  const grnsList = data?.data || [];

  const columns: ColumnDef<any>[] = [
    {
      id: "grnNo",
      label: "GRN No",
      render: (row) => <span className="font-semibold text-foreground">{row.grnNo}</span>,
      sortKey: "grnNo"
    },
    {
      id: "grnDate",
      label: "Date",
      render: (row) => format(new Date(row.grnDate), "dd MMM yyyy"),
      sortKey: "grnDate"
    },
    {
      id: "vendorName",
      label: "Vendor",
      render: (row) => row.vendor?.name || "N/A"
    },
    {
      id: "poNo",
      label: "Reference PO",
      render: (row) => row.purchaseOrder ? (
        <Link to="/purchases/purchase-orders/$id" params={{ id: String(row.poId) }} className="text-primary hover:underline font-semibold">
          {row.purchaseOrder.poNo}
        </Link>
      ) : (
        <span className="text-muted-foreground italic">Direct</span>
      )
    },
    {
      id: "status",
      label: "Status",
      render: (row) => (
        <Badge 
          variant="default"
          className={cn(row.status === "draft" && "bg-muted text-foreground hover:bg-muted font-bold")}
        >
          {row.status.toUpperCase()}
        </Badge>
      ),
      sortKey: "status"
    },
    {
      id: "actions",
      label: "Actions",
      className: "text-right",
      headerClassName: "text-right",
      render: (row) => (
        <div className="flex justify-end gap-2">
          <Link to="/purchases/grns/$grnId/edit" params={{ grnId: String(row.id) }}>
            <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
              {row.status === "draft" ? <Edit className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </Link>
          {row.status === "draft" && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => handleDelete(row.id)}
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      )
    }
  ];

  return (
    <ModuleLayout
      title="Goods Receipt Notes (GRN)"
      description="Manage standalone and PO-linked Goods Receipt Notes"
      action={
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowFilters(true)}>
            <Filter className={cn("h-4 w-4 mr-1", hasActiveFilters && "text-primary fill-primary/10")} /> Filters {hasActiveFilters && <Badge variant="default" className="ml-1 px-1 h-4 bg-primary/10 text-primary border-primary/20">Active</Badge>}
          </Button>
          <Link to="/purchases/grns/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Create Direct GRN
            </Button>
          </Link>
        </div>
      }
    >
      <div className="space-y-4">
        <Card className="border border-border shadow-xs bg-white/70 dark:bg-slate-900/40 backdrop-blur p-0">
          <CardContent className="p-0">
            <DataTable
              rows={grnsList}
              columns={columns}
              enablePagination
              enableSorting
              isLoading={isLoading}
            />
          </CardContent>
        </Card>
      </div>

      {/* Filters Left-side Panel */}
      {showFilters && (
        <>
          <div
            onClick={() => setShowFilters(false)}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
          />
          <div
            className="fixed inset-y-0 left-0 z-50 w-full sm:w-96 bg-background border-r border-border shadow-2xl flex flex-col animate-in slide-in-from-left duration-300"
          >
            <div className="p-6 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="text-primary" size={18} />
                <h3 className="font-semibold text-lg text-foreground">Filters</h3>
              </div>
              <button
                onClick={() => setShowFilters(false)}
                className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-muted transition-colors cursor-pointer animate-in duration-100"
                type="button"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="space-y-2">
                <Label className="text-xs">GRN No</Label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search GRN No..."
                    className="pl-9 h-9 text-sm"
                    value={searchParams.grnNo || ""}
                    onChange={(e) => navigate({ search: (prev) => ({ ...prev, grnNo: e.target.value, page: 1 }) })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Status</Label>
                <select
                  className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  value={searchParams.status || ""}
                  onChange={(e) => navigate({ search: (prev) => ({ ...prev, status: e.target.value, page: 1 }) })}
                >
                  <option value="">All Statuses</option>
                  <option value="draft">Draft</option>
                  <option value="posted">Posted</option>
                  <option value="correction">Correction</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Vendor</Label>
                <select
                  className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  value={searchParams.vendorId || ""}
                  onChange={(e) => navigate({ search: (prev) => ({ ...prev, vendorId: e.target.value, page: 1 }) })}
                >
                  <option value="">All Vendors</option>
                  {(vendors as any[]).map((v) => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">PO No</Label>
                <Input
                  type="text"
                  placeholder="Reference PO..."
                  className="h-9 text-sm"
                  value={searchParams.poNo || ""}
                  onChange={(e) => navigate({ search: (prev) => ({ ...prev, poNo: e.target.value, page: 1 }) })}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Date From</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal h-9 px-3", !searchParams.dateFrom && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {searchParams.dateFrom ? format(new Date(searchParams.dateFrom), "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      captionLayout="dropdown"
                      startMonth={new Date(new Date().getFullYear() - 10, 0)}
                      endMonth={new Date(new Date().getFullYear() + 10, 11)}
                      selected={searchParams.dateFrom ? new Date(searchParams.dateFrom) : undefined}
                      onSelect={(date) => navigate({ search: (prev: any) => ({ ...prev, dateFrom: date ? format(date, "yyyy-MM-dd") : undefined, page: 1 }) })}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Date To</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal h-9 px-3", !searchParams.dateTo && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {searchParams.dateTo ? format(new Date(searchParams.dateTo), "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      captionLayout="dropdown"
                      startMonth={new Date(new Date().getFullYear() - 10, 0)}
                      endMonth={new Date(new Date().getFullYear() + 10, 11)}
                      selected={searchParams.dateTo ? new Date(searchParams.dateTo) : undefined}
                      onSelect={(date) => navigate({ search: (prev: any) => ({ ...prev, dateTo: date ? format(date, "yyyy-MM-dd") : undefined, page: 1 }) })}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <Button
                variant="outline"
                className="w-full text-xs"
                onClick={() => {
                  navigate({ search: {} });
                  setShowFilters(false);
                }}
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </>
      )}
    </ModuleLayout>
  );
};
