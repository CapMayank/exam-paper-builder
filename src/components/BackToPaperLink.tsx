"use client";

import Link from "next/link";
import type { ComponentProps, MouseEvent } from "react";
import { paperOutputTab } from "@/lib/paperTabs";

type Props = Omit<ComponentProps<typeof Link>, "href" | "onClick"> & { href: string } & (
    | { paperId: string; tabName?: never }
    | { tabName: string; paperId?: never }
  );

/**
 * "Back to workbench" from a print / answer key / OMR page. When the page is the paper's output tab
 * opened from the workbench, it closes this tab so the user lands back on that workbench tab instead
 * of loading a second copy of it here. Otherwise (opened directly, opener gone, or the browser refuses
 * to close the tab) it is a normal link. `tabName` does the same for other named output tabs (Printables).
 */
export function BackToPaperLink({ paperId, tabName, href, ...rest }: Props) {
  const name = tabName ?? paperOutputTab(paperId!);
  function onClick(e: MouseEvent<HTMLAnchorElement>) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    if (typeof window === "undefined" || window.name !== name) return;
    const opener = window.opener as Window | null;
    if (!opener || opener.closed) return;
    e.preventDefault();
    try {
      opener.focus();
    } catch {
      // cross-origin or blocked: closing the tab still returns to it
    }
    window.close();
    // still open: the browser would not let a script close this tab
    window.setTimeout(() => {
      if (!window.closed) window.location.assign(href);
    }, 200);
  }
  return <Link href={href} onClick={onClick} {...rest} />;
}
