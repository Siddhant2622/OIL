"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { AlertTriangle, Camera, Upload, Flame, BellRing, ArrowRight, CheckCircle2 } from "lucide-react";

const schema = z.object({
  report_type: z.enum(["UNSAFE_ACT", "UNSAFE_CONDITION", "NEAR_MISS", "INCIDENT"]),
  occurred_at: z.string().min(1, "Date and time is required"),
  location_text: z.string().min(1, "Location is required"),
  activity_text: z.string().min(1, "Activity is required"),
  description: z
    .string()
    .min(40, "Description must be at least 40 characters — be specific so the AI can analyse it properly"),
  immediate_action: z.string().optional(),
  reported_severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL", "UNKNOWN"]),
  contractor: z.string().optional(),
  shift: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const REPORT_TYPES = [
  { value: "UNSAFE_ACT", label: "Unsafe Act", color: "border-orange-400 bg-orange-50 text-orange-800" },
  { value: "UNSAFE_CONDITION", label: "Unsafe Condition", color: "border-yellow-400 bg-yellow-50 text-yellow-800" },
  { value: "NEAR_MISS", label: "Near Miss", color: "border-red-400 bg-red-50 text-red-800" },
  { value: "INCIDENT", label: "Incident", color: "border-red-600 bg-red-100 text-red-900" },
];

export default function NewReportPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<{
    id: string;
    report_code: string;
    risk_band?: string | null;
    sif_potential?: boolean;
    is_sensitive?: boolean;
  } | null>(null);

  const [attachments, setAttachments] = useState<
    { name: string; type: string; size: number; url: string }[]
  >([]);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newAttachments: { name: string; type: string; size: number; url: string }[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > 5 * 1024 * 1024) {
        setSubmitError(`File "${file.name}" exceeds 5MB limit`);
        continue;
      }
      const reader = new FileReader();
      const dataUrl = await new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
      newAttachments.push({
        name: file.name,
        type: file.type || "application/octet-stream",
        size: file.size,
        url: dataUrl,
      });
    }
    setAttachments((prev) => [...prev, ...newAttachments]);
  }

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      report_type: "UNSAFE_ACT",
      reported_severity: "UNKNOWN",
      occurred_at: new Date().toISOString().slice(0, 16),
    },
  });

  const selectedType = watch("report_type");

  async function onSubmit(data: FormData) {
    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, attachments }),
      });

      const json = await res.json();

      if (!res.ok) {
        setSubmitError(json.error ?? "Submission failed.");
        return;
      }

      // If sensitive or scanned, show the confirmation screen
      if (json.is_sensitive) {
        setScanResult(json);
      } else {
        router.push(`/reports/${json.id}`);
      }
    } catch (err) {
      setSubmitError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (scanResult) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div
          className={`rounded-2xl border p-6 sm:p-8 ${
            scanResult.is_sensitive
              ? "border-red-300 bg-red-50/70 dark:border-red-900/80 dark:bg-red-950/30"
              : "border-green-300 bg-green-50/70 dark:border-green-900/80 dark:bg-green-950/30"
          }`}
        >
          <div className="flex items-start gap-4">
            <div
              className={`rounded-xl p-3 shrink-0 ${
                scanResult.is_sensitive
                  ? "bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400"
                  : "bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-400"
              }`}
            >
              {scanResult.is_sensitive ? (
                <Flame className="h-8 w-8" />
              ) : (
                <CheckCircle2 className="h-8 w-8" />
              )}
            </div>

            <div className="space-y-3 flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs font-bold text-muted-foreground">
                  {scanResult.report_code}
                </span>
                {scanResult.risk_band && (
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-extrabold ${
                      scanResult.risk_band === "CRITICAL"
                        ? "bg-red-600 text-white"
                        : scanResult.risk_band === "HIGH"
                        ? "bg-orange-600 text-white"
                        : "bg-blue-600 text-white"
                    }`}
                  >
                    {scanResult.risk_band}
                  </span>
                )}
              </div>

              <h2 className="text-xl font-bold text-foreground">
                {scanResult.is_sensitive
                  ? "🚨 Sensitive SIF Precursor Detected & Alert Sent"
                  : "Report Uploaded & Scanned Successfully"}
              </h2>

              <p className="text-sm text-foreground/80 leading-relaxed">
                {scanResult.is_sensitive
                  ? `SIF Sentinel AI directly scanned your report upon upload and identified a ${scanResult.risk_band} risk precursor. Immediate in-app notifications and email alerts have been automatically dispatched to HSE Managers and your manager chain.`
                  : "The AI safety engine directly analyzed your observation. No critical life-threatening precursor was detected."}
              </p>

              {scanResult.is_sensitive && (
                <div className="rounded-xl border border-red-200 dark:border-red-900/40 bg-card/60 p-3.5 text-xs space-y-1.5">
                  <div className="flex items-center gap-1.5 font-semibold text-red-700 dark:text-red-400">
                    <BellRing className="h-4 w-4" /> Automated Notifications Dispatched
                  </div>
                  <p className="text-muted-foreground">
                    ✓ In-app alert logged for all HSE personnel and management hierarchy.
                  </p>
                  <p className="text-muted-foreground">
                    ✓ Report moved to Priority Review Queue for immediate CAPA verification.
                  </p>
                </div>
              )}

              <div className="pt-3 flex flex-wrap items-center gap-3">
                <button
                  onClick={() => router.push(`/reports/${scanResult.id}`)}
                  className="rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground hover:opacity-90 flex items-center gap-2 shadow-sm"
                >
                  View Full Report &amp; Evidence
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  onClick={() => {
                    setScanResult(null);
                    router.push("/reports");
                  }}
                  className="rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold hover:bg-muted text-foreground"
                >
                  Back to Reports
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const inputClass =
    "w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition";
  const labelClass = "mb-1.5 block text-sm font-semibold text-foreground";
  const errorClass = "mt-1 text-xs text-red-600";

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Report a Hazard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Be as specific as possible — the AI needs the full picture to assess SIF potential.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Report Type — large tap targets for mobile */}
        <fieldset>
          <legend className={labelClass}>
            Report type <span className="text-red-500">*</span>
          </legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {REPORT_TYPES.map((type) => (
              <label
                key={type.value}
                className={`cursor-pointer rounded-xl border-2 p-3 text-center text-sm font-semibold transition ${
                  selectedType === type.value
                    ? type.color + " shadow-sm"
                    : "border-border bg-card text-muted-foreground hover:border-primary/40"
                }`}
              >
                <input
                  type="radio"
                  value={type.value}
                  className="sr-only"
                  {...register("report_type")}
                />
                {type.label}
              </label>
            ))}
          </div>
          {errors.report_type && (
            <p className={errorClass}>{errors.report_type.message}</p>
          )}
        </fieldset>

        {/* Date/Time */}
        <div>
          <label className={labelClass} htmlFor="occurred_at">
            Date &amp; time of observation <span className="text-red-500">*</span>
          </label>
          <input
            id="occurred_at"
            type="datetime-local"
            className={inputClass}
            {...register("occurred_at")}
          />
          {errors.occurred_at && (
            <p className={errorClass}>{errors.occurred_at.message}</p>
          )}
        </div>

        {/* Location */}
        <div>
          <label className={labelClass} htmlFor="location_text">
            Location <span className="text-red-500">*</span>
          </label>
          <input
            id="location_text"
            placeholder="e.g. Well Pad A, Rig Floor, Pump Room 3B"
            className={inputClass}
            {...register("location_text")}
          />
          {errors.location_text && (
            <p className={errorClass}>{errors.location_text.message}</p>
          )}
        </div>

        {/* Activity */}
        <div>
          <label className={labelClass} htmlFor="activity_text">
            What activity was underway? <span className="text-red-500">*</span>
          </label>
          <input
            id="activity_text"
            placeholder="e.g. Routine pipe inspection, drilling operations, hot work"
            className={inputClass}
            {...register("activity_text")}
          />
          {errors.activity_text && (
            <p className={errorClass}>{errors.activity_text.message}</p>
          )}
        </div>

        {/* Description — the most important field */}
        <div>
          <label className={labelClass} htmlFor="description">
            What did you observe? <span className="text-red-500">*</span>
          </label>
          <p className="mb-1.5 text-xs text-muted-foreground">
            Include: what happened, what could have gone wrong, who was involved,
            what barriers were missing or failed. Minimum 40 characters.
          </p>
          <textarea
            id="description"
            rows={6}
            placeholder="e.g. Worker was observed entering the confined space of tank TK-204 without a gas test being conducted first. The PTW was not signed. No standby person was present outside..."
            className={inputClass + " resize-none leading-relaxed"}
            {...register("description")}
          />
          {errors.description && (
            <p className={errorClass}>{errors.description.message}</p>
          )}
        </div>

        {/* Immediate action */}
        <div>
          <label className={labelClass} htmlFor="immediate_action">
            Immediate action taken
          </label>
          <textarea
            id="immediate_action"
            rows={3}
            placeholder="e.g. Work stopped immediately, supervisor notified, area cordoned off"
            className={inputClass + " resize-none"}
            {...register("immediate_action")}
          />
        </div>

        {/* Reported severity */}
        <div>
          <label className={labelClass} htmlFor="reported_severity">
            Your severity assessment
          </label>
          <p className="mb-1.5 text-xs text-muted-foreground">
            Note: The AI makes its own assessment independently.
          </p>
          <select
            id="reported_severity"
            className={inputClass}
            {...register("reported_severity")}
          >
            <option value="UNKNOWN">I&apos;m not sure</option>
            <option value="LOW">Low — minor, no injury potential</option>
            <option value="MEDIUM">Medium — could cause an injury</option>
            <option value="HIGH">High — significant injury potential</option>
            <option value="CRITICAL">Critical — could be fatal</option>
          </select>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Contractor */}
          <div>
            <label className={labelClass} htmlFor="contractor">
              Contractor involved (if any)
            </label>
            <input
              id="contractor"
              placeholder="e.g. XYZ Drilling Services"
              className={inputClass}
              {...register("contractor")}
            />
          </div>

          {/* Shift */}
          <div>
            <label className={labelClass} htmlFor="shift">
              Shift
            </label>
            <select id="shift" className={inputClass} {...register("shift")}>
              <option value="">Not specified</option>
              <option value="Day">Day</option>
              <option value="Night">Night</option>
              <option value="Morning">Morning</option>
              <option value="Evening">Evening</option>
            </select>
          </div>
        </div>

        {/* Optional Photo / PDF Attachments */}
        <div>
          <label className={labelClass}>
            Optional Photo / PDF Attachments
          </label>
          <p className="mb-2 text-xs text-muted-foreground">
            Attach site photos, equipment images, or PTW/JSA documents (max 5MB each).
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-input bg-background/50 px-4 py-2.5 text-xs font-medium text-muted-foreground transition hover:border-primary hover:text-foreground">
              <Camera className="h-4 w-4 text-orange-500" />
              <span>Attach Photo or PDF</span>
              <input
                type="file"
                accept="image/*,.pdf"
                multiple
                className="hidden"
                onChange={handleFileSelect}
              />
            </label>
          </div>

          {attachments.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {attachments.map((att, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-1.5 text-xs"
                >
                  <span className="max-w-[200px] truncate font-medium text-foreground">
                    {att.name}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    ({Math.round(att.size / 1024)} KB)
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setAttachments((prev) => prev.filter((_, i) => i !== idx))
                    }
                    className="text-muted-foreground hover:text-red-500 font-bold ml-1"
                    title="Remove attachment"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Error */}
        {submitError && (
          <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/20 dark:text-red-300">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            {submitError}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-orange-600 py-4 text-base font-bold text-white shadow-lg shadow-orange-900/20 transition hover:bg-orange-500 disabled:opacity-60"
          id="submit-report-btn"
        >
          {submitting
            ? "Submitting & running direct AI scan…"
            : "Submit Report"}
        </button>

        <p className="text-center text-xs text-muted-foreground">
          Your report will be immediately analysed by the SIF Sentinel AI engine.
        </p>
      </form>
    </div>
  );
}
