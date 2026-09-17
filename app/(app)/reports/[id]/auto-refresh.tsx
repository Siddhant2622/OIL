"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

interface Props {
  status: string;
}

export function AutoRefresh({ status }: Props) {
  const router = useRouter();
  const [dots, setDots] = useState(0);

  useEffect(() => {
    if (!["ANALYZING", "SUBMITTED"].includes(status)) return;

    const dotInterval = setInterval(() => {
      setDots((d) => (d + 1) % 4);
    }, 400);

    const refreshInterval = setInterval(() => {
      router.refresh();
    }, 2500);

    return () => {
      clearInterval(dotInterval);
      clearInterval(refreshInterval);
    };
  }, [status, router]);

  if (!["ANALYZING", "SUBMITTED"].includes(status)) return null;

  return (
    <div className="flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50/80 px-4 py-2.5 text-xs font-semibold text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-300 animate-pulse">
      <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" />
      <span>
        {status === "ANALYZING"
          ? `Direct AI safety scan is analyzing this observation${".".repeat(dots)}`
          : `Queued for AI scan${".".repeat(dots)}`}
      </span>
    </div>
  );
}
