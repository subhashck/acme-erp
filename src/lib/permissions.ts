import * as React from "react";
import { authClient } from "../services/auth";
import { useRpcQuery } from "./query";

interface ManagementApprover {
  staffId: number;
  active: boolean;
}

export interface UserPermissions {
  currentStaff: any;
  isAdmin: boolean;
  isHr: boolean;
  isAccounts: boolean;
  isAcon: boolean;
  isFrontOffice: boolean;
  isPurchaseAndStore: boolean;
  isDispensary: boolean;
  isManagementApprover: boolean;
  isMagazineEditor: boolean;
  canViewAccounts: boolean;
  canViewHr: boolean;
  canViewCollege: boolean;
  canViewFrontOffice: boolean;
  canViewInventory: boolean;
  canViewPurchases: boolean;
  canManageStores: boolean;
  canManageMagazine: boolean;
  isLoading: boolean;
}

const PermissionsContext = React.createContext<UserPermissions | null>(null);

function useUserPermissionsInternal(providedSession?: any): UserPermissions {
  const hookSession = authClient.useSession();
  const session = providedSession || hookSession;
  const user = session?.user || session?.data?.user;
  const userId = user?.id;

  const staffQuery = useRpcQuery<any>(
    ["current-staff"],
    () => fetch("/api/staff/me"),
    { staleTime: 10 * 60 * 1000 }
  );

  const currentStaff = staffQuery.data || undefined;

  const managementApproversQuery = useRpcQuery<ManagementApprover[]>(
    ["masters-management-approvers"],
    () => fetch("/api/masters/management-approvers"),
    { staleTime: 10 * 60 * 1000 }
  );

  const isManagementApprover = React.useMemo(() => {
    if (currentStaff?.staffId == null) return false;
    const approvers = managementApproversQuery.data;
    if (!approvers || approvers.length === 0) return false;
    return approvers.some(
      (a) => Number(a.staffId) === Number(currentStaff.staffId) && a.active === true
    );
  }, [currentStaff?.staffId, managementApproversQuery.data]);

  const magazineAccessQuery = useRpcQuery<{ isEditor: boolean; isAdmin: boolean }>(
    ["magazine-my-access", userId],
    () => fetch("/api/magazine/my-access"),
    { staleTime: 10 * 60 * 1000, enabled: !!userId }
  );

  const isMagazineEditor = magazineAccessQuery.data?.isEditor ?? false;

  const userRole = (user?.role || "").trim().toLowerCase();
  const staffDept = (currentStaff?.departmentName || "").trim().toUpperCase();

  const isAdmin = userRole === "admin";
  const isHr = userRole === "hr" || (currentStaff?.role || "").toLowerCase() === "hr";
  const isAccounts = staffDept === "ACCOUNTS" || userRole === "accounts";
  const isAcon = staffDept === "ACON" || userRole === "acon";
  const cleanStaffDept = (currentStaff?.departmentName || "").replace(/\s+/g, " ").trim().toUpperCase();
  const isFrontOffice = cleanStaffDept === "FRONT OFFICE";
  const isPurchaseAndStore =
    cleanStaffDept === "PURCHASE AND STORE" ||
    cleanStaffDept === "PURCHASE & STORE" ||
    cleanStaffDept.startsWith("PURCHASE AND STORE");
  const isDispensary = cleanStaffDept === "DISPENSARY" || cleanStaffDept.startsWith("DISPENSARY");

  const canViewAccounts = isAdmin || isAccounts || isManagementApprover;
  const canViewHr = isAdmin || isHr || isManagementApprover;
  const canViewCollege = isAdmin || isAccounts || isAcon;
  const canViewFrontOffice = isAdmin || isFrontOffice;
  const canViewInventory = isAdmin || isPurchaseAndStore || isDispensary;
  const canViewPurchases = isAdmin || isAccounts || isPurchaseAndStore;
  const canManageStores = isAdmin || isManagementApprover;
  const canManageMagazine = isAdmin || userRole === "magazine_editor" || isHr || isMagazineEditor;

  return {
    currentStaff,
    isAdmin,
    isHr,
    isAccounts,
    isAcon,
    isFrontOffice,
    isPurchaseAndStore,
    isDispensary,
    isManagementApprover,
    isMagazineEditor,
    canViewAccounts,
    canViewHr,
    canViewCollege,
    canViewFrontOffice,
    canViewInventory,
    canViewPurchases,
    canManageStores,
    canManageMagazine,
    isLoading: staffQuery.isLoading || managementApproversQuery.isLoading || magazineAccessQuery.isLoading,
  };
}

export function PermissionsProvider({
  children,
  session,
}: {
  children: React.ReactNode;
  session?: any;
}) {
  const permissions = useUserPermissionsInternal(session);
  return React.createElement(PermissionsContext.Provider, { value: permissions }, children);
}

export function useUserPermissions(): UserPermissions {
  const context = React.useContext(PermissionsContext);
  if (context) {
    return context;
  }
  return useUserPermissionsInternal();
}

