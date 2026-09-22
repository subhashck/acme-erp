import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ModuleLayout } from "@/components/ModuleLayout";
import { useRpcQuery, queryClient } from "@/lib/query";
import { client } from "@/services/rpc";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/ui/card";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Textarea } from "@/ui/textarea";
import { Field } from "@/components/Field";
import { Autocomplete } from "@/ui/autocomplete";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { 
  FileCheck2, 
  Plus, 
  Trash2, 
  Loader2, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Warehouse,
  Truck,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  X
} from "lucide-react";
import * as React from "react";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/ui/badge";
import { cn } from "@/utils/cn";
import { ColumnDef } from "@/components/DataTable";

const reqItemSchema = z.object({
  itemId: z.coerce.number().positive("Item is required"),
  requestedQty: z.coerce.number().positive("Qty must be > 0"),
  unit: z.string().min(1, "Unit is required"),
});

const reqFormSchema = z
  .object({
    requestingStoreId: z.coerce.number().positive("Requesting store is required"),
    fulfillingStoreId: z.coerce.number().positive("Fulfilling store is required"),
    priority: z.enum(["normal", "urgent", "emergency"]).default("normal"),
    remarks: z.string().optional().nullable(),
    items: z.array(reqItemSchema).min(1, "At least one item is required"),
  })
  .refine((data) => data.requestingStoreId !== data.fulfillingStoreId, {
    message: "Requesting and fulfilling stores cannot be identical",
    path: ["fulfillingStoreId"],
  });

type ReqFormValues = z.infer<typeof reqFormSchema>;

const requisitionsSearchSchema = z.object({
  page: z.coerce.number().optional().catch(1),
  limit: z.coerce.number().optional().catch(20),
  search: z.string().optional().catch(""),
  status: z.string().optional().catch("all"),
  priority: z.string().optional().catch("all"),
  requestingStoreId: z.string().optional().catch("all"),
  fulfillingStoreId: z.string().optional().catch("all"),
});

export const Route = createFileRoute("/_authenticated/inventory/requisitions/")({
  validateSearch: (search) => requisitionsSearchSchema.parse(search),
  component: RequisitionsList,
});

