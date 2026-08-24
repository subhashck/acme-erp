import * as React from "react";
import { authClient } from "../services/auth";
import { useRpcQuery } from "./query";
import { client } from "../services/rpc";

interface ManagementApprover {
  staffId: number;
  active: boolean;
}

export function useUserPermissions() {
  const session = authClient.useSession();

  const staffQuery = useRpcQuery<any[]>(["staff"], () => client.hr.staff.$get());

  const currentStaff = React.useMemo(() => {
    if (!staffQuery.data || !session.data?.user) return undefined;
    const userEmail = session.data.user.email?.trim().toLowerCase();
    const userId = session.data.user.id;
    return staffQuery.data.find(
      (s: any) =>
        (userEmail && s.email && s.email.trim().toLowerCase() === userEmail) ||
        (userId && s.userId && s.userId === userId)
    );
  }, [staffQuery.data, session.data?.user]);

  const managementApproversQuery = useRpcQuery<ManagementApprover[]>(
    ["masters-management-approvers"],
    () => fetch("/api/masters/management-approvers")
  );

  const isManagementApprover = React.useMemo(() => {
    if (currentStaff?.staffId == null) return false;
    const approvers = managementApproversQuery.data;
    if (!approvers || approvers.length === 0) return false;
    return approvers.some(
      (a) => Number(a.staffId) === Number(currentStaff.staffId) && a.active === true
    );
  }, [currentStaff?.staffId, managementApproversQuery.data]);

  const userRole = (session.data?.user?.role || "").trim().toLowerCase();
  const staffDept = (currentStaff?.departmentName || "").trim().toUpperCase();

  const isAdmin = userRole === "admin";
  const isHr = userRole === "hr" || (currentStaff?.role || "").toLowerCase() === "hr";
  const isAccounts = staffDept === "ACCOUNTS" || userRole === "accounts";
  const isAcon = staffDept === "ACON" || userRole === "acon";

  const canViewAccounts = isAdmin || isAccounts || isManagementApprover;
  const canViewHr = isAdmin || isHr || isManagementApprover;
  const canViewCollege = isAdmin || isAccounts || isAcon;
  const canViewInventory = isAdmin || isAccounts || userRole === "inventory" || userRole === "store" || userRole === "pharmacist" || true;
  const canManageStores = isAdmin || isManagementApprover;

  return {
    currentStaff,
    isAdmin,
    isHr,
    isAccounts,
    isAcon,
    isManagementApprover,
    canViewAccounts,
    canViewHr,
    canViewCollege,
    canViewInventory,
    canManageStores,
    isLoading: staffQuery.isLoading || managementApproversQuery.isLoading,
  };
}
