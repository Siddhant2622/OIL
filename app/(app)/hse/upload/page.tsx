"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileText, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";

interface UploadResult {
  total: number;
  created: number;
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
        <div className="rounded-xl border border-green-200 bg-green-50 p-6 dark:border-green-900 dark:bg-green-950/20">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <h2 className="font-semibold text-green-800 dark:text-green-200">
              Upload Complete
            </h2>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center mb-4">
            <div>
              <p className="text-2xl font-bold tabular-nums">{result.total}</p>
              <p className="text-xs text-muted-foreground">Total rows</p>
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums text-green-600">{result.created}</p>
              <p className="text-xs text-muted-foreground">Created</p>
            </div>
            <div>
              <p className={`text-2xl font-bold tabular-nums ${result.errors.length ? "text-red-600" : ""}`}>
                {result.errors.length}
              </p>
              <p className="text-xs text-muted-foreground">Errors</p>
            </div>
          </div>
          {result.errors.length > 0 && (
            <ul className="mb-4 space-y-1">
              {result.errors.slice(0, 5).map((e, i) => (
                <li key={i} className="text-xs text-red-700">{e}</li>
              ))}
            </ul>
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
