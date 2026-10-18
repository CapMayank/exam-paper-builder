"use client";

import { useMemo } from "react";
import { parseMathSegments } from "@/lib/math";

export function MathText({
  text,
  className,
  style,
}: {
  text: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const segments = useMemo(() => parseMathSegments(text), [text]);

  if (!text) return null;

  // Optimization: If no math was parsed, return simple text
  if (segments.length === 1 && segments[0].type === "text") {
    return (
      <span className={className} style={style}>
        {segments[0].text}
      </span>
    );
  }

  return (
    <span className={className} style={style}>
      {segments.map((seg, i) =>
        seg.type === "text" ? (
          <span key={i}>{seg.text}</span>
        ) : (
          <span
            key={i}
            className={seg.display ? "math-display my-1.5 block text-center" : "math-inline mx-0.5"}
            dangerouslySetInnerHTML={{ __html: seg.html }}
          />
        ),
      )}
    </span>
  );
}
