import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DemoClient } from "./demo-client";

export default async function DemoPage() {
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

  const { data: sites } = await admin
    .from("sites")
    .select("id, name")
    .eq("org_id", profile.org_id)
    .order("name", { ascending: true });

  return <DemoClient sites={sites || []} />;
}
