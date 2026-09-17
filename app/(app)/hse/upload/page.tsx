"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileText, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";

interface UploadResult {
  total: number;
  created: number;
  scanned?: number;
  sensitive_count?: number;
  errors: string[];
  report_ids: string[];
}

export default function BulkUploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped?.name.endsWith(".csv")) setFile(dropped);
    else setError("Please upload a .csv file");
  }, []);

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/reports/bulk", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? "Upload failed");
      } else {
        setResult(json);
      }
    } catch {
      setError("Network error during upload");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Bulk CSV Upload</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload multiple reports at once. Each row becomes a report and is
          queued for AI analysis.
        </p>
      </div>

      {/* CSV format guide */}
      <div className="rounded-xl border bg-card p-5">
        <h2 className="mb-2 font-semibold text-sm">Required CSV columns</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs table-dense">
            <thead>
              <tr className="border-b">
                <th className="py-1.5 text-left font-mono font-semibold">Column</th>
                <th className="py-1.5 text-left">Required?</th>
                <th className="py-1.5 text-left">Example</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {[
                ["report_type", "Yes", "UNSAFE_ACT"],
                ["occurred_at", "Yes", "2026-08-01 14:30"],
                ["description", "Yes", "Worker seen without PPE..."],
                ["location_text", "No", "Pump Room 3B"],
                ["activity_text", "No", "Routine Inspection"],
                ["immediate_action", "No", "Work stopped"],
                ["reported_severity", "No", "HIGH"],
              ].map(([col, req, ex]) => (
                <tr key={col}>
                  <td className="py-1.5 font-mono text-blue-600">{col}</td>
                  <td className="py-1.5 text-muted-foreground">{req}</td>
                  <td className="py-1.5 text-muted-foreground">{ex}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`rounded-xl border-2 border-dashed p-10 text-center transition-colors cursor-pointer ${
          dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
        }`}
        onClick={() => document.getElementById("csv-input")?.click()}
      >
        <input
          id="csv-input"
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) setFile(f);
          }}
        />
        <Upload className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
        {file ? (
          <div>
            <p className="font-semibold">{file.name}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {(file.size / 1024).toFixed(1)} KB
            </p>
          </div>
        ) : (
          <>
            <p className="font-semibold">Drop a CSV here or click to browse</p>
            <p className="mt-1 text-sm text-muted-foreground">Max 5MB · .csv only</p>
          </>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {file && !result && (
        <button
          onClick={handleUpload}
          disabled={uploading}
          className="w-full rounded-xl bg-primary py-3.5 text-sm font-bold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
          id="bulk-upload-btn"
        >
          {uploading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Uploading and processing…
            </span>
          ) : (
            `Upload ${file.name}`
          )}
        </button>
      )}

      {result && (
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <h2 className="font-semibold text-foreground text-lg">
              Upload &amp; Direct AI Scan Complete
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="rounded-xl border bg-muted/30 p-3">
              <p className="text-2xl font-bold tabular-nums">{result.total}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Total rows</p>
            </div>
            <div className="rounded-xl border bg-muted/30 p-3">
              <p className="text-2xl font-bold tabular-nums text-green-600">{result.created}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Created</p>
            </div>
            <div className="rounded-xl border bg-muted/30 p-3">
              <p className="text-2xl font-bold tabular-nums text-blue-600">{result.scanned ?? result.created}</p>
              <p className="text-xs text-muted-foreground mt-0.5">AI Scanned</p>
            </div>
            <div className="rounded-xl border bg-muted/30 p-3">
              <p className={`text-2xl font-bold tabular-nums ${(result.sensitive_count ?? 0) > 0 ? "text-red-600" : "text-muted-foreground"}`}>
                {result.sensitive_count ?? 0}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Sensitive SIFs</p>
            </div>
          </div>

          {(result.sensitive_count ?? 0) > 0 && (
            <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
              <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sm">🚨 Sensitive Safety Hazards Detected</p>
                <p className="mt-0.5 leading-relaxed">
                  {result.sensitive_count} report(s) in this upload were flagged as high/critical SIF potential.
                  Emergency in-app notifications and email alerts have been automatically dispatched to managers and HSE teams.
                </p>
              </div>
            </div>
          )}

          {result.errors.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
              <p className="font-semibold mb-1">CSV Errors ({result.errors.length}):</p>
              <ul className="space-y-1">
                {result.errors.slice(0, 5).map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </div>
          )}
          <button
            onClick={() => router.push("/reports")}
            className="w-full rounded-xl bg-green-700 py-2.5 text-sm font-semibold text-white hover:bg-green-600"
          >
            View Reports →
          </button>
        </div>
      )}
    </div>
  );
}
