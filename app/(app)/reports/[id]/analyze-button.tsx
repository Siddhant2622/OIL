"use client";

import { useState } from "react";
import { Cpu, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";

interface Props {
  reportId: string;
}

export function AnalyzeButton({ reportId }: Props) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleAnalyze() {
    setLoading(true);
    try {
      await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ report_id: reportId }),
      });
      // Poll by refreshing page after brief delay
      setTimeout(() => {
        router.refresh();
        setLoading(false);
      }, 3000);
    } catch {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleAnalyze}
      disabled={loading}
      className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-60"
      id="analyze-report-btn"
    >
      {loading ? (
        <RotateCcw className="h-4 w-4 animate-spin" />
      ) : (
        <Cpu className="h-4 w-4" />
      )}
      {loading ? "Analysing…" : "Run AI Analysis"}
    </button>
  );
}
