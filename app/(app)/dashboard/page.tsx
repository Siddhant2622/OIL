import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { UserRole } from "@/types/database";

const ROLE_ROUTES: Record<UserRole, string> = {
  ORG_ADMIN: "/dashboard/admin",
  HSE_MANAGER: "/dashboard/hse",
  DEPT_HEAD: "/dashboard/dept-head",
  SUPERVISOR: "/dashboard/supervisor",
  EMPLOYEE: "/dashboard/employee",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role, is_active")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect("/not-registered");
  }

  if (!profile.is_active) {
    redirect("/deactivated");
  }

  redirect(ROLE_ROUTES[profile.role as UserRole] ?? "/dashboard/employee");
}
