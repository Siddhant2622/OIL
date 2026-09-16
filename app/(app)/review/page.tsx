import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { RiskBadge, EmptyState } from "@/components/ui-components";
import { Eye, AlertTriangle, CheckCircle2 } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

export default async function ReviewQueuePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("org_id, role")
    .eq("id", user.id)
    .single();

  if (!profile || !["HSE_MANAGER", "ORG_ADMIN"].includes(profile.role)) {
    redirect("/dashboard");
  }

  const { data: queueItems, count } = await admin
    .from("reports")
    .select(
      `id, report_code, report_type, status, created_at, description,
       profiles(full_name, email),
       ai_analyses(risk_band, sif_confidence, sif_potential, review_reasons, needs_human_review)`,
      { count: "exact" }
    )
    .eq("org_id", profile.org_id)
    .eq("status", "IN_REVIEW")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Human Review Queue</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {count ?? 0} report{(count ?? 0) !== 1 ? "s" : ""} awaiting
            expert review. As HSE Manager, your verdict overrides the AI.
          </p>
        </div>
      </div>

      {/* Explanation */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-200">
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <strong>Why are reports in the review queue?</strong>
            <ul className="mt-1 ml-4 list-disc space-y-0.5 text-xs">
              <li>AI confidence below 65%</li>
              <li>CRITICAL or immediate-action risk band</li>
              <li>Guardrail fired (e.g., H₂S without detection)</li>
              <li>Dismissive language with high-energy source</li>
              <li>No barriers identified for high-energy scenario</li>
            </ul>
          </div>
        </div>
      </div>

      {!queueItems?.length ? (
        <EmptyState
          icon={CheckCircle2}
          title="Queue is empty"
          description="All SIF-potential reports have been reviewed. Great work!"
        />
      ) : (
        <div className="divide-y rounded-xl border bg-card">
          {queueItems.map((item) => {
            const analysis = Array.isArray(item.ai_analyses)
              ? item.ai_analyses[0]
              : item.ai_analyses;
            const reporter = (Array.isArray(item.profiles) ? item.profiles[0] : item.profiles) as
              | { full_name: string | null; email: string }
              | null;

            return (
              <Link
                key={item.id}
                href={`/reports/${item.id}`}
                className="flex items-start gap-4 p-5 hover:bg-muted/40 transition-colors"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
                  <Eye className="h-5 w-5 text-amber-700 dark:text-amber-300" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">
                      {item.report_code}
                    </span>
                    {analysis?.risk_band && (
                      <RiskBadge
                        band={
                          analysis.risk_band as
                            | "CRITICAL"
                            | "HIGH"
                            | "MEDIUM"
                            | "LOW"
                        }
                      />
                    )}
                    {analysis?.sif_potential && (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">
                        SIF POTENTIAL
                      </span>
                    )}
                    {analysis?.sif_confidence != null && (
                      <span className="text-xs text-muted-foreground">
                        {(analysis.sif_confidence * 100).toFixed(0)}% confidence
                      </span>
                    )}
                  </div>

                  <p className="mt-1.5 text-sm font-medium line-clamp-2">
                    {item.description}
                  </p>

                  {/* Review reasons */}
                  {((analysis?.review_reasons as string[] | undefined) ?? []).length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {(analysis.review_reasons as string[]).map((reason) => (
                        <span
                          key={reason}
                          className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                        >
                          {reason.replace(/_/g, " ")}
                        </span>
                      ))}
                    </div>
                  )}

                  <p className="mt-2 text-xs text-muted-foreground">
                    {formatDateTime(item.created_at)} ·{" "}
                    {item.report_type.replace("_", " ")} ·{" "}
                    {reporter?.full_name ?? reporter?.email}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