function RequisitionsList() {
  const searchParams = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const [localSearch, setLocalSearch] = React.useState(searchParams.search || "");
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [selectedReq, setSelectedReq] = React.useState<any | null>(null);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== (searchParams.search || "")) {
        navigate({
          search: (prev: any) => ({
            ...prev,
            search: localSearch || undefined,
            page: 1,
          }),
        });
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [localSearch, searchParams.search, navigate]);

  const { data: reqsResponse, isLoading, refetch, isRefetching } = useRpcQuery<any>(
    ["inventory-requisitions", searchParams],
    () =>
      client.inventory.requisitions.$get({
        query: {
          page: String(searchParams.page || 1),
          limit: String(searchParams.limit || 20),
          search: searchParams.search || undefined,
          status: searchParams.status !== "all" ? searchParams.status : undefined,
          priority: searchParams.priority !== "all" ? searchParams.priority : undefined,
          requestingStoreId: searchParams.requestingStoreId !== "all" ? searchParams.requestingStoreId : undefined,
          fulfillingStoreId: searchParams.fulfillingStoreId !== "all" ? searchParams.fulfillingStoreId : undefined,
        },
      })
  );

  const { data: storesList = [] } = useRpcQuery<any[]>(
    ["inventory-stores"],
    () => client.inventory.stores.$get()
  );

  const { data: itemsList = [] } = useRpcQuery<any[]>(
    ["items"],
    () => client.items.$get()
  );

  const { data: unitTypes = [] } = useRpcQuery<any[]>(
    ["unit-types"],
    () => client["unit-types"].$get()
  );

  const itemOptions: [string, string][] = React.useMemo(() => {
    return (itemsList as any[]).map((item: any) => [
      String(item.id),
      item.name + (item.unit ? ` (${item.unit})` : ""),
    ]);
  }, [itemsList]);

  const reqsData = reqsResponse?.data || [];
  const pagination = reqsResponse?.pagination || { page: 1, pageSize: 20, totalRecords: 0, totalPages: 1 };
  const startRecord = pagination.totalRecords === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1;
  const endRecord = Math.min(pagination.page * pagination.pageSize, pagination.totalRecords);
  const hasActiveFilters = Boolean(
    searchParams.search ||
    (searchParams.status && searchParams.status !== "all") ||
    (searchParams.priority && searchParams.priority !== "all") ||
    (searchParams.requestingStoreId && searchParams.requestingStoreId !== "all") ||
    (searchParams.fulfillingStoreId && searchParams.fulfillingStoreId !== "all")
  );

  const form = useForm<ReqFormValues>({
    resolver: zodResolver(reqFormSchema) as any,
    defaultValues: {
      requestingStoreId: 0,
      fulfillingStoreId: 0,
      priority: "normal",
      remarks: "",
      items: [{ itemId: 0, requestedQty: 1, unit: "Box" }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  React.useEffect(() => {
    if (dialogOpen && storesList.length > 0) {
      const defaultFul = storesList.find((s: any) => s.isDefault)?.id || storesList[0]?.id || 0;
      const defaultReq = storesList.find((s: any) => s.id !== defaultFul)?.id || storesList[0]?.id || 0;
      const defaultUnit = unitTypes[0]?.symbol || "Box";
      form.reset({
        requestingStoreId: defaultReq,
        fulfillingStoreId: defaultFul,
        priority: "normal",
        remarks: "",
        items: [{ itemId: 0, requestedQty: 1, unit: defaultUnit }],
      });
    }
  }, [dialogOpen, storesList, unitTypes]);

  const createMutation = useMutation({
    mutationFn: async (values: ReqFormValues) => {
      const payload = {
        ...values,
        requestingStoreId: Number(values.requestingStoreId),
        fulfillingStoreId: Number(values.fulfillingStoreId),
        items: values.items.map((it) => {
          const matchedUnit = unitTypes.find(
            (u: any) => u.symbol === it.unit || u.name === it.unit
          );
          return {
            itemId: Number(it.itemId),
            requestedQty: Number(it.requestedQty),
            unit: it.unit,
            unitId: matchedUnit?.id ? Number(matchedUnit.id) : undefined,
          };
        }),
      };
      const res = await client.inventory.requisitions.$post({
        json: payload,
      });
      if (!res.ok) {
        const err: any = await res.json().catch(() => ({}));
        throw new Error(err.error || err.message || "Failed to create requisition");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Store requisition submitted successfully");
      queryClient.invalidateQueries({ queryKey: ["inventory-requisitions"] });
      setDialogOpen(false);
      form.reset();
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await (client.inventory.requisitions as any)[":id"].approve.$patch({
        param: { id: String(id) },
        json: {
          items: selectedReq?.items?.map((item: any) => ({
            id: item.id,
            approvedQty: Number(item.requestedQty),
          })) || [],
        },
      });
      if (!res.ok) {
        const err: any = await res.json();
        throw new Error(err.error || "Failed to approve requisition");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Requisition approved successfully");
      queryClient.invalidateQueries({ queryKey: ["inventory-requisitions"] });
      setSelectedReq(null);
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await (client.inventory.requisitions as any)[":id"].reject.$patch({
        param: { id: String(id) },
        json: { remarks: "Rejected by store manager" },
      });
      if (!res.ok) {
        const err: any = await res.json();
        throw new Error(err.error || "Failed to reject requisition");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Requisition rejected");
      queryClient.invalidateQueries({ queryKey: ["inventory-requisitions"] });
      setSelectedReq(null);
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Approved</Badge>;
      case "submitted":
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Submitted</Badge>;
      case "partially_fulfilled":
        return <Badge className="bg-amber-100 text-amber-800 border-amber-200">Partially Fulfilled</Badge>;
      case "fulfilled":
        return <Badge className="bg-purple-100 text-purple-800 border-purple-200">Fulfilled</Badge>;
      case "rejected":
        return <Badge className="bg-red-100 text-red-800 border-red-200">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const columns: ColumnDef<Record<string, unknown>>[] = [
    {
      id: "requisitionNo",
      label: "Indent No",
      render: (row) => (
        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
          {String(row.requisitionNo || "")}
        </span>
      ),
    },
    {
      id: "requestingStore",
      label: "Requesting Store",
      render: (row: any) => (
        <div className="flex items-center gap-1.5 font-medium text-slate-900 dark:text-slate-100">
          <Warehouse className="w-3.5 h-3.5 text-slate-400" />
          {row.requestingStore?.name || "N/A"}
        </div>
      ),
    },
    {
      id: "fulfillingStore",
      label: "Fulfilling Store",
      render: (row: any) => (
        <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
          <Warehouse className="w-3.5 h-3.5 text-slate-400" />
          {row.fulfillingStore?.name || "Central Warehouse"}
        </div>
      ),
    },
    {
      id: "priority",
      label: "Priority",
      render: (row) => {
        const prio = String(row.priority || "normal");
        return (
          <Badge
            className={cn(
              prio === "emergency"
                ? "bg-red-600 text-white"
                : prio === "urgent"
                ? "bg-amber-500 text-white"
                : "bg-slate-100 text-slate-700"
            )}
          >
            {prio.toUpperCase()}
          </Badge>
        );
      },
    },
    {
      id: "status",
      label: "Status",
      render: (row) => getStatusBadge(String(row.status || "")),
    },
    {
      id: "actions",
      label: "Actions",
      render: (row: any) => (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedReq(row)}
          >
            View Detail
          </Button>
          {(row.status === "approved" || row.status === "partially_fulfilled") && (
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => {
                navigate({
                  to: "/inventory/transfers",
                  search: (prev: any) => ({ ...prev, requisitionId: row.id }),
                });
              }}
            >
              <Truck className="w-3.5 h-3.5 mr-1" />
              Fulfill
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <ModuleLayout
      title="Store Requisitions (Indents)"
      description="Internal stock requirement requests between wards, dispensaries, and central warehouse"
      action={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
          >
            <RefreshCw className={cn("w-4 h-4 mr-2", isRefetching && "animate-spin")} />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => setDialogOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            New Indent Request
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Search & Filter Toolbar */}
        <Card className="shadow-xs border-slate-200/80">
          <CardContent className="p-4 space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-[240px]">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground pointer-events-none" />
                  <Input
                    type="text"
                    value={localSearch}
                    onChange={(e) => setLocalSearch(e.target.value)}
                    placeholder="Search by indent no or remarks..."
                    className="pl-9 h-9 text-xs"
                  />
                  {localSearch && (
                    <button
                      type="button"
                      onClick={() => {
                        setLocalSearch("");
                        navigate({
                          search: (prev: any) => ({ ...prev, search: undefined, page: 1 }),
                        });
                      }}
                      className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="w-[150px]">
                <Select
                  value={searchParams.status || "all"}
                  onValueChange={(val) =>
                    navigate({
                      search: (prev: any) => ({
                        ...prev,
                        status: val !== "all" ? val : undefined,
                        page: 1,
                      }),
                    })
                  }
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="submitted">Submitted</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="partially_fulfilled">Partially Fulfilled</SelectItem>
                    <SelectItem value="fulfilled">Fulfilled</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="w-[140px]">
                <Select
                  value={searchParams.priority || "all"}
                  onValueChange={(val) =>
                    navigate({
                      search: (prev: any) => ({
                        ...prev,
                        priority: val !== "all" ? val : undefined,
                        page: 1,
                      }),
                    })
                  }
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="All Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priority</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="emergency">Emergency</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="w-[180px]">
                <Select
                  value={searchParams.requestingStoreId || "all"}
                  onValueChange={(val) =>
                    navigate({
                      search: (prev: any) => ({
                        ...prev,
                        requestingStoreId: val !== "all" ? val : undefined,
                        page: 1,
                      }),
                    })
                  }
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Requesting Store" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Requesting Stores</SelectItem>
                    {storesList.map((s: any) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.name} ({s.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="w-[180px]">
                <Select
                  value={searchParams.fulfillingStoreId || "all"}
                  onValueChange={(val) =>
                    navigate({
                      search: (prev: any) => ({
                        ...prev,
                        fulfillingStoreId: val !== "all" ? val : undefined,
                        page: 1,
                      }),
                    })
                  }
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Fulfilling Store" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Fulfilling Stores</SelectItem>
                    {storesList.map((s: any) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.name} ({s.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="w-[110px]">
                <Select
                  value={String(searchParams.limit || 20)}
                  onValueChange={(val) =>
                    navigate({
                      search: (prev: any) => ({
                        ...prev,
                        limit: Number(val),
                        page: 1,
                      }),
                    })
                  }
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Page Size" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10 / page</SelectItem>
                    <SelectItem value="20">20 / page</SelectItem>
                    <SelectItem value="50">50 / page</SelectItem>
                    <SelectItem value="100">100 / page</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {hasActiveFilters && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setLocalSearch("");
                    navigate({
                      search: (prev: any) => ({
                        ...prev,
                        page: 1,
                        limit: 20,
                        search: undefined,
                        status: "all",
                        priority: "all",
                        requestingStoreId: "all",
                        fulfillingStoreId: "all",
                      }),
                    });
                  }}
                  className="h-9 text-xs text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5 mr-1" />
                  Reset Filters
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Data Table */}
        <Card className="shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/40 text-muted-foreground uppercase text-[11px] font-semibold tracking-wider border-b">
                <tr>
                  <th className="px-4 py-3">Indent No</th>
                  <th className="px-4 py-3">Requesting Store</th>
                  <th className="px-4 py-3">Fulfilling Store</th>
                  <th className="px-4 py-3 text-center">Items</th>
                  <th className="px-4 py-3 text-center">Priority</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin text-primary" />
                        <span>Loading requisitions...</span>
                      </div>
                    </td>
                  </tr>
                ) : reqsData.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                      <FileCheck2 className="w-10 h-10 mx-auto mb-2 opacity-30" />
                      <p className="font-semibold text-foreground">No store requisitions found</p>
                      <p className="text-[11px] mt-0.5">
                        {hasActiveFilters ? "Try clearing search or filters" : "Create a new indent request to get started"}
                      </p>
                    </td>
                  </tr>
                ) : (
                  reqsData.map((row: any) => {
                    const prio = String(row.priority || "normal");
                    return (
                      <tr key={row.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-foreground">
                          {row.requisitionNo}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 font-medium text-foreground">
                            <Warehouse className="w-3.5 h-3.5 text-muted-foreground" />
                            {row.requestingStore?.name || "N/A"}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <Warehouse className="w-3.5 h-3.5 text-muted-foreground" />
                            {row.fulfillingStore?.name || "Central Warehouse"}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center font-mono">
                          {row.items?.length || 0}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge
                            className={cn(
                              prio === "emergency"
                                ? "bg-red-600 text-white"
                                : prio === "urgent"
                                ? "bg-amber-500 text-white"
                                : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                            )}
                          >
                            {prio.toUpperCase()}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {getStatusBadge(String(row.status || ""))}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs px-2.5"
                              onClick={() => setSelectedReq(row)}
                            >
                              View Detail
                            </Button>
                            {(row.status === "approved" || row.status === "partially_fulfilled") && (
                              <Button
                                size="sm"
                                className="h-7 text-xs px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                                onClick={() => {
                                  navigate({
                                    to: "/inventory/transfers",
                                    search: (prev: any) => ({ ...prev, requisitionId: row.id }),
                                  });
                                }}
                              >
                                <Truck className="w-3.5 h-3.5 mr-1" />
                                Fulfill
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Server-Side Pagination Footer */}
          {!isLoading && pagination.totalRecords > 0 && (
            <div className="px-4 py-3 border-t flex flex-wrap items-center justify-between gap-3 bg-muted/10 text-xs">
              <div className="text-muted-foreground">
                Showing <strong className="text-foreground font-semibold">{startRecord}</strong> to{" "}
                <strong className="text-foreground font-semibold">{endRecord}</strong> of{" "}
                <strong className="text-foreground font-semibold">{pagination.totalRecords}</strong> requisitions
              </div>

              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() =>
                    navigate({
                      search: (prev: any) => ({ ...prev, page: 1 }),
                    })
                  }
                  className="h-8 px-2"
                  title="First Page"
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() =>
                    navigate({
                      search: (prev: any) => ({ ...prev, page: pagination.page - 1 }),
                    })
                  }
                  className="h-8 px-2"
                  title="Previous Page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <div className="px-2 font-medium">
                  Page {pagination.page} of {pagination.totalPages}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() =>
                    navigate({
                      search: (prev: any) => ({ ...prev, page: pagination.page + 1 }),
                    })
                  }
                  className="h-8 px-2"
                  title="Next Page"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() =>
                    navigate({
                      search: (prev: any) => ({ ...prev, page: pagination.totalPages }),
                    })
                  }
                  className="h-8 px-2"
                  title="Last Page"
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* New Requisition Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[650px]">
          <DialogHeader>
            <DialogTitle>New Store Indent Requisition</DialogTitle>
            <DialogDescription>
              Submit an internal request for stock transfer from Central Warehouse.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={form.handleSubmit((v) => createMutation.mutate(v))} className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <Controller
                control={form.control}
                name="requestingStoreId"
                render={({ field }) => (
                  <Field label="Requesting Store *" error={form.formState.errors.requestingStoreId?.message}>
                    <Select
                      value={field.value ? String(field.value) : ""}
                      onValueChange={(val) => field.onChange(val ? Number(val) : 0)}
                    >
                      <SelectTrigger className="w-full bg-background">
                        <SelectValue placeholder="Select Store" />
                      </SelectTrigger>
                      <SelectContent>
                        {storesList.map((store: any) => (
                          <SelectItem key={store.id} value={String(store.id)}>
                            {store.name} ({store.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                )}
              />

              <Controller
                control={form.control}
                name="fulfillingStoreId"
                render={({ field }) => (
                  <Field label="Fulfilling Store *" error={form.formState.errors.fulfillingStoreId?.message}>
                    <Select
                      value={field.value ? String(field.value) : ""}
                      onValueChange={(val) => field.onChange(val ? Number(val) : 0)}
                    >
                      <SelectTrigger className="w-full bg-background">
                        <SelectValue placeholder="Select Store" />
                      </SelectTrigger>
                      <SelectContent>
                        {storesList.map((store: any) => (
                          <SelectItem key={store.id} value={String(store.id)}>
                            {store.name} ({store.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                )}
              />
            </div>

            <Controller
              control={form.control}
              name="priority"
              render={({ field }) => (
                <Field label="Priority *" error={form.formState.errors.priority?.message}>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full bg-background">
                      <SelectValue placeholder="Select Priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                      <SelectItem value="emergency">Emergency / Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              )}
            />

            <div className="space-y-3 pt-2 border-t">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">Requested Items</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const defaultUnit = unitTypes[0]?.symbol || "Box";
                    append({ itemId: 0, requestedQty: 1, unit: defaultUnit });
                  }}
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Item
                </Button>
              </div>

              {fields.map((field, index) => {
                const currentItemId = form.watch(`items.${index}.itemId`);
                const selectedItem = itemsList.find((i: any) => i.id === Number(currentItemId));

                const unitsSet = new Set<string>();
                const currentUnit = form.watch(`items.${index}.unit`);
                if (currentUnit) unitsSet.add(currentUnit);
                if (selectedItem?.unit) unitsSet.add(selectedItem.unit);
                if (selectedItem?.purchaseUnit) unitsSet.add(selectedItem.purchaseUnit);
                if (selectedItem?.saleUnit) unitsSet.add(selectedItem.saleUnit);
                if (selectedItem?.unitPrices && Array.isArray(selectedItem.unitPrices)) {
                  selectedItem.unitPrices.forEach((up: any) => {
                    if (up.unit) unitsSet.add(up.unit);
                  });
                }
                (unitTypes as any[]).forEach((ut: any) => {
                  const u = ut.symbol || ut.name;
                  if (u) unitsSet.add(u);
                });
                const unitOptionsList = Array.from(unitsSet);

                return (
                  <div key={field.id} className="flex items-start gap-3 bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-md border border-slate-200 dark:border-slate-800">
                    <div className="flex-1">
                      <Controller
                        control={form.control}
                        name={`items.${index}.itemId`}
                        render={({ field: itemField, fieldState }) => (
                          <Autocomplete
                            placeholder="Search item..."
                            value={itemField.value ? String(itemField.value) : ""}
                            options={itemOptions}
                            onChange={(val) => {
                              const selectedId = Number(val) || 0;
                              itemField.onChange(selectedId);
                              const found = itemsList.find((i: any) => i.id === selectedId);
                              if (found) {
                                const defaultUnit = found.unit || found.purchaseUnit || found.saleUnit || (unitTypes[0]?.symbol ?? "Box");
                                if (defaultUnit) {
                                  form.setValue(`items.${index}.unit`, defaultUnit);
                                }
                              }
                            }}
                            error={fieldState.error?.message}
                          />
                        )}
                      />
                    </div>

                    <div className="w-24">
                      <Input
                        type="number"
                        step="0.001"
                        placeholder="Qty"
                        {...form.register(`items.${index}.requestedQty`)}
                        className="h-9 text-xs font-mono"
                      />
                      {form.formState.errors.items?.[index]?.requestedQty && (
                        <p className="text-[11px] text-red-500 mt-1">
                          {form.formState.errors.items[index]?.requestedQty?.message}
                        </p>
                      )}
                    </div>

                    <div className="w-28">
                      <Controller
                        control={form.control}
                        name={`items.${index}.unit`}
                        render={({ field: unitField, fieldState }) => (
                          <div>
                            <Select
                              value={unitField.value || ""}
                              onValueChange={unitField.onChange}
                            >
                              <SelectTrigger className="w-full bg-background h-9 text-xs">
                                <SelectValue placeholder="Unit" />
                              </SelectTrigger>
                              <SelectContent>
                                {unitOptionsList.map((u) => (
                                  <SelectItem key={u} value={u}>
                                    {u}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {fieldState.error && (
                              <p className="text-[11px] text-red-500 mt-1">
                                {fieldState.error.message}
                              </p>
                            )}
                          </div>
                        )}
                      />
                    </div>

                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-9 px-2 text-muted-foreground hover:text-red-500 mt-0"
                        onClick={() => remove(index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>

            <Field label="Remarks / Purpose" error={form.formState.errors.remarks?.message}>
              <Textarea
                {...form.register("remarks")}
                rows={2}
                placeholder="Reason for requisition..."
              />
            </Field>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Submit Requisition
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Detail & Approve Dialog */}
      {selectedReq && (
        <Dialog open={!!selectedReq} onOpenChange={() => setSelectedReq(null)}>
          <DialogContent className="sm:max-w-160">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between mr-10">
                <span>Indent #{selectedReq.requisitionNo}</span>
                {getStatusBadge(selectedReq.status)}
              </DialogTitle>
              <DialogDescription>
                Requesting: <strong>{selectedReq.requestingStore?.name}</strong> $\rightarrow$ Fulfilling: <strong>{selectedReq.fulfillingStore?.name}</strong>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="border rounded-md divide-y overflow-hidden">
                <div className="bg-muted/50 px-4 py-2 font-semibold text-xs grid grid-cols-6 text-muted-foreground">
                  <span className="col-span-2">Item Name</span>
                  <span className="text-center">Unit</span>
                  <span className="text-right">Requested</span>
                  <span className="text-right">Approved</span>
                  <span className="text-right">Fulfilled</span>
                </div>
                {selectedReq.items?.map((item: any) => {
                  const unitSymbol =
                    item.unit?.symbol ||
                    item.unit?.name ||
                    (typeof item.unit === "string" ? item.unit : "") ||
                    item.item?.unit ||
                    item.item?.purchaseUnit ||
                    "unit";

                  const reqQty = Number(item.requestedQty || 0);
                  const appQty = Number(item.approvedQty ?? item.requestedQty ?? 0);
                  const fulQty = Number(item.fulfilledQty || 0);

                  return (
                    <div key={item.id} className="px-4 py-2.5 text-xs grid grid-cols-6 items-center">
                      <span className="col-span-2 font-medium text-slate-900 dark:text-slate-100">
                        {item.item?.name || `Item #${item.itemId}`}
                      </span>
                      <div className="text-center">
                        <Badge variant="outline" className="text-[11px] font-mono py-0 px-2 bg-slate-50 dark:bg-slate-900">
                          {unitSymbol}
                        </Badge>
                      </div>
                      <span className="text-right font-mono text-slate-700 dark:text-slate-300">
                        {reqQty} <span className="text-muted-foreground text-[10px]">{unitSymbol}</span>
                      </span>
                      <span className="text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {appQty} <span className="text-emerald-600/70 text-[10px]">{unitSymbol}</span>
                      </span>
                      <span className="text-right font-mono font-bold text-blue-600 dark:text-blue-400">
                        {fulQty} <span className="text-blue-600/70 text-[10px]">{unitSymbol}</span>
                      </span>
                    </div>
                  );
                })}
              </div>

              {selectedReq.remarks && (
                <div className="bg-muted/30 border p-3 rounded-md text-xs">
                  <strong className="text-slate-700 dark:text-slate-300">Remarks:</strong> {selectedReq.remarks}
                </div>
              )}

              {selectedReq.status === "submitted" && (
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button
                    variant="outline"
                    className="text-red-600 border-red-200 hover:bg-red-50"
                    disabled={rejectMutation.isPending}
                    onClick={() => rejectMutation.mutate(selectedReq.id)}
                  >
                    <XCircle className="w-4 h-4 mr-1.5" />
                    Reject Indent
                  </Button>
                  <Button
                    disabled={approveMutation.isPending}
                    onClick={() => approveMutation.mutate(selectedReq.id)}
                  >
                    {approveMutation.isPending ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-1.5" />}
                    Approve Indent
                  </Button>
                </div>
              )}

              {(selectedReq.status === "approved" || selectedReq.status === "partially_fulfilled") && (
                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    <span>Indent is approved. Ready for stock transfer dispatch.</span>
                  </div>
                  <Button
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => {
                      navigate({
                        to: "/inventory/transfers",
                        search: (prev: any) => ({ ...prev, requisitionId: selectedReq.id }),
                      });
                    }}
                  >
                    <Truck className="w-4 h-4 mr-1.5" />
                    Fulfill via Stock Transfer
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </ModuleLayout>
  );
}
