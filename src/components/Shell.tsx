import { Link, Outlet, useRouter, useLocation } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import { 
  Activity, 
  LayoutDashboard, 
  LogOut, 
  Search, 
  Settings, 
  ShieldCheck, 
  Users, 
  ChevronDown, 
  ChevronRight, 
  ChevronLeft, 
  CalendarClock, 
  CalendarDays, 
  Clock, 
  Landmark,
  Receipt,
  Menu,
  X,
  Building,
  Percent,
  Coins,
  Syringe,
  Bell,
  Check,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Info,
  MessageSquare,
  Trash2,
  ShoppingCart,
  ShoppingBag,
  Package,
  Layers,
  Scale
} from "lucide-react";
import { authClient } from "../services/auth";
import { uiStore } from "../lib/ui-store";
import { Button } from "../ui/button";
// import { Input } from "../ui/input";
import * as React from "react";
import { cn } from "../utils/cn";
import { useHospitalSettings } from "../lib/settings";
import { notificationsStore, notificationsActions } from "../lib/notifications-store";
import { useRpcQuery } from "../lib/query";
import { client } from "../services/rpc";
import { chatStore, chatActions } from "../lib/chat-store";

const getBreadcrumbs = (pathname: string) => {
  const items = [{ label: "Dashboard", to: "/" }];
  
  if (pathname === "/" || pathname === "") {
    return items;
  }
  
  if (pathname === "/settings" || pathname === "/settings/") {
    items.push({ label: "Settings", to: "/settings" });
    return items;
  }
  
  if (pathname === "/hr" || pathname === "/hr/") {
    items.push({ label: "Employee Details", to: "/hr/staff-list" });
    return items;
  }
  
  if (pathname.startsWith("/hr/")) {
    items.push({ label: "HR Management", to: "/hr/staff-list" });
    const sub = pathname.replace("/hr/", "");
    if (sub === "roster") {
      items.push({ label: "Shift Roster", to: "/hr/roster" });
    } else if (sub === "leaves") {
      items.push({ label: "Leave Management", to: "/hr/leaves" });
    } else if (sub === "attendance") {
      items.push({ label: "Attendance", to: "/hr/attendance" });
    } else if (sub === "payroll") {
      items.push({ label: "Payroll", to: "/hr/payroll" });
    } else if (sub === "add-staff") {
      items.push({ label: "Add Employee", to: "/hr/add-staff" });
    } else if (sub === "view-staff") {
      items.push({ label: "Staff Details", to: "/hr/view-staff" });
    } else if (sub === "view-payslip") {
      items.push({ label: "View Payslip", to: "/hr/view-payslip" });
    } else if (sub === "review-leave") {
      items.push({ label: "Review Leave", to: "/hr/review-leave" });
    } else if(sub === "staff-list") {
      items.push({ label: "Staff List", to: "/hr/staff-list" });
    }
    return items;
  }
  
  if (pathname.startsWith("/masters/")) {
    items.push({ label: "Masters", to: "/masters/roles" });
    const sub = pathname.replace("/masters/", "");
    if (sub === "roles") {
      items.push({ label: "Roles", to: "/masters/roles" });
    } else if (sub === "leave-types") {
      items.push({ label: "Leave Types", to: "/masters/leave-types" });
    } else if (sub === "departments") {
      items.push({ label: "Departments", to: "/masters/departments" });
    } else if (sub === "shifts") {
      items.push({ label: "Shifts", to: "/masters/shifts" });
    } else if (sub === "salary-templates") {
      items.push({ label: "Salary Templates", to: "/masters/salary-templates" });
    } else if (sub === "banks") {
      items.push({ label: "Banks", to: "/masters/banks" });
    }
    return items;
  }

  if (pathname.startsWith("/purchases/")) {
    items.push({ label: "Purchases", to: "/purchases/purchase-orders" });
    const sub = pathname.replace("/purchases/", "");
    if (sub === "purchase-orders") {
      items.push({ label: "Purchase Orders", to: "/purchases/purchase-orders" });
    } else if (sub === "grns") {
      items.push({ label: "Goods Receipt Notes", to: "/purchases/grns" });
    } else if (sub === "vendors") {
      items.push({ label: "Suppliers & Vendors", to: "/purchases/vendors" });
    } else if (sub === "bills") {
      items.push({ label: "Bills & Invoices", to: "/purchases/bills" });
    } else if (sub === "items") {
      items.push({ label: "Items", to: "/purchases/items" });
    } else if (sub === "item-types") {
      items.push({ label: "Item Types", to: "/purchases/item-types" });
    } else if (sub === "unit-types") {
      items.push({ label: "Unit Types", to: "/purchases/unit-types" });
    }
    return items;
  }

  if (pathname.startsWith("/clinical/")) {
    items.push({ label: "Clinical", to: "/clinical/immunization" });
    const sub = pathname.replace("/clinical/", "");
    if (sub === "immunization") {
      items.push({ label: "Immunization History", to: "/clinical/immunization" });
    }
    return items;
  }
  
    if (pathname.startsWith("/admin/")) {
      items.push({ label: "Admin Console", to: "/admin/users" });
      const sub = pathname.replace("/admin/", "");
      if (sub === "users") {
        items.push({ label: "User Management", to: "/admin/users" });
      } else if (sub === "hospital") {
        items.push({ label: "Hospital Profile", to: "/admin/hospital" });
      } else if (sub === "payroll") {
        items.push({ label: "Payroll statutory", to: "/admin/payroll" });
      } else if (sub === "localization") {
        items.push({ label: "Localization", to: "/admin/localization" });
      }
      return items;
    }
  
  return items;
};

