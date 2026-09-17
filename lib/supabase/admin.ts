import { createClient } from "@supabase/supabase-js";

/**
 * Admin client using the service role key.
 * MUST only be used on the server — never exposed to the browser.
 * Bypasses RLS — use with extreme care.
 *
 * Returns any-typed client to avoid complex Database generic issues
 * with hand-crafted types. Type safety is enforced at the callsite
 * by explicit return type annotations on each query.
 */
export function createAdminClient(): ReturnType<typeof createClient<any>> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
    );
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
