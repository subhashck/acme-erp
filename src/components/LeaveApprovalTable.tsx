import { Eye } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "../ui/button";
import type { LeaveRow } from "../types";

export function LeaveApprovalTable({ rows }: { rows: LeaveRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="border-b bg-muted/45 text-left text-xs uppercase text-muted-foreground">
            {["Request", "Employee", "Type", "Dates", "Reason", "Actions"].map((label) => <th key={label} className="px-4 py-3 font-semibold">{label}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b last:border-0">
              <td className="px-4 py-3">{row.requestNo}</td>
              <td className="px-4 py-3">{row.staffName}</td>
              <td className="px-4 py-3">{row.leaveType}</td>
              <td className="px-4 py-3">{row.dateRange}</td>
              <td className="px-4 py-3">{row.reason}</td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-2">
                  <Button asChild type="button" size="icon" variant="outline" title="Review leave request">
                    <Link to="/hr/review-leave" search={{ leaveId: row.id }}>
                      <Eye size={16} />
                    </Link>
                  </Button>
                </div>
              </td>
            </tr>
          ))}
          {!rows.length && (
            <tr><td className="px-4 py-8 text-center text-muted-foreground" colSpan={6}>No pending approvals</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
