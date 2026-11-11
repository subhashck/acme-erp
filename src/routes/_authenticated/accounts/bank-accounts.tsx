import { createFileRoute } from "@tanstack/react-router";
import {
  Building,
  Building2,
  Check,
  Coins,
  Copy,
  CreditCard,
  Edit2,
  Eye,
  EyeOff,
  Filter,
  GraduationCap,
  Landmark,
  Pill,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  User,
  X,
} from "lucide-react";
import * as React from "react";
import { z } from "zod";
import { useRpcQuery, queryClient } from "../../../lib/query";
import { client } from "../../../services/rpc";
import { Button } from "../../../ui/button";
import { Input } from "../../../ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../../ui/card";
import { Badge } from "../../../ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../../../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import { toast } from "sonner";
import { cn } from "../../../utils/cn";

const searchSchema = z.object({
  entity: z.string().optional(),
});

export const Route = createFileRoute("/_authenticated/accounts/bank-accounts")({
  validateSearch: (search) => searchSchema.parse(search),
  component: BankAccountsPage,
});

const LEGAL_ENTITIES = [
  {
    code: "ACME_HOSPITAL",
    label: "Acme Hospital",
    badgeBg: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
    icon: Building2,
    color: "#10b981",
  },
  {
    code: "ACME_NURSING",
    label: "Acme College of Nursing",
    badgeBg: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/30",
    icon: GraduationCap,
    color: "#6366f1",
  },
  {
    code: "HUMANKIND",
    label: "HumanKind Drugs",
    badgeBg: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30",
    icon: Pill,
    color: "#f59e0b",
  },
  {
    code: "PERSONAL",
    label: "Personal Accounts",
    badgeBg: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30",
    icon: User,
    color: "#a855f7",
  },
] as const;

function getEntityConfig(code: string) {
  return (
    LEGAL_ENTITIES.find((e) => e.code === code) || {
      code,
      label: code,
      badgeBg: "bg-slate-500/10 text-slate-700 border-slate-500/30",
      icon: Building,
      color: "#64748b",
    }
  );
}

function fmt(val: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(val);
}

function maskAccountNumber(acc: string) {
  if (!acc || acc.length < 4) return acc;
  return `•••• •••• ${acc.slice(-4)}`;
}

function BankAccountsPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  const selectedEntity = search.entity || "ALL";

  // Query bank accounts
  const bankAccountsQuery = useRpcQuery<any[]>(
    ["bank-accounts", selectedEntity],
    () =>
      (client.accounts as any)["bank-accounts"].$get({
        query: selectedEntity !== "ALL" ? { entity: selectedEntity } : {},
      })
  );

  const accounts = bankAccountsQuery.data || [];

  // Query master list of banks
  const masterBanksQuery = useRpcQuery<any[]>(
    ["masters-banks"],
    () => client.masters.banks.$get()
  );
  const masterBanks = React.useMemo(() => {
    return (masterBanksQuery.data || [])
      .filter((b: any) => b.active)
      .map((b: any) => b.name);
  }, [masterBanksQuery.data]);

  // Filter state
  const [searchTerm, setSearchTerm] = React.useState("");
  const [showMasked, setShowMasked] = React.useState(true);

  const filteredAccounts = React.useMemo(() => {
    return accounts.filter((a) => {
      const q = searchTerm.toLowerCase();
      const matchSearch =
        !searchTerm ||
        a.accountName.toLowerCase().includes(q) ||
        a.bankName.toLowerCase().includes(q) ||
        a.accountNumber.toLowerCase().includes(q) ||
        (a.ifscCode && a.ifscCode.toLowerCase().includes(q)) ||
        (a.branchName && a.branchName.toLowerCase().includes(q));

      const matchEntity = selectedEntity === "ALL" || a.legalEntity === selectedEntity;

      return matchSearch && matchEntity;
    });
  }, [accounts, searchTerm, selectedEntity]);

  // Entity balance summaries
  const entityTotals = React.useMemo(() => {
    const result: Record<string, { count: number; totalOpening: number }> = {
      ACME_HOSPITAL: { count: 0, totalOpening: 0 },
      ACME_NURSING: { count: 0, totalOpening: 0 },
      HUMANKIND: { count: 0, totalOpening: 0 },
      PERSONAL: { count: 0, totalOpening: 0 },
    };

    accounts.forEach((a) => {
      if (a.active && result[a.legalEntity]) {
        result[a.legalEntity].count += 1;
        result[a.legalEntity].totalOpening += parseFloat(a.openingBalance || "0");
      }
    });

    return result;
  }, [accounts]);

  // Dialog state
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingAccount, setEditingAccount] = React.useState<any>(null);

  // Form Fields
  const [formAccountName, setFormAccountName] = React.useState("");
  const [formBankName, setFormBankName] = React.useState("");
  const [formAccountNumber, setFormAccountNumber] = React.useState("");
  const [formIfscCode, setFormIfscCode] = React.useState("");
  const [formBranchName, setFormBranchName] = React.useState("");
  const [formAccountType, setFormAccountType] = React.useState("Current");
  const [formLegalEntity, setFormLegalEntity] = React.useState<"ACME_HOSPITAL" | "ACME_NURSING" | "HUMANKIND" | "PERSONAL">("ACME_HOSPITAL");
  const [formOpeningBalance, setFormOpeningBalance] = React.useState("0");
  const [formActive, setFormActive] = React.useState(true);
  const [formNotes, setFormNotes] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleOpenAdd = () => {
    setEditingAccount(null);
    setFormAccountName("");
    setFormBankName("");
    setFormAccountNumber("");
    setFormIfscCode("");
    setFormBranchName("");
    setFormAccountType("Current");
    setFormLegalEntity(selectedEntity !== "ALL" ? (selectedEntity as any) : "ACME_HOSPITAL");
    setFormOpeningBalance("0");
    setFormActive(true);
    setFormNotes("");
    setIsFormOpen(true);
  };

  const handleOpenEdit = (acc: any) => {
    setEditingAccount(acc);
    setFormAccountName(acc.accountName);
    setFormBankName(acc.bankName);
    setFormAccountNumber(acc.accountNumber);
    setFormIfscCode(acc.ifscCode || "");
    setFormBranchName(acc.branchName || "");
    setFormAccountType(acc.accountType || "Current");
    setFormLegalEntity(acc.legalEntity || "ACME_HOSPITAL");
    setFormOpeningBalance(String(acc.openingBalance || "0"));
    setFormActive(Boolean(acc.active));
    setFormNotes(acc.notes || "");
    setIsFormOpen(true);
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formAccountName || !formBankName || !formAccountNumber) {
      toast.error("Please fill in required fields (Account Name, Bank Name, Account Number)");
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        accountName: formAccountName,
        bankName: formBankName,
        accountNumber: formAccountNumber,
        ifscCode: formIfscCode || null,
        branchName: formBranchName || null,
        accountType: formAccountType,
        legalEntity: formLegalEntity,
        openingBalance: parseFloat(formOpeningBalance) || 0,
        active: formActive,
        notes: formNotes || null,
      };

      if (editingAccount) {
        await (client.accounts as any)["bank-accounts"][":id"].$put({
          param: { id: String(editingAccount.id) },
          json: payload,
        });
        toast.success("Bank account updated successfully");
      } else {
        await (client.accounts as any)["bank-accounts"].$post({
          json: payload,
        });
        toast.success("Bank account created successfully");
      }

      setIsFormOpen(false);
      bankAccountsQuery.refetch();
    } catch (err: any) {
      toast.error(err.message || "Failed to save bank account");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeactivate = async (id: number) => {
    if (!confirm("Are you sure you want to deactivate this bank account?")) return;
    try {
      await (client.accounts as any)["bank-accounts"][":id"].$delete({
        param: { id: String(id) },
      });
      toast.success("Bank account deactivated");
      bankAccountsQuery.refetch();
    } catch (err: any) {
      toast.error("Failed to deactivate account");
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-3xl font-extrabold tracking-tight bg-linear-to-r from-teal-600 to-indigo-600 bg-clip-text text-transparent dark:from-teal-400 dark:to-indigo-400">
              Bank Accounts Directory
            </h3>
            <Badge variant="outline" className="bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/30">
              Accounts Master
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage hospital and group bank accounts tagged across legal entities.
          </p>
        </div>

        <Button
          onClick={handleOpenAdd}
          size="sm"
          className="h-9 text-xs font-semibold gap-1.5 cursor-pointer bg-teal-600 hover:bg-teal-700 text-white shadow-sm"
        >
          <Plus size={15} />
          Add Bank Account
        </Button>
      </div>

      {/* Entity KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {LEGAL_ENTITIES.map((ent) => {
          const Icon = ent.icon;
          const data = entityTotals[ent.code];
          const isSelected = selectedEntity === ent.code;

          return (
            <Card
              key={ent.code}
              onClick={() => navigate({ search: { entity: isSelected ? "ALL" : ent.code }, replace: true })}
              className={cn(
                "border cursor-pointer transition-all duration-200 hover:shadow-md",
                isSelected
                  ? "border-teal-500/60 ring-2 ring-teal-500/20 bg-muted/30"
                  : "border-border/60 shadow-xs"
              )}
            >
              <CardHeader className="pb-1.5">
                <CardDescription className="font-bold flex items-center justify-between text-[10px] uppercase tracking-wider">
                  <span className="flex items-center gap-1.5" style={{ color: ent.color }}>
                    <Icon size={14} />
                    {ent.label}
                  </span>
                  <Badge variant="outline" className={ent.badgeBg}>
                    {data.count} Account{data.count !== 1 ? "s" : ""}
                  </Badge>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-extrabold tracking-tight text-foreground">
                  {fmt(data.totalOpening)}
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Cumulative Opening Balance
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Entity Filter Tabs & Search */}
      <Card className="border border-border/60 shadow-xs">
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <Button
              variant={selectedEntity === "ALL" ? "default" : "outline"}
              size="sm"
              onClick={() => navigate({ search: { entity: "ALL" }, replace: true })}
              className="h-8 text-xs font-semibold cursor-pointer"
            >
              All Entities ({accounts.length})
            </Button>
            {LEGAL_ENTITIES.map((ent) => (
              <Button
                key={ent.code}
                variant={selectedEntity === ent.code ? "default" : "outline"}
                size="sm"
                onClick={() => navigate({ search: { entity: ent.code }, replace: true })}
                className="h-8 text-xs font-semibold cursor-pointer gap-1.5"
              >
                <ent.icon size={13} />
                {ent.label}
              </Button>
            ))}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="Search bank, account name, number, IFSC..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowMasked(!showMasked)}
              title={showMasked ? "Show full account numbers" : "Mask account numbers"}
              className="size-9 shrink-0 cursor-pointer"
            >
              {showMasked ? <EyeOff size={15} /> : <Eye size={15} />}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Bank Accounts Grid / Cards */}
      {bankAccountsQuery.isLoading ? (
        <div className="py-16 text-center text-sm text-muted-foreground">
          Loading bank accounts directory…
        </div>
      ) : filteredAccounts.length === 0 ? (
        <Card className="border border-border/60 py-16 flex flex-col items-center justify-center text-muted-foreground gap-2">
          <Landmark className="size-12 opacity-30" />
          <p className="font-semibold text-sm">No bank accounts found</p>
          <p className="text-xs">Click "Add Bank Account" to create your first bank record.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAccounts.map((acc) => {
            const ent = getEntityConfig(acc.legalEntity);
            const EntIcon = ent.icon;

            return (
              <Card key={acc.id} className={cn("border border-border/60 shadow-xs hover:shadow-md transition-all duration-200", !acc.active && "opacity-65 bg-muted/20")}>
                <CardHeader className="p-4 pb-2 flex flex-row items-start justify-between space-y-0">
                  <div>
                    <Badge variant="outline" className={cn("text-[10px] font-bold gap-1 mb-1.5", ent.badgeBg)}>
                      <EntIcon size={11} />
                      {ent.label}
                    </Badge>
                    <CardTitle className="text-base font-extrabold tracking-tight text-foreground flex items-center gap-1.5">
                      <Landmark size={16} className="text-teal-600 dark:text-teal-400 shrink-0" />
                      {acc.accountName}
                    </CardTitle>
                    <CardDescription className="text-xs font-semibold text-muted-foreground mt-0.5">
                      {acc.bankName} {acc.branchName ? `(${acc.branchName})` : ""}
                    </CardDescription>
                  </div>

                  <Badge variant={acc.active ? "default" : "secondary"} className="text-[10px] px-1.5 py-0.5">
                    {acc.active ? "Active" : "Inactive"}
                  </Badge>
                </CardHeader>

                <CardContent className="p-4 pt-2 space-y-3">
                  {/* Account Details Box */}
                  <div className="p-2.5 rounded-lg bg-muted/40 border border-border/50 space-y-1.5 text-xs font-mono">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-sans text-muted-foreground uppercase font-bold">Account No:</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-foreground">
                          {showMasked ? maskAccountNumber(acc.accountNumber) : acc.accountNumber}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => copyToClipboard(acc.accountNumber, "Account Number")}
                          className="size-5 text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                          <Copy size={11} />
                        </Button>
                      </div>
                    </div>

                    {acc.ifscCode && (
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-sans text-muted-foreground uppercase font-bold">IFSC Code:</span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-foreground">{acc.ifscCode}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => copyToClipboard(acc.ifscCode, "IFSC Code")}
                            className="size-5 text-muted-foreground hover:text-foreground cursor-pointer"
                          >
                            <Copy size={11} />
                          </Button>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between font-sans">
                      <span className="text-[10px] text-muted-foreground uppercase font-bold">Type:</span>
                      <Badge variant="outline" className="text-[10px] bg-background">
                        {acc.accountType}
                      </Badge>
                    </div>
                  </div>

                  {/* Opening Balance */}
                  <div className="flex items-center justify-between border-t pt-2 text-xs">
                    <span className="text-muted-foreground font-semibold">Opening Balance:</span>
                    <span className="font-extrabold text-foreground text-sm">
                      {fmt(parseFloat(acc.openingBalance || "0"))}
                    </span>
                  </div>

                  {acc.notes && (
                    <p className="text-[11px] text-muted-foreground italic line-clamp-2">
                      {acc.notes}
                    </p>
                  )}

                  {/* Card Actions */}
                  <div className="flex items-center justify-end gap-1.5 border-t pt-2.5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenEdit(acc)}
                      className="h-7 px-2.5 text-xs font-semibold cursor-pointer gap-1"
                    >
                      <Edit2 size={12} />
                      Edit
                    </Button>
                    {acc.active && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeactivate(acc.id)}
                        className="h-7 px-2 text-xs font-semibold text-rose-500 hover:text-rose-700 hover:bg-rose-500/10 cursor-pointer"
                      >
                        Deactivate
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add / Edit Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              {editingAccount ? "Edit Bank Account" : "Add New Bank Account"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Register a bank account and tag it to the responsible legal entity.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitForm} className="space-y-3 py-2 text-xs">
            <div>
              <label className="font-semibold block mb-1">Legal Entity *</label>
              <Select value={formLegalEntity} onValueChange={(val: any) => setFormLegalEntity(val)}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LEGAL_ENTITIES.map((ent) => (
                    <SelectItem key={ent.code} value={ent.code}>
                      {ent.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="font-semibold block mb-1">Account Display Name *</label>
              <Input
                placeholder="e.g. HDFC Bank - Main Operating A/C"
                value={formAccountName}
                onChange={(e) => setFormAccountName(e.target.value)}
                className="h-9 text-xs"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold block mb-1">Bank Name *</label>
                <Select value={formBankName} onValueChange={setFormBankName}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Select Bank" />
                  </SelectTrigger>
                  <SelectContent>
                    {masterBanks.map((bankName: string) => (
                      <SelectItem key={bankName} value={bankName}>
                        {bankName}
                      </SelectItem>
                    ))}
                    {formBankName && !masterBanks.includes(formBankName) && (
                      <SelectItem value={formBankName}>{formBankName}</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="font-semibold block mb-1">Branch Name</label>
                <Input
                  placeholder="e.g. Civil Lines Branch"
                  value={formBranchName}
                  onChange={(e) => setFormBranchName(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold block mb-1">Account Number *</label>
                <Input
                  placeholder="e.g. 50200012345678"
                  value={formAccountNumber}
                  onChange={(e) => setFormAccountNumber(e.target.value)}
                  className="h-9 text-xs font-mono"
                  required
                />
              </div>
              <div>
                <label className="font-semibold block mb-1">IFSC Code</label>
                <Input
                  placeholder="e.g. HDFC0001234"
                  value={formIfscCode}
                  onChange={(e) => setFormIfscCode(e.target.value.toUpperCase())}
                  className="h-9 text-xs font-mono uppercase"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold block mb-1">Account Type</label>
                <Select value={formAccountType} onValueChange={setFormAccountType}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Current">Current Account</SelectItem>
                    <SelectItem value="Savings">Savings Account</SelectItem>
                    <SelectItem value="Overdraft">Overdraft (OD)</SelectItem>
                    <SelectItem value="Cash Credit">Cash Credit (CC)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="font-semibold block mb-1">Opening Balance (₹)</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formOpeningBalance}
                  onChange={(e) => setFormOpeningBalance(e.target.value)}
                  className="h-9 text-xs font-bold"
                />
              </div>
            </div>

            <div>
              <label className="font-semibold block mb-1">Notes / Remarks</label>
              <Input
                placeholder="Authorized signatories, purpose, details..."
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="active"
                checked={formActive}
                onChange={(e) => setFormActive(e.target.checked)}
                className="rounded border-border size-4 text-teal-600 focus:ring-teal-500"
              />
              <label htmlFor="active" className="font-semibold text-xs cursor-pointer select-none">
                Account Active
              </label>
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsFormOpen(false)}
                className="h-8 text-xs cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-8 text-xs cursor-pointer bg-teal-600 hover:bg-teal-700 text-white"
              >
                {isSubmitting ? "Saving…" : editingAccount ? "Update Account" : "Save Account"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
