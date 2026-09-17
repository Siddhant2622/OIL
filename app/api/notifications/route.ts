import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch unread count
  const { count: unreadCount, error: countErr } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .is("read_at", null);

  if (countErr) {
    return NextResponse.json({ error: countErr.message }, { status: 500 });
  }

  // Fetch latest notifications
  const { data: notifications, error: listErr } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(30);

  if (listErr) {
    return NextResponse.json({ error: listErr.message }, { status: 500 });
  }

  return NextResponse.json({
    notifications: notifications ?? [],
    unread_count: unreadCount ?? 0,
  });
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { id, mark_all_read } = body as { id?: string; mark_all_read?: boolean };

  const now = new Date().toISOString();

  if (mark_all_read) {
    const { error } = await supabase
      .from("notifications")
      .update({ read_at: now })
      .eq("user_id", user.id)
      .is("read_at", null);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, marked_all: true });
  }

  if (id) {
    const { error } = await supabase
      .from("notifications")
      .update({ read_at: now })
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, id });
  }

  return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
}
