import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { WhatsAppSimulator } from "./whatsapp-simulator";

export const metadata: Metadata = {
  title: "WhatsApp Safety Gateway — SIF Sentinel",
  description: "Experience the SIF Sentinel WhatsApp safety reporting bot and real-time manager alerts.",
};

export default async function WhatsAppPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let userPhone = "+916266770991";

  if (user) {
    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("phone")
      .eq("id", user.id)
      .single();

    if (profile?.phone) {
      userPhone = profile.phone;
    }
  }

  return <WhatsAppSimulator userPhone={userPhone} />;
}
