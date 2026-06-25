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
  Coins
} from "lucide-react";
import { authClient } from "../services/auth";
import { uiStore } from "../lib/ui-store";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import * as React from "react";
import { cn } from "../utils/cn";
import { useHospitalSettings } from "../lib/settings";

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
    items.push({ label: "Employee Details", to: "/hr" });
    return items;
  }
  
  if (pathname.startsWith("/hr/")) {
    items.push({ label: "HR Management", to: "/hr/" });
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
  const [hrOpen, setHrOpen] = React.useState(true);
  const [mastersOpen, setMastersOpen] = React.useState(true);
  const [adminOpen, setAdminOpen] = React.useState(true);
  const [isSidebarMinimized, setIsSidebarMinimized] = React.useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

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

              {/* Collapsible HR group */}
              <div className="flex flex-col">
                <button
                  onClick={() => setHrOpen(!hrOpen)}
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
                  </div>
                )}
              </div>

              {/* Collapsible Masters group */}
              {session.data?.user.role === "admin" && (
                <div className="flex flex-col">
                  <button
                    onClick={() => setMastersOpen(!mastersOpen)}
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
                    </div>
                  )}
                </div>
              )}

              {/* Collapsible Admin Console group */}
              {session.data?.user.role === "admin" && (
                <div className="flex flex-col">
                  <button
                    onClick={() => setAdminOpen(!adminOpen)}
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

        {/* Footer Session details */}
        {!isSidebarMinimized ? (
          <div className="absolute inset-x-5 bottom-6 rounded-lg border bg-card p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium">
              <ShieldCheck size={16} />
              {session.data?.user.role === "admin" ? "Admin console" : "Staff console"}
            </div>
            <p className="text-xs leading-5 text-muted-foreground truncate">{session.data?.user.email}</p>
          </div>
        ) : (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-muted-foreground" title={session.data?.user.email || ""}>
            <ShieldCheck size={20} />
          </div>
        )}
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
                    <React.Fragment key={item.to}>
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
              <div className="relative w-full md:w-72">
                <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                <Input value={search} onChange={(event) => uiStore.setState((state) => ({ ...state, search: event.target.value }))} className="pl-9" placeholder="Search records" />
              </div>
              <Button variant="outline" size="icon" title="Sign out" onClick={signOut}>
                <LogOut size={17} />
              </Button>
            </div>
          </div>
        </header>
        <section className="px-4 py-6 md:px-8 dark:bg-slate-950">
          <Outlet />
        </section>
      </main>
    </div>
  );
}
