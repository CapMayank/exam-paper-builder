import { DEFAULT_SCHOOL_LOGO } from "@/lib/constants";

/** Official emblem of Sarvodaya English Higher Secondary School, Lakhnadon (Est. 2002). */
export function BrandMark({
  size = 38,
  className = "",
  surface = "auto",
}: {
  size?: number;
  className?: string;
  surface?: "auto" | "light" | "none";
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center ${
        surface === "auto"
          ? "rounded-xl bg-white p-1 shadow-xs ring-1 ring-black/5"
          : surface === "light"
          ? "rounded-xl bg-slate-50 p-1 ring-1 ring-slate-200/80"
          : ""
      } ${className}`}
      style={{ width: size, height: size }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={DEFAULT_SCHOOL_LOGO}
        alt="Sarvodaya English Higher Secondary School, Lakhnadon"
        width={size}
        height={size}
        className="h-full w-full object-contain"
      />
    </span>
  );
}


