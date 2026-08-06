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

  const isAdmin = session.data?.user?.role === "admin";
  const isHr = session.data?.user?.role === "hr" || currentStaff?.role === "hr";
  const isAccounts = currentStaff?.departmentName === "Accounts";

  return {
    currentStaff,
    isAdmin,
    isHr,
    isAccounts,
    isManagementApprover,
    canViewAccounts: isAdmin || isAccounts || isManagementApprover,
    canViewHr: isAdmin || isHr || isManagementApprover,
    isLoading: staffQuery.isLoading || managementApproversQuery.isLoading,
  };
}