export function Shell() {
  const router = useRouter();
  const location = useLocation();
  const search = useStore(uiStore, (state) => state.search);
  const session = authClient.useSession();
  const hospital = useHospitalSettings();
  const [hrOpen, setHrOpen] = React.useState(false);
  const [clinicalOpen, setClinicalOpen] = React.useState(false);
  const [accountsOpen, setAccountsOpen] = React.useState(false);
  const [purchasesOpen, setPurchasesOpen] = React.useState(false);
  const [purchasesMastersOpen, setPurchasesMastersOpen] = React.useState(false);
  const [mastersOpen, setMastersOpen] = React.useState(false);
  const [adminOpen, setAdminOpen] = React.useState(false);
  const [isSidebarMinimized, setIsSidebarMinimized] = React.useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  
  const staffQuery = useRpcQuery<any[]>(["staff"], () => client.hr.staff.$get());
  const currentStaff = staffQuery.data?.find(
    (s: any) => s.email === session.data?.user?.email || (s.userId && s.userId === session.data?.user?.id)
  );
  
  const displayName = currentStaff?.name || session.data?.user?.name;
  const isAccountsVisible = session.data?.user?.role === "admin" || currentStaff?.departmentName === "Accounts";
  
  // Notification system state and hooks
  const { notifications } = useStore(notificationsStore);
  const unreadCount = notifications.filter((n) => !n.read).length;
  const [notificationsOpen, setNotificationsOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Chat system global state and unread count
  const chatState = useStore(chatStore);
  const totalChatUnread = chatState.conversations.reduce((sum, c) => sum + c.unread, 0);

  React.useEffect(() => {
    notificationsActions.fetchNotifications();
    notificationsActions.connectSSE();

    chatActions.fetchConversations();
    chatActions.connectSSE();

    return () => {
      notificationsActions.disconnectSSE();
      chatActions.disconnectSSE();
    };
  }, []);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const signOut = async () => {
    await authClient.signOut();
    await router.invalidate();
    await router.navigate({ to: "/login", search: { redirect: "/" } });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Mobile Sidebar Overlay Backdrop */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <aside 
        className={cn(
          "fixed inset-y-0 left-0 border-r py-6 transition-all duration-300 z-50",
          // Desktop behavior
          "hidden lg:block bg-sidebar/95 backdrop-blur",
          isSidebarMinimized ? "lg:w-16 lg:px-2" : "lg:w-72 lg:px-5",
          // Mobile overlay behavior
          isMobileMenuOpen ? "block w-72 px-5 shadow-2xl bg-sidebar text-sidebar-foreground border-r border-sidebar-border" : "hidden"
        )}
      >
        {/* Minimize Button */}
        <button
          onClick={() => setIsSidebarMinimized(!isSidebarMinimized)}
          className="absolute -right-3 top-8 z-40 hidden lg:flex size-6 items-center justify-center rounded-full border bg-lime-500/80 shadow-md hover:bg-blue-600 cursor-pointer transition-colors"
          title={isSidebarMinimized ? "Expand Sidebar" : "Minimize Sidebar"}
        >
          {isSidebarMinimized ? <ChevronRight size={24} /> : <ChevronLeft size={24} />}
        </button>

        {/* Logo Section */}
        <div className={cn("mb-8 flex items-center justify-between gap-3", isSidebarMinimized && "justify-center")}>
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-lg bg-primary text-primary-foreground shrink-0">
              <Activity size={24} />
            </div>
            {!isSidebarMinimized && (
              <div>
                <p className="text-sm text-muted-foreground">Acme ERP</p>
                <h1 className="text-xl font-semibold truncate max-w-[170px]" title={hospital.name}>
                  {hospital.name}
                </h1>
              </div>
            )}
          </div>
          {isMobileMenuOpen && (
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden shrink-0"
              onClick={() => setIsMobileMenuOpen(false)}
              title="Close Menu"
            >
              <X size={18} />
            </Button>
          )}
        </div>

        {/* Navigation */}
        <nav 
          onClick={() => setIsMobileMenuOpen(false)}
          className={cn("space-y-1.5", isSidebarMinimized && "space-y-3 flex flex-col items-center")}
        >

          {/* Expanded Sidebar Navigation */}
          {!isSidebarMinimized ? (
            <>
              {/* Dashboard */}
              <Link
                to="/"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
                activeProps={{ className: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground" }}
              >
                <LayoutDashboard size={18} />
                Dashboard
              </Link>

              {/* Communication */}
              <Link
                to="/communication"
                className="flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
                activeProps={{ className: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground" }}
              >
                <div className="flex items-center gap-3">
                  <MessageSquare size={18} />
                  <span>Communication</span>
                </div>
                {totalChatUnread > 0 && (
                  <span className="h-5 min-w-5 px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center shadow-xs">
                    {totalChatUnread > 99 ? "99+" : totalChatUnread}
                  </span>
                )}
              </Link>

              {/* Collapsible HR group */}
              <div className="flex flex-col">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setHrOpen(!hrOpen);
                  }}
                  className="flex items-center justify-between w-full rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground cursor-pointer outline-none"
                >
                  <div className="flex items-center gap-3">
                    <Users size={18} />
                    <span>HR Management</span>
                  </div>
                  {hrOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>
                
                {hrOpen && (
                  <div className="mt-1 ml-4 pl-4 border-l border-border flex flex-col gap-1">
                    <Link
                      to="/hr/staff-list"
                      className="flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                      activeProps={{ className: "text-[hsl(174_88%_26%)] dark:text-teal-400 font-bold bg-muted" }}
                    >
                      Employee Details
                    </Link>
                    <Link
                      to="/hr/roster"
                      className="flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                      activeProps={{ className: "text-[hsl(174_88%_26%)] dark:text-teal-400 font-bold bg-muted" }}
                    >
                      Shift Roster
                    </Link>
                    <Link
                      to="/hr/leaves"
                      className="flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                      activeProps={{ className: "text-[hsl(174_88%_26%)] dark:text-teal-400 font-bold bg-muted" }}
                    >
                      Leave Management
                    </Link>
                    <Link
                      to="/hr/attendance"
                      className="flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                      activeProps={{ className: "text-[hsl(174_88%_26%)] dark:text-teal-400 font-bold bg-muted" }}
                    >
                      Attendance
                    </Link>
                    <Link
                      to="/hr/payroll"
                      className="flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                      activeProps={{ className: "text-[hsl(174_88%_26%)] dark:text-teal-400 font-bold bg-muted" }}
                    >
                      Payroll
                    </Link>
                    {(session.data?.user?.role === "admin" || session.data?.user?.role === "hr") && (
                      <Link
                        to="/admin/users"
                        className="flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                        activeProps={{ className: "text-[hsl(174_88%_26%)] dark:text-teal-400 font-bold bg-muted" }}
                      >
                        User Management
                      </Link>
                    )}
                  </div>
                )}
              </div>

              {/* <div className="flex flex-col">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setClinicalOpen(!clinicalOpen);
                  }}
                  className="flex items-center justify-between w-full rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground cursor-pointer outline-none"
                >
                  <div className="flex items-center gap-3">
                    <Syringe size={18} />
                    <span>Clinical</span>
                  </div>
                  {clinicalOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>
                {clinicalOpen && (
                  <div className="mt-1 ml-4 pl-4 border-l border-border flex flex-col gap-1">
                    <Link
                      to="/clinical/immunization"
                      className="flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                      activeProps={{ className: "text-[hsl(174_88%_26%)] dark:text-teal-400 font-bold bg-muted" }}
                    >
                      Immunization History
                    </Link>
                  </div>
                )}
              </div> */}

              {/* Collapsible Accounts group */}
              {isAccountsVisible && (
                <div className="flex flex-col">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setAccountsOpen(!accountsOpen);
                    }}
                    className="flex items-center justify-between w-full rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground cursor-pointer outline-none"
                  >
                    <div className="flex items-center gap-3">
                      <Landmark size={18} />
                      <span>Accounts</span>
                    </div>
                    {accountsOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </button>
                  {accountsOpen && (
                    <div className="mt-1 ml-4 pl-4 border-l border-border flex flex-col gap-1">
                      <Link
                        to="/accounts/consultant-charges"
                        className="flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                        activeProps={{ className: "text-[hsl(174_88%_26%)] dark:text-teal-400 font-bold bg-muted" }}
                      >
                        Consultant Charges
                      </Link>
                      <Link
                        to="/accounts/service-charges"
                        className="flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                        activeProps={{ className: "text-[hsl(174_88%_26%)] dark:text-teal-400 font-bold bg-muted" }}
                      >
                        Service Charges
                      </Link>
                      <Link
                        to="/accounts/reports"
                        className="flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                        activeProps={{ className: "text-[hsl(174_88%_26%)] dark:text-teal-400 font-bold bg-muted" }}
                      >
                        Daily Closing Reports
                      </Link>
                    </div>
                  )}
                </div>
              )}

              {/* Collapsible Purchases group */}
              <div className="flex flex-col">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setPurchasesOpen(!purchasesOpen);
                  }}
                  className="flex items-center justify-between w-full rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground cursor-pointer outline-none"
                >
                  <div className="flex items-center gap-3">
                    <ShoppingCart size={18} />
                    <span>Purchases</span>
                  </div>
                  {purchasesOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>
                {purchasesOpen && (
                  <div className="mt-1 ml-4 pl-4 border-l border-border flex flex-col gap-1">
                    <Link
                      to="/purchases/purchase-orders"
                      className="flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                      activeProps={{ className: "text-[hsl(174_88%_26%)] dark:text-teal-400 font-bold bg-muted" }}
                    >
                      Purchase Orders
                    </Link>
                    <Link
                      to="/purchases/grns"
                      className="flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                      activeProps={{ className: "text-[hsl(174_88%_26%)] dark:text-teal-400 font-bold bg-muted" }}
                    >
                      Goods Receipt Notes
                    </Link>
                    <Link
                      to="/purchases/bills"
                      className="flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                      activeProps={{ className: "text-[hsl(174_88%_26%)] dark:text-teal-400 font-bold bg-muted" }}
                    >
                      Bills & Invoices
                    </Link>
                    
                    {/* Collapsible Purchases Masters subgroup */}
                    <div className="flex flex-col">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPurchasesMastersOpen(!purchasesMastersOpen);
                        }}
                        className="flex items-center justify-between w-full rounded-md px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors outline-none cursor-pointer"
                      >
                        <span>Masters</span>
                        {purchasesMastersOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </button>
                      {purchasesMastersOpen && (
                        <div className="mt-0.5 ml-3 pl-3 border-l border-border flex flex-col gap-1">
                          <Link
                            to="/purchases/vendors"
                            className="flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                            activeProps={{ className: "text-[hsl(174_88%_26%)] dark:text-teal-400 font-bold bg-muted" }}
                          >
                            Suppliers & Vendors
                          </Link>
                          <Link
                            to="/purchases/items"
                            className="flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                            activeProps={{ className: "text-[hsl(174_88%_26%)] dark:text-teal-400 font-bold bg-muted" }}
                          >
                            Items
                          </Link>
                          <Link
                            to="/purchases/item-types"
                            className="flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                            activeProps={{ className: "text-[hsl(174_88%_26%)] dark:text-teal-400 font-bold bg-muted" }}
                          >
                            Item Types
                          </Link>
                          <Link
                            to="/purchases/unit-types"
                            className="flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                            activeProps={{ className: "text-[hsl(174_88%_26%)] dark:text-teal-400 font-bold bg-muted" }}
                          >
                            Unit Types
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Collapsible Masters group */}
              {(session.data?.user.role === "admin"||session.data?.user.role === "hr") && (
                <div className="flex flex-col">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setMastersOpen(!mastersOpen);
                    }}
                    className="flex items-center justify-between w-full rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground cursor-pointer outline-none"
                  >
                    <div className="flex items-center gap-3">
                      <Settings size={18} />
                      <span>Masters</span>
                    </div>
                    {mastersOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </button>
                  
                  {mastersOpen && (
                    <div className="mt-1 ml-4 pl-4 border-l border-border flex flex-col gap-1">
                      <Link
                        to="/masters/roles"
                        className="flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                        activeProps={{ className: "text-[hsl(174_88%_26%)] dark:text-teal-400 font-bold bg-muted" }}
                      >
                        Roles
                      </Link>
                      <Link
                        to="/masters/leave-types"
                        className="flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                        activeProps={{ className: "text-[hsl(174_88%_26%)] dark:text-teal-400 font-bold bg-muted" }}
                      >
                        Leave Types
                      </Link>
                      <Link
                        to="/masters/departments"
                        className="flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                        activeProps={{ className: "text-[hsl(174_88%_26%)] dark:text-teal-400 font-bold bg-muted" }}
                      >
                        Departments
                      </Link>
                      <Link
                        to="/masters/shifts"
                        className="flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                        activeProps={{ className: "text-[hsl(174_88%_26%)] dark:text-teal-400 font-bold bg-muted" }}
                      >
                        Shifts
                      </Link>
                      <Link
                        to="/masters/salary-templates"
                        className="flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                        activeProps={{ className: "text-[hsl(174_88%_26%)] dark:text-teal-400 font-bold bg-muted" }}
                      >
                        Salary Templates
                      </Link>
                      <Link
                        to="/masters/banks"
                        className="flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                        activeProps={{ className: "text-[hsl(174_88%_26%)] dark:text-teal-400 font-bold bg-muted" }}
                      >
                        Banks
                      </Link>
                    </div>
                  )}
                </div>
              )}

              {/* Collapsible Admin Console group */}
              {session.data?.user.role === "admin" && (
                <div className="flex flex-col">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setAdminOpen(!adminOpen);
                    }}
                    className="flex items-center justify-between w-full rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground cursor-pointer outline-none"
                  >
                    <div className="flex items-center gap-3">
                      <ShieldCheck size={18} />
                      <span>Admin Console</span>
                    </div>
                    {adminOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </button>
                  
                  {adminOpen && (
                    <div className="mt-1 ml-4 pl-4 border-l border-border flex flex-col gap-1">
                      <Link
                        to="/admin/users"
                        className="flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                        activeProps={{ className: "text-[hsl(174_88%_26%)] dark:text-teal-400 font-bold bg-muted" }}
                      >
                        User Management
                      </Link>
                      <Link
                        to="/admin/hospital"
                        className="flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                        activeProps={{ className: "text-[hsl(174_88%_26%)] dark:text-teal-400 font-bold bg-muted" }}
                      >
                        Hospital Profile
                      </Link>
                      <Link
                        to="/admin/payroll"
                        className="flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                        activeProps={{ className: "text-[hsl(174_88%_26%)] dark:text-teal-400 font-bold bg-muted" }}
                      >
                        Payroll statutory
                      </Link>
                      <Link
                        to="/admin/localization"
                        className="flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                        activeProps={{ className: "text-[hsl(174_88%_26%)] dark:text-teal-400 font-bold bg-muted" }}
                      >
                        Localization
                      </Link>
                    </div>
                  )}
                </div>
              )}
              
              <Link
                to="/settings"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
                activeProps={{ className: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground" }}
              >
                <Settings size={18} />
                Settings
              </Link>
            </>
          ) : (
            /* Minimized Sidebar Navigation (Icons only) */
            <>
              <Link
                to="/"
                className="flex size-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                activeProps={{ className: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground" }}
                title="Dashboard"
              >
                <LayoutDashboard size={20} />
              </Link>
              
              <Link
                to="/communication"
                className="relative flex size-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                activeProps={{ className: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground" }}
                title="Communication"
              >
                <MessageSquare size={20} />
                {totalChatUnread > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 min-w-4 px-0.5 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center shadow-xs">
                    {totalChatUnread > 99 ? "99+" : totalChatUnread}
                  </span>
                )}
              </Link>
              
              <div className="w-8 h-px bg-border my-2" />

              <Link
                to="/hr/staff-list"
                className="flex size-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                activeProps={{ className: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground" }}
                title="Employee Details"
              >
                <Users size={20} />
              </Link>

              <Link
                to="/hr/roster"
                className="flex size-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                activeProps={{ className: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground" }}
                title="Shift Roster"
              >
                <CalendarDays size={20} />
              </Link>

              <Link
                to="/hr/leaves"
                className="flex size-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                activeProps={{ className: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground" }}
                title="Leave Management"
              >
                <CalendarClock size={20} />
              </Link>

              <Link
                to="/hr/payroll"
                className="flex size-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                activeProps={{ className: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground" }}
                title="Payroll"
              >
                <Receipt size={20} />
              </Link>

              <Link
                to="/clinical/immunization"
                className="flex size-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                activeProps={{ className: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground" }}
                title="Immunization History"
              >
                <Syringe size={20} />
              </Link>

              <div className="w-8 h-px bg-border my-2" />


              {isAccountsVisible && (
                <>
                  <Link
                    to="/accounts/consultant-charges"
                    className="flex size-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    activeProps={{ className: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground" }}
                    title="Consultant Charges"
                  >
                    <Landmark size={20} />
                  </Link>

                  <Link
                    to="/accounts/service-charges"
                    className="flex size-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    activeProps={{ className: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground" }}
                    title="Service Charges"
                  >
                    <Coins size={20} />
                  </Link>

                  <Link
                    to="/accounts/reports"
                    className="flex size-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    activeProps={{ className: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground" }}
                    title="Daily Closing Reports"
                  >
                    <CalendarClock size={20} />
                  </Link>
                </>
              )}

              <div className="w-8 h-px bg-border my-2" />

              <Link
                to="/purchases/purchase-orders"
                className="flex size-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                activeProps={{ className: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground" }}
                title="Purchase Orders"
              >
                <ShoppingCart size={20} />
              </Link>

              <Link
                to="/purchases/vendors"
                className="flex size-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                activeProps={{ className: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground" }}
                title="Suppliers & Vendors"
              >
                <ShoppingBag size={20} />
              </Link>

              <Link
                to="/purchases/bills"
                className="flex size-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                activeProps={{ className: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground" }}
                title="Bills & Invoices"
              >
                <Receipt size={20} />
              </Link>

              <Link
                to="/purchases/items"
                className="flex size-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                activeProps={{ className: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground" }}
                title="Items Master"
              >
                <Package size={20} />
              </Link>

              <Link
                to="/purchases/item-types"
                className="flex size-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                activeProps={{ className: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground" }}
                title="Item Types Master"
              >
                <Layers size={20} />
              </Link>

              <Link
                to="/purchases/unit-types"
                className="flex size-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                activeProps={{ className: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground" }}
                title="Unit Types Master"
              >
                <Scale size={20} />
              </Link>

              {session.data?.user.role === "admin" && (
                <>
                  <div className="w-8 h-px bg-border my-2" />
                  
                  <Link
                    to="/masters/roles"
                    className="flex size-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    activeProps={{ className: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground" }}
                    title="Roles Master"
                  >
                    <ShieldCheck size={20} />
                  </Link>

                  <Link
                    to="/masters/leave-types"
                    className="flex size-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    activeProps={{ className: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground" }}
                    title="Leave Types Master"
                  >
                    <CalendarClock size={20} />
                  </Link>

                  <Link
                    to="/masters/departments"
                    className="flex size-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    activeProps={{ className: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground" }}
                    title="Departments Master"
                  >
                    <Landmark size={20} />
                  </Link>

                  <Link
                    to="/masters/shifts"
                    className="flex size-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    activeProps={{ className: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground" }}
                    title="Shifts Master"
                  >
                    <Clock size={20} />
                  </Link>

                  <Link
                    to="/masters/salary-templates"
                    className="flex size-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    activeProps={{ className: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground" }}
                    title="Salary Templates Master"
                  >
                    <Coins size={20} />
                  </Link>

                  <Link
                    to="/masters/banks"
                    className="flex size-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    activeProps={{ className: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground" }}
                    title="Banks Master"
                  >
                    <Landmark size={20} />
                  </Link>

                  <div className="w-8 h-px bg-border my-2" />

                  <Link
                    to="/admin/users"
                    className="flex size-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    activeProps={{ className: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground" }}
                    title="User Management"
                  >
                    <ShieldCheck size={20} />
                  </Link>

                  <Link
                    to="/admin/hospital"
                    className="flex size-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    activeProps={{ className: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground" }}
                    title="Hospital Profile"
                  >
                    <Building size={20} />
                  </Link>

                  <Link
                    to="/admin/payroll"
                    className="flex size-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    activeProps={{ className: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground" }}
                    title="Payroll statutory defaults"
                  >
                    <Percent size={20} />
                  </Link>

                  <Link
                    to="/admin/localization"
                    className="flex size-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    activeProps={{ className: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground" }}
                    title="Localization"
                  >
                    <Coins size={20} />
                  </Link>
                </>
              )}

              <Link
                to="/settings"
                className="flex size-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                activeProps={{ className: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground" }}
                title="Settings"
              >
                <Settings size={20} />
              </Link>
            </>
          )}
        </nav>


      </aside>
      
      <main className={cn("transition-all duration-300", isSidebarMinimized ? "lg:pl-16" : "lg:pl-72")}>
        <header className="sticky top-0 z-20 border-b bg-background/80 px-4 py-4 backdrop-blur md:px-8">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                className="lg:hidden shrink-0"
                onClick={() => setIsMobileMenuOpen(true)}
                title="Open Navigation"
              >
                <Menu size={18} />
              </Button>
              <div className="flex items-center">
                <nav className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground" aria-label="Breadcrumb">
                  {getBreadcrumbs(location.pathname).map((item, idx, arr) => (
                    <React.Fragment key={item.label}>
                      {idx > 0 && <span className="text-muted-foreground/45 select-none font-normal">/</span>}
                      {idx === arr.length - 1 ? (
                        <span className="text-foreground font-semibold">{item.label}</span>
                      ) : (
                        <Link
                          to={item.to}
                          className="hover:text-foreground transition-colors"
                        >
                          {item.label}
                        </Link>
                      )}
                    </React.Fragment>
                  ))}
                </nav>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* <div className="relative w-full md:w-72">
                <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                <Input value={search} onChange={(event) => uiStore.setState((state) => ({ ...state, search: event.target.value }))} className="pl-9" placeholder="Search records" />
              </div> */}
              <div className="relative" ref={dropdownRef}>
                <Button
                  variant="outline"
                  size="icon"
                  className="relative cursor-pointer"
                  onClick={() => setNotificationsOpen(!notificationsOpen)}
                  title="Notifications"
                >
                  <Bell size={17} />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white ring-2 ring-background">
                      {unreadCount}
                    </span>
                  )}
                </Button>

                {notificationsOpen && (
                  <div className="absolute right-0 mt-2 z-50 w-80 sm:w-96 rounded-lg border bg-popover shadow-xl text-popover-foreground transition-all animate-page-transition">
                    <div className="flex items-center justify-between border-b px-4 py-3">
                      <div className="font-semibold text-sm">Notifications</div>
                      <div className="flex items-center gap-3">
                        {unreadCount > 0 && (
                          <button
                            onClick={() => notificationsActions.clearAll()}
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                          >
                            <Check className="size-3" /> Mark all read
                          </button>
                        )}
                        {notifications.length > 0 && (
                          <button
                            onClick={() => notificationsActions.deleteAll()}
                            className="flex items-center gap-1 text-xs text-rose-500 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer transition-colors"
                          >
                            <Trash2 className="size-3" /> Delete all
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="max-h-[350px] overflow-y-auto divide-y divide-border">
                      {notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground text-xs">
                          <Bell className="size-8 mb-2 opacity-40" />
                          No notifications
                        </div>
                      ) : (
                        notifications.map((n) => {
                          const Icon = {
                            success: CheckCircle,
                            error: AlertCircle,
                            warning: AlertTriangle,
                            info: Info,
                          }[n.type as "success" | "error" | "warning" | "info"] || Info;

                          return (
                            <div
                              key={n.id}
                              className={cn(
                                "flex items-start gap-3 p-4 transition-colors hover:bg-muted/40",
                                !n.read && "bg-primary/5 font-medium"
                              )}
                            >
                              <div
                                className={cn(
                                  "grid size-8 place-items-center rounded-full shrink-0",
                                  n.type === "success" && "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400",
                                  n.type === "error" && "bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400",
                                  n.type === "warning" && "bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400",
                                  n.type === "info" && "bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400"
                                )}
                              >
                                <Icon className="size-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold truncate text-foreground">{n.title}</p>
                                <p className="text-xs text-muted-foreground mt-0.5 whitespace-pre-wrap">{n.message}</p>
                                <div className="flex items-center gap-3 mt-1.5">
                                  {n.link && (
                                    <Link
                                      to={n.link}
                                      onClick={() => {
                                        setNotificationsOpen(false);
                                        if (!n.read) {
                                          notificationsActions.clearNotification(n.id);
                                        }
                                      }}
                                      className="text-[10px] text-teal-600 dark:text-teal-400 hover:underline font-semibold"
                                    >
                                      View action
                                    </Link>
                                  )}
                                  <span className="text-[9px] text-muted-foreground">
                                    {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                {!n.read && (
                                  <button
                                    onClick={() => notificationsActions.clearNotification(n.id)}
                                    className="p-1 rounded-md text-muted-foreground hover:text-foreground cursor-pointer hover:bg-black/5 dark:hover:bg-white/10"
                                    title="Mark as read"
                                  >
                                    <Check className="size-3" />
                                  </button>
                                )}
                                <button
                                  onClick={() => notificationsActions.deleteNotification(n.id)}
                                  className="p-1 rounded-md text-muted-foreground hover:text-rose-500 cursor-pointer hover:bg-black/5 dark:hover:bg-white/10"
                                  title="Delete notification"
                                >
                                  <Trash2 className="size-3" />
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2.5 rounded-lg border bg-muted/50 px-3 py-1.5" title={session.data?.user.email}>
                <ShieldCheck size={14} className="shrink-0 text-muted-foreground" />
                <div className="flex flex-col leading-tight">
                  {displayName && <span className="text-xs font-semibold truncate max-w-[120px]">{displayName}</span>}
                  <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">
                    {session.data?.user.role === "admin" ? "Admin" : "Staff"}
                  </span>
                </div>
              </div>

              <Button variant="outline" size="icon" title="Sign out" onClick={signOut}>
                <LogOut size={17} />
              </Button>
            </div>
          </div>
        </header>
        <section className="px-4 py-6 md:px-8 dark:bg-slate-950">
          <div key={router.state.matches[router.state.matches.length - 1]?.pathname || location.pathname} className="animate-page-transition">
            <Outlet />
          </div>
        </section>
      </main>
    </div>
  );
}
