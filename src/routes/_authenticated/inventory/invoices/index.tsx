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
  CreditCard
} from "lucide-react";
import * as React from "react";
import { z } from "zod";
import { format } from "date-fns";
import { cn } from "@/utils/cn";
import { useHospitalSettings } from "@/lib/settings";
import { authClient } from "@/services/auth";
import { printPosReceiptPDF, downloadPosReceiptPDF } from "../pos";

const invoiceSearchSchema = z.object({
  page: z.number().optional().catch(1),
  limit: z.number().optional().catch(20),
  storeId: z.string().optional().catch("all"),
  search: z.string().optional().catch(""),
});

export const Route = createFileRoute("/_authenticated/inventory/invoices/")({
  validateSearch: (search) => invoiceSearchSchema.parse(search),
  component: InvoicesList,
});

function InvoicesList() {
  const searchParams = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  const page = searchParams.page ?? 1;
  const limit = searchParams.limit ?? 20;
  const storeIdFilter = searchParams.storeId || "all";
  const searchFilter = searchParams.search || "";

  const [localSearch, setLocalSearch] = React.useState(searchFilter);
  const [selectedInvoice, setSelectedInvoice] = React.useState<any | null>(null);

  const hospitalSettings = useHospitalSettings();
  const session = authClient.useSession();
  const currentUserName = session?.data?.user?.name || "Cashier";

  const { data: storesList = [] } = useRpcQuery<any[]>(
    ["inventory-stores"],
    () => client.inventory.stores.$get()
  );

  const { data: invoicesResponse, isLoading, refetch, isRefetching } = useRpcQuery<any>(
    ["pos-invoices", searchParams],
    () =>
      client.inventory.pos.invoices.$get({
        query: {
          page: String(page),
          limit: String(limit),
          storeId: storeIdFilter !== "all" ? storeIdFilter : undefined,
          search: searchFilter || undefined,
        },
      })
  );

  const invoicesData = invoicesResponse?.data || [];

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
      <div className="space-y-6">
        {/* Search & Filter Bar with shadcn Components */}
        <Card className="shadow-sm border-slate-200/80">
          <CardContent className="p-4">
            <form onSubmit={handleSearch} className="flex flex-wrap items-center gap-3">
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
                </div>
              </div>

              <div className="w-[200px]">
                <Select value={storeIdFilter} onValueChange={handleStoreChange}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="All Stores" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Stores</SelectItem>
                    {storesList.map((store: any) => (
                      <SelectItem key={store.id} value={String(store.id)}>
                        {store.name} ({store.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button type="submit" size="sm" className="h-9 text-xs font-semibold">
                Search
              </Button>

              {(searchFilter || storeIdFilter !== "all") && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setLocalSearch("");
                    navigate({
                      search: () => ({ page: 1, limit: 20, storeId: "all", search: "" }),
                    });
                  }}
                  className="h-9 text-xs text-muted-foreground"
                >
                  <X className="w-3.5 h-3.5 mr-1" />
                  Clear
                </Button>
              )}
            </form>
          </CardContent>
        </Card>

        {/* Data Table Card */}
        <Card className="shadow-sm">
          <CardContent className="p-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground text-xs">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-600 mr-2" />
                <span>Loading sales invoices...</span>
              </div>
            ) : invoicesData.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Receipt className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-semibold">No sales invoices found</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Open the POS Billing Terminal to generate customer receipts.
                </p>
              </div>
            ) : (
              <DataTable columns={columns} rows={invoicesData as Record<string, unknown>[]} />
            )}
          </CardContent>
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

