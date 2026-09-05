import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ModuleLayout } from "@/components/ModuleLayout";
import { useRpcQuery } from "@/lib/query";
import { client } from "@/services/rpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/ui/card";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Badge } from "@/ui/badge";
import { Label } from "@/ui/label";
import { DataTable, type ColumnDef } from "@/components/DataTable";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Receipt, 
  Search, 
  RefreshCw, 
  Loader2, 
  Printer, 
  Warehouse, 
  FileText, 
  User, 
  Phone,
  Stethoscope,
  Download,
  Calendar,
  X,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from "lucide-react";
import * as React from "react";
import { z } from "zod";
import { format } from "date-fns";
import { cn } from "@/utils/cn";
import { useHospitalSettings } from "@/lib/settings";
import { printPosReceiptPDF, downloadPosReceiptPDF } from "../pos";

const invoiceSearchSchema = z.object({
  page: z.coerce.number().optional().catch(1),
  limit: z.coerce.number().optional().catch(20),
  search: z.string().optional().catch(""),
  storeId: z.string().optional().catch("all"),
  status: z.string().optional().catch("all"),
  paymentMode: z.string().optional().catch("all"),
});

export const Route = createFileRoute("/_authenticated/inventory/invoices/")({
  validateSearch: (search) => invoiceSearchSchema.parse(search),
  component: InvoicesList,
});

