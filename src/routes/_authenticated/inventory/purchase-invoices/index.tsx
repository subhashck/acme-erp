import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import * as React from "react";
import { useRpcQuery } from "@/lib/query";
import { client } from "@/services/rpc";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card";
import { Button } from "@/ui/button";
import { Badge } from "@/ui/badge";
import {
  FileText,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  DollarSign,
  AlertCircle,
  Eye,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ShieldCheck,
  CreditCard,
  X,
} from "lucide-react";
import { z } from "zod";

const searchSchema = z.object({
  page: z.coerce.number().optional().catch(1),
  limit: z.coerce.number().optional().catch(20),
  search: z.string().optional().catch(""),
  status: z.string().optional().catch("all"),
  vendorId: z.string().optional().catch("all"),
});

export const Route = createFileRoute("/_authenticated/inventory/purchase-invoices/")({
  validateSearch: (search) => searchSchema.parse(search),
  component: PurchaseInvoicesList,
});

function getStatusBadge(status: string) {
  switch (status) {
    case "draft":
      return <Badge variant="outline" className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300">Draft</Badge>;
    case "verified":
      return <Badge variant="outline" className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300 font-semibold">Verified (3-Way)</Badge>;
    case "approved":
      return <Badge variant="outline" className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-300 font-semibold">Approved for Pay</Badge>;
    case "partially_paid":
      return <Badge variant="outline" className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-300 font-semibold">Partially Paid</Badge>;
    case "paid":
      return <Badge variant="outline" className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-300 font-semibold">Paid</Badge>;
    case "cancelled":
      return <Badge variant="outline" className="bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 border-rose-300">Cancelled</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function PurchaseInvoicesList() {
  const searchParams = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  const [localSearch, setLocalSearch] = React.useState(searchParams.search || "");

  const { data: response, isLoading, refetch, isRefetching } = useRpcQuery<any>(
    ["purchase-invoices", searchParams],
    () =>
      (client as any)["inventory"]["purchase-invoices"].$get({
        query: {
          page: String(searchParams.page || 1),
          limit: String(searchParams.limit || 20),
          search: searchParams.search || undefined,
          status: searchParams.status !== "all" ? searchParams.status : undefined,
          vendorId: searchParams.vendorId !== "all" ? searchParams.vendorId : undefined,
        },
      })
  );

  const { data: vendorsList = [] } = useRpcQuery<any[]>(
    ["vendors"],
    () => client.vendors.$get()
  );

  const invoices = response?.data || [];
  const pagination = response?.pagination || { page: 1, pageSize: 20, totalRecords: 0, totalPages: 1 };
  const startRecord = pagination.totalRecords === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1;
  const endRecord = Math.min(pagination.page * pagination.pageSize, pagination.totalRecords);
  const hasActiveFilters = Boolean(
    searchParams.search ||
    (searchParams.status && searchParams.status !== "all") ||
    (searchParams.vendorId && searchParams.vendorId !== "all")
  );

  // Calculate summary KPI metrics
  const totalBilled = invoices.reduce((acc: number, inv: any) => acc + Number(inv.netAmount || 0), 0);
  const totalPaid = invoices.reduce((acc: number, inv: any) => acc + Number(inv.paidAmount || 0), 0);
  const totalOutstanding = invoices.reduce(
    (acc: number, inv: any) =>
      acc + (inv.status !== "cancelled" ? Number(inv.netAmount || 0) - Number(inv.paidAmount || 0) : 0),
    0
  );
  const pendingApprovalCount = invoices.filter((inv: any) => inv.status === "verified").length;

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

  const handleStatusFilter = (val: string) => {
    navigate({
      search: (prev: any) => ({
        ...prev,
        status: val,
        page: 1,
      }),
    });
  };

  const handleVendorFilter = (val: string) => {
    navigate({
      search: (prev: any) => ({
        ...prev,
        vendorId: val,
        page: 1,
      }),
    });
  };

  const vendorOptions: [string, string][] = [
    ["all", "All Vendors"],
    ...vendorsList.map((v: any) => [String(v.id), v.name] as [string, string]),
  ];

  const statusOptions: [string, string][] = [
    ["all", "All Statuses"],
    ["draft", "Draft"],
    ["verified", "Verified (3-Way)"],
    ["approved", "Approved"],
    ["partially_paid", "Partially Paid"],
    ["paid", "Paid"],
    ["cancelled", "Cancelled"],
  ];

  return (
    <ModuleLayout
      title="Purchase Invoices"
      description="Vendor bills, 3-way matching against PO and GRN deliveries, and supplier liabilities."
      action={
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading || isRefetching}>
            <RefreshCw className={`h-4 w-4 mr-1 ${isRefetching ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Link to={"/inventory/purchase-invoices/new" as any}>
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium">
              <Plus className="h-4 w-4 mr-1" /> New Purchase Invoice
            </Button>
          </Link>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Top KPI Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-primary shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Total Invoices
              </CardTitle>
              <FileText className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono">{pagination.totalRecords}</div>
              <p className="text-xs text-muted-foreground mt-1">Recorded vendor bills</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-500 shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Verified (Ready)
              </CardTitle>
              <ShieldCheck className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono text-blue-600 dark:text-blue-400">
                {pendingApprovalCount}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Matched, awaiting approval</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-emerald-500 shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Total Paid
              </CardTitle>
              <CreditCard className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                ₹{totalPaid.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Disbursed supplier payments</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-amber-500 shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Outstanding Balance
              </CardTitle>
              <AlertCircle className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">
                ₹{totalOutstanding.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Pending payable liability</p>
            </CardContent>
          </Card>
        </div>

        {/* Filter and Search Bar */}
        <Card className="shadow-xs border-slate-200/80">
          <CardContent className="p-4 space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-[240px]">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search by vendor, invoice no, ref..."
                    value={localSearch}
                    onChange={(e) => setLocalSearch(e.target.value)}
                    className="w-full pl-9 pr-8 h-9 text-xs rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
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

              <div className="w-[160px]">
                <select
                  value={searchParams.status || "all"}
                  onChange={(e) => handleStatusFilter(e.target.value)}
                  className="w-full h-9 text-xs rounded-md border bg-background px-2.5 focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  {statusOptions.map(([val, label]) => (
                    <option key={val} value={val}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="w-[200px]">
                <select
                  value={searchParams.vendorId || "all"}
                  onChange={(e) => handleVendorFilter(e.target.value)}
                  className="w-full h-9 text-xs rounded-md border bg-background px-2.5 focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  {vendorOptions.map(([val, label]) => (
                    <option key={val} value={val}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="w-[110px]">
                <select
                  value={String(searchParams.limit || 20)}
                  onChange={(e) =>
                    navigate({
                      search: (prev: any) => ({
                        ...prev,
                        limit: Number(e.target.value),
                        page: 1,
                      }),
                    })
                  }
                  className="w-full h-9 text-xs rounded-md border bg-background px-2.5 focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="10">10 / page</option>
                  <option value="20">20 / page</option>
                  <option value="50">50 / page</option>
                  <option value="100">100 / page</option>
                </select>
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
                        status: "all",
                        vendorId: "all",
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

        {/* Invoices Master Table */}
        <Card className="shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b bg-muted/40 text-muted-foreground font-semibold uppercase tracking-wider">
                  <th className="px-4 py-3">Doc Ref</th>
                  <th className="px-4 py-3">Vendor</th>
                  <th className="px-4 py-3">Vendor Inv No & Date</th>
                  <th className="px-4 py-3">Due Date</th>
                  <th className="px-4 py-3 text-right">Taxable</th>
                  <th className="px-4 py-3 text-right">GST</th>
                  <th className="px-4 py-3 text-right">Net Amount</th>
                  <th className="px-4 py-3 text-right">Paid / Balance</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-12 text-center text-muted-foreground">
                      <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
                      Loading purchase invoices...
                    </td>
                  </tr>
                ) : invoices.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-12 text-center text-muted-foreground">
                      <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                      No purchase invoices found matching criteria.
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv: any) => {
                    const net = Number(inv.netAmount || 0);
                    const paid = Number(inv.paidAmount || 0);
                    const balance = net - paid;
                    return (
                      <tr key={inv.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-primary">
                          <Link
                            to="/inventory/purchase-invoices/$id"
                            params={{ id: String(inv.id) }}
                            className="hover:underline"
                          >
                            {inv.invoiceNo}
                          </Link>
                        </td>
                        <td className="px-4 py-3 font-medium text-foreground">
                          {inv.vendor?.name || "Unknown Vendor"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-foreground">{inv.vendorInvoiceNo}</div>
                          <div className="text-[11px] text-muted-foreground">{inv.invoiceDate}</div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {inv.dueDate || "—"}
                        </td>
                        <td className="px-4 py-3 text-right font-mono">
                          ₹{Number(inv.taxableAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-right font-mono">
                          ₹{(Number(inv.cgstAmount || 0) + Number(inv.sgstAmount || 0) + Number(inv.igstAmount || 0)).toLocaleString(
                            "en-IN",
                            { minimumFractionDigits: 2 }
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-foreground">
                          ₹{net.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-right font-mono">
                          <div className="text-emerald-600 dark:text-emerald-400 font-semibold">
                            ₹{paid.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </div>
                          {balance > 0 && inv.status !== "cancelled" && (
                            <div className="text-[11px] text-amber-600 dark:text-amber-400">
                              Bal: ₹{balance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">{getStatusBadge(inv.status)}</td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            to="/inventory/purchase-invoices/$id"
                            params={{ id: String(inv.id) }}
                          >
                            <Button variant="outline" size="sm" className="h-7 text-xs px-2.5">
                              <Eye className="h-3.5 w-3.5 mr-1" /> View
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {!isLoading && pagination.totalRecords > 0 && (
            <div className="px-4 py-3 border-t flex flex-wrap items-center justify-between gap-3 bg-muted/10 text-xs">
              <div className="text-muted-foreground">
                Showing <strong className="text-foreground font-semibold">{startRecord}</strong> to{" "}
                <strong className="text-foreground font-semibold">{endRecord}</strong> of{" "}
                <strong className="text-foreground font-semibold">{pagination.totalRecords}</strong> purchase invoices
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
                      search: (prev: any) => ({
                        ...prev,
                        page: pagination.page - 1,
                      }),
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
                      search: (prev: any) => ({
                        ...prev,
                        page: pagination.page + 1,
                      }),
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
                      search: (prev: any) => ({
                        ...prev,
                        page: pagination.totalPages,
                      }),
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
    </ModuleLayout>
  );
}
