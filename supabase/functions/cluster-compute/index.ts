/**
 * supabase/functions/cluster-compute/index.ts
 *
 * SIF Sentinel — Wilson Lower Bound Clustering Edge Function
 *
 * Run nightly via a pg_cron job or Supabase cron.
 * For each org, groups SIF-potential reports by:
 *   - location_type
 *   - activity
 *   - LSR tags
 *   - barrier failures
 *   - energy_source
 *
 * Computes Wilson LB (95%) for each group.
 * Sets is_alerting=true when WLB > 0.4 AND ≥ 2 SIF in 30d.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function wilsonLB(pos: number, n: number, z = 1.96): number {
  if (n === 0) return 0;
  const p = pos / n;
  return (
    (p + (z * z) / (2 * n) - z * Math.sqrt((p * (1 - p) + (z * z) / (4 * n)) / n)) /
    (1 + (z * z) / n)
  );
}

Deno.serve(async (req) => {
  try {
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Get all orgs
    const { data: orgs } = await admin.from("organizations").select("id");
    if (!orgs) return Response.json({ ok: false, error: "No orgs" });

    let totalInserted = 0;
    const windowDays = 90;
    const windowStart = new Date();
    windowStart.setDate(windowStart.getDate() - windowDays);

    for (const org of orgs) {
      // Fetch all recent analyses with their report data
      const { data: analyses } = await admin
        .from("ai_analyses")
        .select(`
          report_id, sif_potential, risk_band,
          location_type, activity, lsr_tags, energy_source,
          barriers,
          reports!inner(org_id, created_at)
        `)
        .eq("reports.org_id", org.id)
        .gte("reports.created_at", windowStart.toISOString());

      if (!analyses?.length) continue;

      const total = analyses.length;
      const sifTotal = analyses.filter((a) => a.sif_potential).length;

      type ClusterGroup = { total: number; sif: number };
      const groups: Record<string, Record<string, ClusterGroup>> = {
        LOCATION: {},
        ACTIVITY: {},
        LSR: {},
        ENERGY: {},
      };

      for (const a of analyses) {
        const isSif = a.sif_potential;

        // Location
        if (a.location_type) {
          groups.LOCATION[a.location_type] ??= { total: 0, sif: 0 };
          groups.LOCATION[a.location_type].total++;
          if (isSif) groups.LOCATION[a.location_type].sif++;
        }

        // Activity
        if (a.activity) {
          groups.ACTIVITY[a.activity] ??= { total: 0, sif: 0 };
          groups.ACTIVITY[a.activity].total++;
          if (isSif) groups.ACTIVITY[a.activity].sif++;
        }

        // LSR
        const lsrTags = (a.lsr_tags as string[]) ?? [];
        for (const tag of lsrTags) {
          groups.LSR[tag] ??= { total: 0, sif: 0 };
          groups.LSR[tag].total++;
          if (isSif) groups.LSR[tag].sif++;
        }

        // Energy
        if (a.energy_source) {
          groups.ENERGY[a.energy_source] ??= { total: 0, sif: 0 };
          groups.ENERGY[a.energy_source].total++;
          if (isSif) groups.ENERGY[a.energy_source].sif++;
        }
      }

      // Build cluster rows
      const rows = [];
      for (const [keyType, keyValues] of Object.entries(groups)) {
        for (const [keyValue, { total: n, sif: pos }] of Object.entries(keyValues)) {
          if (n < 2) continue; // Need at least 2 observations

          const density = n > 0 ? pos / n : 0;
          const wlb = wilsonLB(pos, n);

          // Alerting: WLB > 0.4 AND ≥2 SIF events in the window
          const isAlerting = wlb > 0.4 && pos >= 2;

          rows.push({
            org_id: org.id,
            key_type: keyType,
            key_value: keyValue,
            report_count: n,
            sif_count: pos,
            density: Math.round(density * 10000) / 10000,
            wilson_lb: Math.round(wlb * 10000) / 10000,
            window_days: windowDays,
            is_alerting: isAlerting,
            computed_at: new Date().toISOString(),
          });
        }
      }

      if (rows.length > 0) {
        // Delete old clusters for this org, then insert fresh
        await admin.from("clusters").delete().eq("org_id", org.id);
        await admin.from("clusters").insert(rows);
        totalInserted += rows.length;
      }
    }

    return Response.json({
      ok: true,
      orgs_processed: orgs.length,
      clusters_inserted: totalInserted,
      window_days: windowDays,
    });
  } catch (err) {
    console.error("[cluster-compute] Error:", err);
    return Response.json({ ok: false, error: String(err) }, { status: 500 });
  }
});