function InvoicesList() {
  const searchParams = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const [localSearch, setLocalSearch] = React.useState(searchParams.search || "");
  const [selectedInvoice, setSelectedInvoice] = React.useState<any | null>(null);

  const hospitalSettings = useHospitalSettings();
  const { session } = Route.useRouteContext() as { session?: any };
  const currentUserName = session?.data?.user?.name || session?.user?.name || "Cashier";

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

  const { data: storesList = [] } = useRpcQuery<any[]>(
    ["inventory-stores"],
    () => client.inventory.stores.$get()
  );

  const { data: invoicesResponse, isLoading, refetch, isRefetching } = useRpcQuery<any>(
    ["pos-invoices", searchParams],
    () =>
      client.inventory.pos.invoices.$get({
        query: {
          page: String(searchParams.page || 1),
          limit: String(searchParams.limit || 20),
          storeId: searchParams.storeId !== "all" ? searchParams.storeId : undefined,
          status: searchParams.status !== "all" ? searchParams.status : undefined,
          paymentMode: searchParams.paymentMode !== "all" ? searchParams.paymentMode : undefined,
          search: searchParams.search || undefined,
        },
      })
  );

  const invoicesData = invoicesResponse?.data || [];
  const pagination = invoicesResponse?.pagination || { page: 1, pageSize: 20, totalRecords: 0, totalPages: 1 };
  const startRecord = pagination.totalRecords === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1;
  const endRecord = Math.min(pagination.page * pagination.pageSize, pagination.totalRecords);
  const hasActiveFilters = Boolean(
    searchParams.search ||
    (searchParams.storeId && searchParams.storeId !== "all") ||
    (searchParams.status && searchParams.status !== "all") ||
    (searchParams.paymentMode && searchParams.paymentMode !== "all")
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate({
      search: (prev) => ({
        ...prev,
        page: 1,
        search: localSearch,
      }),
    });
  };

  const handleStoreChange = (value: string) => {
    navigate({
      search: (prev) => ({
        ...prev,
        page: 1,
        storeId: value,
      }),
    });
  };

  const handlePrint = (inv?: any) => {
    const target = inv || selectedInvoice;
    if (!target) return;
    printPosReceiptPDF(target, hospitalSettings, target.store, currentUserName);
  };

  const handleDownload = (inv?: any) => {
    const target = inv || selectedInvoice;
    if (!target) return;
    downloadPosReceiptPDF(target, hospitalSettings, target.store, currentUserName);
  };

  const getPaymentBadge = (mode: string) => {
    const m = (mode || "cash").toLowerCase();
    switch (m) {
      case "cash":
        return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 uppercase text-[10px]">Cash</Badge>;
      case "upi":
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 uppercase text-[10px]">UPI</Badge>;
      case "card":
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 uppercase text-[10px]">Card</Badge>;
      case "credit":
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 uppercase text-[10px]">Credit</Badge>;
      default:
        return <Badge variant="outline" className="uppercase text-[10px]">{mode}</Badge>;
    }
  };

  const columns: ColumnDef<Record<string, unknown>>[] = [
    {
      id: "invoiceNo",
      label: "Invoice No",
      render: (row) => (
        <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
          {String(row.invoiceNo || "")}
        </span>
      ),
    },
    {
      id: "invoiceDate",
      label: "Date & Time",
      render: (row) => {
        let formattedDate = "";
        try {
          formattedDate = format(new Date(String(row.invoiceDate || row.createdAt)), "dd/MM/yyyy hh:mm a");
        } catch {
          formattedDate = String(row.invoiceDate || "");
        }
        return (
          <span className="font-mono text-xs text-slate-600 dark:text-slate-400">
            {formattedDate}
          </span>
        );
      },
    },
    {
      id: "storeName",
      label: "Store",
      render: (row: any) => (
        <div className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
          <Warehouse className="w-3.5 h-3.5 text-slate-400" />
          <span>{row.store?.name || "N/A"}</span>
          {row.store?.code && (
            <span className="text-[10px] text-muted-foreground font-mono">({row.store.code})</span>
          )}
        </div>
      ),
    },
    {
      id: "customerName",
      label: "Customer / Patient",
      render: (row) => (
        <div>
          <div className="font-medium text-slate-900 dark:text-slate-100">
            {String(row.customerName || "Walk-in Customer")}
          </div>
          {Boolean(row.customerPhone) && (
            <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
              <Phone className="w-3 h-3 text-slate-400" />
              {String(row.customerPhone)}
            </div>
          )}
        </div>
      ),
    },
    {
      id: "paymentMode",
      label: "Payment",
      render: (row) => getPaymentBadge(String(row.paymentMode || "cash")),
    },
    {
      id: "netAmount",
      label: "Net Amount",
      render: (row) => (
        <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
          Rs. {Number(row.netAmount || 0).toFixed(2)}
        </span>
      ),
    },
    {
      id: "actions",
      label: "Actions",
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedInvoice(row)}
            className="h-8 text-xs font-medium"
          >
            <FileText className="w-3.5 h-3.5 mr-1 text-slate-500" /> View
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handlePrint(row)}
            className="h-8 w-8 p-0"
            title="Print Receipt (jsPDF)"
          >
            <Printer className="w-3.5 h-3.5 text-emerald-600" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDownload(row)}
            className="h-8 w-8 p-0"
            title="Download PDF"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <ModuleLayout
      title="POS Sales Invoices"
      description="List of retail billing invoices, pharmacy cash memos, and tax receipts"
      action={
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isRefetching}
          className="h-9 text-xs"
        >
          <RefreshCw className={cn("w-3.5 h-3.5 mr-1.5", isRefetching && "animate-spin")} />
          Refresh
        </Button>
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
                    placeholder="Search by invoice no, customer name, phone, or doctor..."
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
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="partial">Partial</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="w-[150px]">
                <Select
                  value={searchParams.paymentMode || "all"}
                  onValueChange={(val) =>
                    navigate({
                      search: (prev: any) => ({
                        ...prev,
                        paymentMode: val !== "all" ? val : undefined,
                        page: 1,
                      }),
                    })
                  }
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Payment Mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Modes</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="credit">Credit / IPD</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="w-[180px]">
                <Select
                  value={searchParams.storeId || "all"}
                  onValueChange={(val) =>
                    navigate({
                      search: (prev: any) => ({
                        ...prev,
                        storeId: val !== "all" ? val : undefined,
                        page: 1,
                      }),
                    })
                  }
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Store Location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Stores</SelectItem>
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
                        search: "",
                        storeId: "all",
                        status: "all",
                        paymentMode: "all",
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
                  <th className="px-4 py-3">Invoice No</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Store</th>
                  <th className="px-4 py-3">Customer / Patient</th>
                  <th className="px-4 py-3 text-right">Net Amount</th>
                  <th className="px-4 py-3 text-center">Payment Mode</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin text-primary" />
                        <span>Loading sales invoices...</span>
                      </div>
                    </td>
                  </tr>
                ) : invoicesData.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                      <Receipt className="w-10 h-10 mx-auto mb-2 opacity-30" />
                      <p className="font-semibold text-foreground">No sales invoices found</p>
                      <p className="text-[11px] mt-0.5">
                        {hasActiveFilters ? "Try clearing search or filters" : "Open POS Billing Terminal to generate receipts"}
                      </p>
                    </td>
                  </tr>
                ) : (
                  invoicesData.map((row: any) => (
                    <tr key={row.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-foreground">
                        {row.invoiceNo}
                      </td>
                      <td className="px-4 py-3 font-mono text-muted-foreground">
                        {row.invoiceDate ? format(new Date(row.invoiceDate), "dd MMM yyyy, HH:mm") : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 font-medium text-foreground">
                          <Warehouse className="w-3.5 h-3.5 text-muted-foreground" />
                          {row.store?.name || "N/A"}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">{row.customerName || "Walk-in Guest"}</div>
                        {row.customerPhone && (
                          <div className="text-[11px] text-muted-foreground font-mono">{row.customerPhone}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-foreground">
                        ₹{Number(row.netAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant="outline" className="capitalize text-[11px]">
                          {row.paymentMode || "Cash"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge
                          className={cn(
                            row.status === "completed"
                              ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                              : row.status === "partial"
                              ? "bg-amber-100 text-amber-800 border-amber-200"
                              : "bg-red-100 text-red-800 border-red-200"
                          )}
                        >
                          {row.status || "Completed"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs px-2"
                            onClick={() => setSelectedInvoice(row)}
                          >
                            <FileText className="w-3.5 h-3.5 mr-1" />
                            View
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => handlePrint(row)}
                            title="Print Receipt"
                          >
                            <Printer className="w-3.5 h-3.5 text-emerald-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => handleDownload(row)}
                            title="Download PDF"
                          >
                            <Download className="w-3.5 h-3.5 text-muted-foreground" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
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
                <strong className="text-foreground font-semibold">{pagination.totalRecords}</strong> sales invoices
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

      {/* Invoice Detail Dialog with shadcn Dialog & jsPDF Print */}
      {selectedInvoice && (
        <Dialog open={!!selectedInvoice} onOpenChange={() => setSelectedInvoice(null)}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center justify-between pr-4">
                <DialogTitle className="flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-emerald-600" />
                  <span>Invoice #{selectedInvoice.invoiceNo}</span>
                </DialogTitle>
                {getPaymentBadge(selectedInvoice.paymentMode)}
              </div>
              <DialogDescription>
                Store: {selectedInvoice.store?.name || "Main Store"} • Date: {new Date(selectedInvoice.invoiceDate || selectedInvoice.createdAt).toLocaleString()}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Customer & Doctor Metadata */}
              <div className="grid grid-cols-2 gap-3 bg-muted/40 p-3 rounded-lg text-xs border">
                <div>
                  <span className="text-muted-foreground block text-[11px]">Customer / Patient:</span>
                  <span className="font-semibold">{selectedInvoice.customerName || "Walk-in Customer"}</span>
                  {selectedInvoice.customerPhone && (
                    <span className="text-muted-foreground block text-[11px] mt-0.5">{selectedInvoice.customerPhone}</span>
                  )}
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Doctor / Consultant:</span>
                  <span className="font-semibold">{selectedInvoice.doctorName || "Self / General"}</span>
                </div>
              </div>

              {/* Items Table */}
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/60 text-muted-foreground font-semibold border-b">
                    <tr>
                      <th className="py-2.5 px-3">Item Description</th>
                      <th className="py-2.5 px-3">Batch & Exp</th>
                      <th className="py-2.5 px-3 text-right">Qty</th>
                      <th className="py-2.5 px-3 text-right">Rate</th>
                      <th className="py-2.5 px-3 text-right">GST</th>
                      <th className="py-2.5 px-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {selectedInvoice.items?.map((item: any) => (
                      <tr key={item.id} className="hover:bg-muted/20">
                        <td className="py-2.5 px-3 font-semibold">{item.item?.name || `Item #${item.itemId}`}</td>
                        <td className="py-2.5 px-3">
                          <span className="font-mono block">{item.batch?.batchNumber || `#${item.batchId}`}</span>
                          {item.batch?.expiryDate && (
                            <span className="text-[10px] text-muted-foreground block">{item.batch.expiryDate}</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono">{item.quantity} {item.unit || "Unit"}</td>
                        <td className="py-2.5 px-3 text-right font-mono">Rs. {Number(item.unitRate || 0).toFixed(2)}</td>
                        <td className="py-2.5 px-3 text-right font-mono">{item.gstPercent || 0}%</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold">Rs. {Number(item.totalAmount || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals Summary */}
              <div className="bg-muted/40 p-3 rounded-lg space-y-1.5 text-xs border">
                <div className="flex justify-between text-muted-foreground">
                  <span>Gross Subtotal:</span>
                  <span className="font-mono">Rs. {Number(selectedInvoice.subtotal || 0).toFixed(2)}</span>
                </div>
                {Number(selectedInvoice.discountAmount) > 0 && (
                  <div className="flex justify-between text-amber-600">
                    <span>Total Discount:</span>
                    <span className="font-mono">-Rs. {Number(selectedInvoice.discountAmount).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-muted-foreground">
                  <span>Taxable Amount:</span>
                  <span className="font-mono">Rs. {Number(selectedInvoice.taxableAmount || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>CGST / SGST:</span>
                  <span className="font-mono">
                    Rs. {Number(selectedInvoice.cgstAmount || 0).toFixed(2)} + Rs. {Number(selectedInvoice.sgstAmount || 0).toFixed(2)}
                  </span>
                </div>
                {Number(selectedInvoice.roundOff) !== 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Round Off:</span>
                    <span className="font-mono">{Number(selectedInvoice.roundOff) >= 0 ? "+" : ""}Rs. {Number(selectedInvoice.roundOff).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-sm pt-2 border-t text-foreground">
                  <span>Grand Total:</span>
                  <span className="font-mono text-emerald-600">Rs. {Number(selectedInvoice.netAmount || 0).toFixed(2)}</span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setSelectedInvoice(null)}>
                  Close
                </Button>
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownload(selectedInvoice)}
                >
                  <Download className="w-3.5 h-3.5 mr-1.5" />
                  Download PDF
                </Button>
                <Button 
                  size="sm"
                  onClick={() => handlePrint(selectedInvoice)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <Printer className="w-3.5 h-3.5 mr-1.5" />
                  Print Receipt
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </ModuleLayout>
  );
}

