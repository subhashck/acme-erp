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
  isDoctorCandidate: boolean;
  isDoctorCbtAdmin: boolean;
  isExternalDoctor: boolean;
  canViewDoctorCbt: boolean;
  canManageDoctorCbt: boolean;
  canViewAccounts: boolean;
  canViewHr: boolean;
  canViewAssessments: boolean;
  canViewCollege: boolean;
  canViewFrontOffice: boolean;
  canViewInventory: boolean;
  canViewPurchases: boolean;
  canManageStores: boolean;
  canViewDashboard: boolean;
  isLoading: boolean;
}

const PermissionsContext = React.createContext<UserPermissions | null>(null);

function useUserPermissionsInternal(providedSession?: any): UserPermissions {
  const hookSession = authClient.useSession();
  const session = providedSession || hookSession;
  const user = session?.user || session?.data?.user;

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

  const doctorCbtMeQuery = useRpcQuery<any>(
    ["doctor-cbt-me"],
    () => fetch("/api/doctor-cbt/me"),
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

  const isDoctorCandidate = userRole === "doctor_candidate" || Boolean(doctorCbtMeQuery.data?.isCandidate);
  const isDoctorCbtAdmin = isAdmin || Boolean(doctorCbtMeQuery.data?.isDoctorCbtAdmin);
  const isExternalDoctor = (userRole === "doctor_candidate" || Boolean(doctorCbtMeQuery.data?.isCandidate)) && !currentStaff?.staffId && !isAdmin;
  const canViewDoctorCbt = isAdmin || isDoctorCbtAdmin || isDoctorCandidate;
  const canManageDoctorCbt = isAdmin || isDoctorCbtAdmin;

  const canViewAccounts = !isExternalDoctor && (isAdmin || isAccounts || isManagementApprover);
  const canViewHr = !isExternalDoctor && (isAdmin || isHr || isManagementApprover);
  const canViewCollege = !isExternalDoctor && (isAdmin || isAccounts || isAcon);
  const canViewFrontOffice = !isExternalDoctor && (isAdmin || isFrontOffice);
  const canViewInventory = !isExternalDoctor && (isAdmin || isPurchaseAndStore || isDispensary);
  const canViewPurchases = !isExternalDoctor && (isAdmin || isAccounts || isPurchaseAndStore);
  const canManageStores = !isExternalDoctor && (isAdmin || isManagementApprover);
  const canViewAssessments = !isExternalDoctor && (isAdmin || isHr || Boolean(currentStaff?.staffId));
  const canViewDashboard = !isExternalDoctor && (isAdmin || isManagementApprover);

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
    isDoctorCandidate,
    isDoctorCbtAdmin,
    isExternalDoctor,
    canViewDoctorCbt,
    canManageDoctorCbt,
    canViewAccounts,
    canViewHr,
    canViewAssessments,
    canViewCollege,
    canViewFrontOffice,
    canViewInventory,
    canViewPurchases,
    canManageStores,
    canViewDashboard,
    isLoading: staffQuery.isLoading || managementApproversQuery.isLoading,
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

