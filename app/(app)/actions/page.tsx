import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { SectionHeader, EmptyState } from "@/components/ui-components";
import { CheckSquare, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { formatDate } from "@/lib/utils";

function StatusIcon({ status }: { status: string }) {
  if (status === "COMPLETED" || status === "VERIFIED")
    return <CheckCircle2 className="h-4 w-4 text-green-600" />;
  if (status === "OVERDUE")
    return <AlertCircle className="h-4 w-4 text-red-600" />;
  if (status === "IN_PROGRESS")
    return <Clock className="h-4 w-4 text-blue-500" />;
  return <CheckSquare className="h-4 w-4 text-muted-foreground" />;
}

interface ActionItem {
  id: string;
  report_id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  profiles: { full_name: string | null; email: string } | null;
  reports: { report_code: string } | null;
}

function ActionList({ items, emptyTitle }: { items: ActionItem[]; emptyTitle: string }) {
  if (!items?.length) {
    return <EmptyState icon={CheckSquare} title={emptyTitle} />;
  }

  return (
    <div className="divide-y rounded-xl border bg-card">
      {items.map((action) => {
        const assignee = action.profiles;
        const report = action.reports;
        return (
          <div key={action.id} className="flex items-start gap-3 p-4">
            <div className="mt-0.5"><StatusIcon status={action.status} /></div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">{action.title}</p>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                {assignee && (
                  <span>→ {assignee.full_name ?? assignee.email}</span>
                )}
                {action.due_date && (
                  <span className={action.status === "OVERDUE" ? "text-red-600 font-semibold" : ""}>
                    Due: {formatDate(action.due_date)}
                  </span>
                )}
                {report?.report_code && (
                  <Link
                    href={`/reports/${action.report_id}`}
                    className="font-mono text-blue-600 hover:underline"
                  >
                    {report.report_code}
                  </Link>
                )}
                <span className="rounded-full bg-muted px-2 py-0.5">
                  {action.priority}
                </span>
              </div>
              {action.description && (
                <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                  {action.description}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default async function ActionsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles").select("org_id, role").eq("id", user.id).single();
  if (!profile) redirect("/login");

  // Fetch actions — RLS scopes by role
  const { data: actions } = await admin
    .from("actions")
    .select(`*, 
      profiles!assigned_to(full_name, email),
      reports(report_code)
    `)
    .eq("org_id", profile.org_id)
    .order("due_date", { ascending: true, nullsFirst: false })
    .limit(50);

  const typedActions = (actions ?? []) as unknown as ActionItem[];
  const open = typedActions.filter((a) => ["OPEN", "IN_PROGRESS"].includes(a.status));
  const overdue = typedActions.filter((a) => a.status === "OVERDUE");
  const completed = typedActions.filter((a) => ["COMPLETED", "VERIFIED"].includes(a.status));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">CAPA Action Tracker</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Corrective and Preventive Actions across your reports.
        </p>
      </div>

      {overdue.length > 0 && (
        <div>
          <SectionHeader
            title={`⚠ Overdue (${overdue.length})`}
            description="Past their due date — immediate attention required"
          />
          <div className="mt-3">
            <ActionList items={overdue} emptyTitle="No overdue actions" />
          </div>
        </div>
      )}

      <div>
        <SectionHeader
          title={`Open Actions (${open.length})`}
          description="Actions in progress or awaiting start"
        />
        <div className="mt-3">
          <ActionList items={open} emptyTitle="No open actions. Great work!" />
        </div>
      </div>

      <div>
        <SectionHeader
          title={`Completed (${completed.length})`}
        />
        <div className="mt-3">
          <ActionList items={completed} emptyTitle="No completed actions yet" />
        </div>
      </div>
    </div>
  );
}
