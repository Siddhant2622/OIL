/**
 * scripts/seed.ts
 *
 * SIF Sentinel — Development seed script.
 * Creates a demo org with synthetic reports for all 9 LSR scenarios.
 *
 * Usage:
 *   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *   npx tsx scripts/seed.ts
 *
 * DO NOT run against production. All data is clearly labelled DEMO.
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing env vars. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DEMO_REPORTS = [
  {
    description:
      "Worker was observed entering confined space of tank TK-204 without a gas test being conducted first. The PTW was not signed off and no standby person was present outside the tank. H2S levels were unknown.",
    report_type: "UNSAFE_ACT",
    location_text: "Tank Farm Area 3",
    activity_text: "Tank Cleaning",
    expected_band: "CRITICAL",
    expected_sif: true,
  },
  {
    description:
      "Working at height on scaffold platform at 6m elevation. No harness lanyard was attached to the anchor point. Worker said it was only for a short time and nothing happened. Minor incident.",
    report_type: "UNSAFE_ACT",
    location_text: "Flare Stack B",
    activity_text: "Scaffold Erection",
    expected_band: "HIGH",
    expected_sif: true,
  },
  {
    description:
      "Hot work was being carried out on Pipe Rack 7 near the NGL separation unit without a hot work permit. No gas test was performed. Welding in hydrocarbon area, luckily no fire.",
    report_type: "NEAR_MISS",
    location_text: "NGL Separation Unit",
    activity_text: "Piping Repair",
    expected_band: "CRITICAL",
    expected_sif: true,
  },
  {
    description:
      "Pressurised gas line (35 bar) was opened by a technician without first isolating and depressurising. No bleed valve was used. The line was live when the flange was unbolted. No injury occurred.",
    report_type: "NEAR_MISS",
    location_text: "Compressor House 2",
    activity_text: "Routine Maintenance",
    expected_band: "CRITICAL",
    expected_sif: true,
  },
  {
    description:
      "A load weighing approximately 2.5 tonnes was being lifted by crane. Workers were observed standing under the suspended load during the lift. The signal man was not in position.",
    report_type: "UNSAFE_ACT",
    location_text: "Laydown Area",
    activity_text: "Material Handling",
    expected_band: "HIGH",
    expected_sif: true,
  },
  {
    description:
      "Company driver observed not wearing seatbelt while driving a crew transport vehicle at 85 km/h in a 60 km/h speed limit area. Two passengers also not belted. Night driving.",
    report_type: "UNSAFE_ACT",
    location_text: "Field Access Road",
    activity_text: "Personnel Transport",
    expected_band: "HIGH",
    expected_sif: true,
  },
  {
    description:
      "Electrical switchgear panel was being worked on by an instrument technician. The panel was still energised (230V AC). No LOTO was applied. No isolation certificate was issued.",
    report_type: "UNSAFE_ACT",
    location_text: "Electrical Room Sub-Station 4",
    activity_text: "Instrument Calibration",
    expected_band: "CRITICAL",
    expected_sif: true,
  },
  {
    description:
      "Excavation for cable trench was 2.2 metres deep. No shoring or benching was in place. Two workers were inside the excavation. The soil type was sandy loam with high collapse risk.",
    report_type: "UNSAFE_CONDITION",
    location_text: "Pipeline Right-of-Way KM 12",
    activity_text: "Cable Trench Excavation",
    expected_band: "HIGH",
    expected_sif: true,
  },
  {
    description:
      "H2S gas detector alarm was sounding at the wellhead. Two workers entered the area to investigate without checking if their personal H2S monitors were calibrated. No breathing apparatus was worn.",
    report_type: "UNSAFE_ACT",
    location_text: "Well Pad A4",
    activity_text: "Well Testing",
    expected_band: "CRITICAL",
    expected_sif: true,
  },
  {
    description:
      "Spillage of approximately 5 litres of diesel from a refuelling hose joint. The ground surface was contaminated. A drip tray was placed underneath after the spill was noticed. Minor housekeeping issue.",
    report_type: "UNSAFE_CONDITION",
    location_text: "Vehicle Workshop",
    activity_text: "Vehicle Refuelling",
    expected_band: "LOW",
    expected_sif: false,
  },
];

async function main() {
  console.log("🌱 Starting SIF Sentinel seed...");

  // Get or create demo org
  let { data: org } = await admin
    .from("organizations")
    .select("id")
    .eq("slug", "demo-oil-india")
    .single();

  if (!org) {
    const { data: newOrg, error } = await admin
      .from("organizations")
      .insert({
        name: "Demo Oil India Limited",
        slug: "demo-oil-india",
        industry: "Oil & Gas - Upstream",
        country: "India",
        domain: "demo.oilindia.in",
        settings: {
          life_saving_rules: [
            "Bypassing Safety Controls",
            "Confined Space",
            "Driving",
            "Energy Isolation",
            "Hot Work",
            "Line of Fire",
            "Safe Mechanical Lifting",
            "Work Authorisation",
            "Working at Height",
          ],
        },
      })
      .select("id")
      .single();

    if (error) {
      console.error("Failed to create demo org:", error.message);
      return;
    }
    org = newOrg;
    console.log("✓ Created demo org:", org!.id);
  } else {
    console.log("✓ Using existing demo org:", org.id);
  }

  // Get the first ORG_ADMIN of the demo org
  const { data: adminProfile } = await admin
    .from("profiles")
    .select("id")
    .eq("org_id", org!.id)
    .eq("role", "ORG_ADMIN")
    .single();

  if (!adminProfile) {
    console.log("⚠ No ORG_ADMIN found for demo org. Create a user first via the UI.");
    return;
  }

  // Seed reports
  let seeded = 0;
  for (const report of DEMO_REPORTS) {
    const { count } = await admin
      .from("reports")
      .select("*", { count: "exact", head: true })
      .eq("org_id", org!.id);

    const seq = (count ?? 0) + 1;
    const year = new Date().getFullYear();
    const report_code = `DEMO-${year}-${String(seq).padStart(6, "0")}`;

    const occurred_at = new Date();
    occurred_at.setDate(occurred_at.getDate() - Math.floor(Math.random() * 60));

    const { error } = await admin.from("reports").insert({
      org_id: org!.id,
      report_code,
      reporter_id: adminProfile.id,
      report_type: report.report_type as
        | "UNSAFE_ACT"
        | "UNSAFE_CONDITION"
        | "NEAR_MISS"
        | "INCIDENT",
      occurred_at: occurred_at.toISOString(),
      location_text: report.location_text,
      activity_text: report.activity_text,
      description: `[DEMO] ${report.description}`,
      source: "SEED",
      status: "SUBMITTED",
    });

    if (error) {
      console.error(`Failed to seed report: ${error.message}`);
    } else {
      seeded++;
      console.log(`✓ Seeded: ${report_code} (expected: ${report.expected_band})`);
    }
  }

  console.log(`\n🎉 Seed complete. ${seeded}/${DEMO_REPORTS.length} reports created.`);
  console.log("Run AI analysis from the dashboard or via /api/analyze for each report.");
}

main().catch(console.error);
