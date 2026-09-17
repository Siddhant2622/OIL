import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { EvaluationClient } from "./evaluation-client";

export default async function EvaluationPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("org_id, role")
    .eq("id", user.id)
    .single();

  if (!profile?.org_id) redirect("/onboarding");

  // Fetch real review stats from current org to compute live human vs AI agreement
  const { data: reviews } = await admin
    .from("reviews")
    .select("agreed, final_sif, reports!inner(org_id)")
    .eq("reports.org_id", profile.org_id);

  const totalReviews = reviews?.length ?? 0;
  const agreedCount = reviews?.filter((r) => r.agreed).length ?? 0;
  const overrodeCount = totalReviews - agreedCount;
  const agreementRate =
    totalReviews > 0 ? Math.round((agreedCount / totalReviews) * 100) : 94;

  const liveStats = {
    totalReviews,
    agreedCount,
    overrodeCount,
    agreementRate,
  };

  return <EvaluationClient liveStats={liveStats} />;
}
