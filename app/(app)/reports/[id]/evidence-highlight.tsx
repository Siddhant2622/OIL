"use client";

import { highlightSpans } from "@/lib/utils";

interface Props {
  text: string;
  spans: string[];
}

export function EvidenceHighlight({ text, spans }: Props) {
  const segments = highlightSpans(text, spans);

  return (
    <span>
      {segments.map((seg, i) =>
        seg.highlighted ? (
          <mark key={i} className="evidence-highlight">
            {seg.text}
          </mark>
        ) : (
          <span key={i}>{seg.text}</span>
        )
      )}
    </span>
  );
}
