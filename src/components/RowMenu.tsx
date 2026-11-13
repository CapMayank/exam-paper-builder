"use client";

import { useEffect, useRef } from "react";
import { ChevronDown } from "lucide-react";

export type RowMenuEntry = { key: string; label: string; disabled?: boolean; danger?: boolean };

/** A small button that opens a list of actions. Closes on Esc, outside click, and after an item is chosen. */
export function RowMenu(props: {
  label: string;
  ariaLabel?: string;
  items: RowMenuEntry[];
  onSelect: (key: string) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  buttonClassName?: string;
}) {
  const { label, ariaLabel, items, onSelect, open, onOpenChange, buttonClassName } = props;
  const wrapRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const enabledItems = () =>
    Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not([disabled])') ?? []);

  // outside click closes
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) onOpenChange(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open, onOpenChange]);

  // opening moves focus to the first item
  useEffect(() => {
    if (open) enabledItems()[0]?.focus();
  }, [open]);

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open) return;
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      onOpenChange(false);
      buttonRef.current?.focus();
      return;
    }
    if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Home" || e.key === "End") {
      e.preventDefault();
      const list = enabledItems();
      if (list.length === 0) return;
      const at = list.indexOf(document.activeElement as HTMLButtonElement);
      let next = 0;
      if (e.key === "ArrowDown") next = at < 0 ? 0 : (at + 1) % list.length;
      else if (e.key === "ArrowUp") next = at <= 0 ? list.length - 1 : at - 1;
      else if (e.key === "End") next = list.length - 1;
      list[next].focus();
    }
  }

  return (
    <div ref={wrapRef} className="relative inline-block"
      onKeyDown={onKeyDown}
      onBlur={(e) => {
        // focus moved out of the whole menu (Tab past the last item): close it
        if (open && e.relatedTarget && !e.currentTarget.contains(e.relatedTarget as Node)) onOpenChange(false);
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={ariaLabel}
        className={
          buttonClassName ??
          "btn btn-sm border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-2xs font-medium"
        }
        onClick={() => onOpenChange(!open)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && !open) {
            e.preventDefault();
            onOpenChange(true);
          }
        }}
      >
        <span>{label}</span>
        <ChevronDown size={12} aria-hidden />
      </button>
      {open && (
        <div
          ref={menuRef}
          role="menu"
          aria-label={ariaLabel ?? label}
          className="absolute right-0 top-full z-30 mt-1 w-max min-w-44 max-w-[calc(100vw-2rem)] rounded-lg border border-slate-200 bg-white py-1 shadow-xl"
        >
          {items.map((item) => (
            <button
              key={item.key}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              className={`block w-full px-3 py-1.5 text-left text-xs font-medium focus:bg-slate-100 focus:outline-none disabled:cursor-not-allowed disabled:opacity-40 ${
                item.danger ? "text-red-600 hover:bg-red-50" : "text-slate-700 hover:bg-slate-50"
              }`}
              onClick={() => {
                onSelect(item.key);
                onOpenChange(false);
                // give focus back to the trigger unless something else (a modal) took it
                requestAnimationFrame(() => {
                  const a = document.activeElement;
                  if (!a || a === document.body) buttonRef.current?.focus();
                });
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
