"use client";

import { AlertCircle, AlertTriangle, CheckCircle2, Info, Loader2, X, type LucideIcon } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

/* ------------------------------------------------------------------ */
/* Modal                                                               */
/* ------------------------------------------------------------------ */

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';
const FIELDS = 'textarea:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled])';

/** Open modals, topmost last. Esc and the focus trap only act on the topmost one. */
const modalStack: symbol[] = [];
let scrollLocks = 0;

function lockScroll() {
  if (scrollLocks++ === 0) {
    const gap = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (gap > 0) document.body.style.paddingRight = `${gap}px`;
  }
}
function unlockScroll() {
  if (--scrollLocks === 0) {
    document.body.style.overflow = "";
    document.body.style.paddingRight = "";
  }
}

export function Modal({
  title,
  subtitle,
  onClose,
  children,
  wide,
  size,
  footer,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  /** Legacy shortcut for `size="lg"`. */
  wide?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
  /** Sticky footer (actions). Keeps primary buttons visible while the body scrolls. */
  footer?: ReactNode;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const titleId = useId();

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const id = Symbol("modal");
    modalStack.push(id);
    const previouslyFocused = document.activeElement as HTMLElement | null;
    lockScroll();
    const dialog = dialogRef.current;
    // Focus the first field, otherwise the dialog itself (never the close button, to avoid accidental Enter-closes).
    const first = dialog?.querySelector<HTMLElement>(`[data-autofocus],${FIELDS}`);
    (first ?? dialog)?.focus({ preventScroll: true });

    const onKey = (e: KeyboardEvent) => {
      if (modalStack[modalStack.length - 1] !== id) return;
      if (e.key === "Escape") {
        e.stopPropagation();
        onCloseRef.current();
      } else if (e.key === "Tab" && dialog) {
        const items = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null);
        if (items.length === 0) {
          e.preventDefault();
          dialog.focus();
          return;
        }
        const firstEl = items[0];
        const lastEl = items[items.length - 1];
        if (e.shiftKey && (document.activeElement === firstEl || document.activeElement === dialog)) {
          e.preventDefault();
          lastEl.focus();
        } else if (!e.shiftKey && document.activeElement === lastEl) {
          e.preventDefault();
          firstEl.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      modalStack.splice(modalStack.indexOf(id), 1);
      unlockScroll();
      previouslyFocused?.focus?.({ preventScroll: true });
    };
  }, []);

  const width = { sm: "sm:max-w-md", md: "sm:max-w-2xl", lg: "sm:max-w-4xl", xl: "sm:max-w-6xl" }[size ?? (wide ? "lg" : "md")];

  return (
    <div
      className="no-print anim-fade fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 backdrop-blur-[2px] sm:items-center sm:p-6"
      onPointerDown={(e) => {
        // Only a press that *starts* on the backdrop closes the dialog (selecting text and releasing outside must not).
        if (e.target === e.currentTarget) onCloseRef.current();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`anim-pop flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-2xl outline-none sm:max-h-[min(90dvh,56rem)] sm:rounded-2xl ${width}`}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg font-semibold leading-snug text-slate-900">
              {title}
            </h2>
            {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
          </div>
          <button
            type="button"
            className="-mr-1.5 -mt-1 shrink-0 rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>
        <div className="scroll-thin min-h-0 flex-1 overflow-y-auto p-5">{children}</div>
        {footer && <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Inline banners                                                      */
/* ------------------------------------------------------------------ */

export function ErrorBanner({ message, onDismiss }: { message: string | null; onDismiss?: () => void }) {
  if (!message) return null;
  return (
    <div role="alert" className="anim-fade flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-900">
      <AlertCircle size={17} className="mt-0.5 shrink-0 text-red-600" />
      <div className="min-w-0 flex-1 font-medium">{message}</div>
      {onDismiss && (
        <button type="button" onClick={onDismiss} aria-label="Dismiss message" className="-m-1 rounded-md p-1 text-red-500 hover:bg-red-100 hover:text-red-800">
          <X size={15} />
        </button>
      )}
    </div>
  );
}

export function SuccessBanner({ message, onDismiss }: { message: string | null; onDismiss?: () => void }) {
  if (!message) return null;
  return (
    <div role="status" className="anim-fade flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
      <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-emerald-600" />
      <div className="min-w-0 flex-1 font-medium">{message}</div>
      {onDismiss && (
        <button type="button" onClick={onDismiss} aria-label="Dismiss message" className="-m-1 rounded-md p-1 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-900">
          <X size={15} />
        </button>
      )}
    </div>
  );
}

export function Field({
  label,
  children,
  className = "",
  helper,
  error,
}: {
  label: string;
  children: ReactNode;
  className?: string;
  helper?: string;
  error?: string | null;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="label">{label}</span>
      {children}
      {error ? (
        <p className="mt-1 text-xs font-medium text-red-700">{error}</p>
      ) : (
        helper && <p className="mt-1 text-xs leading-relaxed text-slate-500">{helper}</p>
      )}
    </label>
  );
}

/* ------------------------------------------------------------------ */
/* Page scaffolding                                                    */
/* ------------------------------------------------------------------ */

export function PageHeader({
  title,
  description,
  actions,
  icon: Icon,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  icon?: LucideIcon;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div className="flex min-w-0 items-start gap-3.5">
        {Icon && (
          <span className="mt-1 hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white sm:flex">
            <Icon size={20} />
          </span>
        )}
        <div className="min-w-0">
          <h1 className="page-title">{title}</h1>
          {description && <p className="page-lede">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  compact,
}: {
  icon: LucideIcon;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={`graph-paper flex flex-col items-center rounded-2xl border border-dashed border-slate-300 text-center ${compact ? "gap-2 p-6" : "gap-3 p-10"}`}>
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-indigo-200 bg-white text-indigo-600 shadow-xs">
        <Icon size={22} />
      </span>
      <h3 className="font-display text-base font-semibold text-slate-900">{title}</h3>
      {description && <p className="max-w-sm text-sm leading-relaxed text-slate-600">{description}</p>}
      {action && <div className="pt-1">{action}</div>}
    </div>
  );
}

export function Spinner({ size = 16, className = "" }: { size?: number; className?: string }) {
  return <Loader2 size={size} className={`animate-spin ${className}`} aria-hidden />;
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden />;
}

/** Loading placeholder shaped like a list of cards. */
export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3" role="status" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="card space-y-3">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-2/3" />
          <Skeleton className="h-2 w-full" />
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Toasts + confirm dialog                                             */
/* ------------------------------------------------------------------ */

type ToastTone = "success" | "error" | "info";
type ToastItem = { id: number; tone: ToastTone; message: string; action?: { label: string; onClick: () => void } };
type ToastApi = {
  success: (message: string, action?: ToastItem["action"]) => void;
  error: (message: string) => void;
  info: (message: string) => void;
};

type ConfirmOptions = {
  title: string;
  message?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** `danger` styles the confirm button red. */
  tone?: "danger" | "default";
};

const ToastContext = createContext<ToastApi | null>(null);
const ConfirmContext = createContext<((o: ConfirmOptions) => Promise<boolean>) | null>(null);

const TONE_STYLE: Record<ToastTone, { icon: LucideIcon; ring: string; iconColor: string }> = {
  success: { icon: CheckCircle2, ring: "border-emerald-200", iconColor: "text-emerald-600" },
  error: { icon: AlertCircle, ring: "border-red-200", iconColor: "text-red-600" },
  info: { icon: Info, ring: "border-indigo-200", iconColor: "text-indigo-600" },
};

/** Mount once near the root of the signed-in app. Provides `useToast()` and `useConfirm()`. */
export function UiProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [pending, setPending] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const push = useCallback(
    (tone: ToastTone, message: string, action?: ToastItem["action"]) => {
      const id = nextId.current++;
      setToasts((t) => [...t.slice(-3), { id, tone, message, action }]);
      setTimeout(() => dismiss(id), tone === "error" ? 8000 : action ? 7000 : 4000);
    },
    [dismiss]
  );

  const toast = useMemo<ToastApi>(
    () => ({
      success: (m, a) => push("success", m, a),
      error: (m) => push("error", m),
      info: (m) => push("info", m),
    }),
    [push]
  );

  const confirm = useCallback(
    (o: ConfirmOptions) => new Promise<boolean>((resolve) => setPending({ ...o, resolve })),
    []
  );

  const settle = (v: boolean) => {
    pending?.resolve(v);
    setPending(null);
  };

  return (
    <ToastContext.Provider value={toast}>
      <ConfirmContext.Provider value={confirm}>
        {children}

        <div
          aria-live="polite"
          className="no-print pointer-events-none fixed inset-x-0 bottom-0 z-[80] flex flex-col items-center gap-2 p-4 sm:items-end sm:p-6"
        >
          {toasts.map((t) => {
            const { icon: Icon, ring, iconColor } = TONE_STYLE[t.tone];
            return (
              <div
                key={t.id}
                role={t.tone === "error" ? "alert" : "status"}
                className={`anim-slide-right pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border bg-white p-3.5 text-sm text-slate-800 shadow-lg ${ring}`}
              >
                <Icon size={18} className={`mt-0.5 shrink-0 ${iconColor}`} />
                <div className="min-w-0 flex-1 font-medium leading-snug">{t.message}</div>
                {t.action && (
                  <button
                    type="button"
                    className="shrink-0 rounded-md px-1.5 text-sm font-semibold text-indigo-700 hover:bg-indigo-50"
                    onClick={() => {
                      t.action!.onClick();
                      dismiss(t.id);
                    }}
                  >
                    {t.action.label}
                  </button>
                )}
                <button
                  type="button"
                  aria-label="Dismiss notification"
                  className="-m-1 shrink-0 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  onClick={() => dismiss(t.id)}
                >
                  <X size={14} />
                </button>
              </div>
            );
          })}
        </div>

        {pending && (
          <Modal
            size="sm"
            title={pending.title}
            onClose={() => settle(false)}
            footer={
              <>
                <button type="button" className="btn" onClick={() => settle(false)}>
                  {pending.cancelLabel ?? "Cancel"}
                </button>
                <button
                  type="button"
                  data-autofocus
                  className={`btn ${pending.tone === "danger" ? "btn-danger-solid" : "btn-primary"}`}
                  onClick={() => settle(true)}
                >
                  {pending.confirmLabel ?? "Confirm"}
                </button>
              </>
            }
          >
            <div className="flex gap-3">
              {pending.tone === "danger" && (
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
                  <AlertTriangle size={20} />
                </span>
              )}
              <div className="pt-1 text-sm leading-relaxed text-slate-600">{pending.message}</div>
            </div>
          </Modal>
        )}
      </ConfirmContext.Provider>
    </ToastContext.Provider>
  );
}

const FALLBACK_TOAST: ToastApi = { success: () => undefined, error: () => undefined, info: () => undefined };

export function useToast(): ToastApi {
  return useContext(ToastContext) ?? FALLBACK_TOAST;
}

/** `const confirm = useConfirm(); if (!(await confirm({ title, tone: "danger" }))) return;` */
export function useConfirm(): (o: ConfirmOptions) => Promise<boolean> {
  const ctx = useContext(ConfirmContext);
  return useCallback(
    (o) => (ctx ? ctx(o) : Promise.resolve(window.confirm(`${o.title}${typeof o.message === "string" ? `\n\n${o.message}` : ""}`))),
    [ctx]
  );
}
