"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { MathfieldElement } from "mathlive";
import { findMathRanges } from "@/lib/math";

/**
 * Handle the parent form uses to push toolbar content into whichever editor is focused.
 */
export interface MathRichEditorHandle {
  /** Insert text and/or `$...$` formulas at the caret (or into the formula currently being edited). */
  insert: (snippet: string) => void;
  /** Insert an empty, focused formula box at the caret. */
  insertFormula: () => void;
}

type MathfieldCtor = typeof MathfieldElement;

let mathliveLoad: Promise<MathfieldCtor> | null = null;
function loadMathlive(): Promise<MathfieldCtor> {
  mathliveLoad ??= import("mathlive").then(({ MathfieldElement: MF }) => {
    // KaTeX fonts are already loaded globally; skip MathLive's own font/sound fetches.
    MF.fontsDirectory = null;
    MF.soundsDirectory = null;
    return MF;
  });
  return mathliveLoad;
}

const ZWSP = "​";
const PH = "\\placeholder{}";

/** Toolbar templates whose letters are stand-ins: turn them into blanks the teacher fills in. */
const TEMPLATES: Record<string, string> = {
  "\\frac{a}{b}": `\\frac{${PH}}{${PH}}`,
  "\\sqrt{x}": `\\sqrt{${PH}}`,
  "\\sqrt[n]{x}": `\\sqrt[${PH}]{${PH}}`,
  "x^n": `${PH}^{${PH}}`,
  "x_n": `${PH}_{${PH}}`,
  "\\frac{dy}{dx}": `\\frac{d${PH}}{d${PH}}`,
};

function serialize(root: HTMLElement, multiline: boolean): string {
  let out = "";
  const walk = (parent: Node) => {
    parent.childNodes.forEach((n) => {
      if (n.nodeType === Node.TEXT_NODE) {
        out += n.textContent ?? "";
      } else if (n instanceof HTMLElement) {
        if (n.dataset.math) {
          const field = n.querySelector("math-field") as MathfieldElement | null;
          const tex = field?.getValue("latex").replace(/\\placeholder(\[[^\]]*\])?\{[^}]*\}/g, "").trim();
          if (tex) out += n.dataset.display ? `$$${tex}$$` : `$${tex}$`;
        } else if (n.tagName === "BR") {
          if (!n.dataset.phantom) out += "\n";
        } else {
          if (out && !out.endsWith("\n")) out += "\n";
          walk(n);
        }
      }
    });
  };
  walk(root);
  out = out.replace(/ /g, " ").replace(/​/g, "");
  return multiline ? out : out.replace(/\n+/g, " ");
}

/**
 * A text box where formulas appear as real, editable maths (no LaTeX visible).
 * The value is still the usual `text with $formula$ inside` string.
 */
export function MathRichEditor({
  value,
  onChange,
  multiline = false,
  placeholder,
  className = "",
  onActivate,
  autoFocus = false,
}: {
  value: string;
  onChange: (next: string) => void;
  multiline?: boolean;
  placeholder?: string;
  className?: string;
  onActivate?: (handle: MathRichEditorHandle) => void;
  /** Take the focus once the editor is ready, if nothing else holds it (only the page or its dialog) and it is shown. */
  autoFocus?: boolean;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const mfRef = useRef<MathfieldCtor | null>(null);
  const lastEmitted = useRef<string | null>(null);
  const onChangeRef = useRef(onChange);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    onChangeRef.current = onChange;
  });

  useEffect(() => {
    let cancelled = false;
    loadMathlive().then((MF) => {
      if (cancelled) return;
      mfRef.current = MF;
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // The editor only becomes editable once MathLive has loaded, after the dialog chose its initial focus.
  const autoFocusDone = useRef(false);
  useEffect(() => {
    if (!autoFocus || !ready || autoFocusDone.current) return;
    autoFocusDone.current = true;
    const root = rootRef.current;
    // a form mounted hidden or inert (another tab open) never steals the focus
    if (!root || root.offsetParent === null || root.closest("[inert]")) return;
    const active = document.activeElement as HTMLElement | null;
    const free = !active || active === document.body || active.getAttribute("role") === "dialog";
    if (free) root.focus({ preventScroll: true });
  }, [autoFocus, ready]);

  function markEmpty(root: HTMLElement, text: string) {
    if (text) root.removeAttribute("data-empty");
    else root.setAttribute("data-empty", "true");
  }

  function createMath(tex: string, display: boolean): HTMLElement {
    const wrap = document.createElement("span");
    wrap.contentEditable = "false";
    wrap.dataset.math = "1";
    if (display) wrap.dataset.display = "1";
    wrap.className = "mre-math";
    const field = new (mfRef.current as MathfieldCtor)();
    field.value = tex;
    field.mathVirtualKeyboardPolicy = "manual";
    field.smartFence = true;
    wrap.appendChild(field);
    return wrap;
  }

  /** Builds DOM nodes for a string: text, line breaks and rendered formula boxes. */
  function buildNodes(text: string): Node[] {
    const nodes: Node[] = [];
    const pushText = (t: string) => {
      t.split("\n").forEach((line, i) => {
        if (i > 0) nodes.push(document.createElement("br"));
        if (line) nodes.push(document.createTextNode(line));
      });
    };
    let cursor = 0;
    for (const r of findMathRanges(text)) {
      pushText(text.slice(cursor, r.start));
      nodes.push(createMath(r.tex, r.display));
      cursor = r.end;
    }
    pushText(text.slice(cursor));
    return nodes;
  }

  function rebuild(root: HTMLElement, text: string) {
    root.replaceChildren();
    const nodes = buildNodes(text);
    if (nodes[0] instanceof HTMLElement && nodes[0].dataset.math) nodes.unshift(document.createTextNode(ZWSP));
    const last = nodes[nodes.length - 1];
    if (last instanceof HTMLElement && last.dataset.math) nodes.push(document.createTextNode(ZWSP));
    if (last instanceof HTMLElement && last.tagName === "BR") {
      const phantom = document.createElement("br");
      phantom.dataset.phantom = "1";
      nodes.push(phantom);
    }
    nodes.forEach((n) => root.appendChild(n));
    markEmpty(root, text);
  }

  function emit() {
    const root = rootRef.current;
    if (!root) return;
    const next = serialize(root, multiline);
    markEmpty(root, next);
    if (next === lastEmitted.current) return;
    lastEmitted.current = next;
    onChangeRef.current(next);
  }

  // Outside changes (presets, AI rewrite, toolbar fallbacks) re-render the box; our own typing does not.
  useEffect(() => {
    const root = rootRef.current;
    if (!ready || !root) return;
    if (lastEmitted.current === value) return;
    rebuild(root, value);
    lastEmitted.current = value;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, value]);

  useEffect(() => {
    const root = rootRef.current;
    if (!ready || !root) return;
    const onInput = () => emit();
    root.addEventListener("input", onInput);
    return () => root.removeEventListener("input", onInput);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, multiline]);

  const api = useMemo<MathRichEditorHandle>(() => {
    function placeNodes(nodes: Node[]) {
      const root = rootRef.current;
      if (!root || nodes.length === 0) return;
      const sel = window.getSelection();
      let range: Range;
      if (sel && sel.rangeCount > 0 && root.contains(sel.getRangeAt(0).startContainer)) {
        range = sel.getRangeAt(0);
        range.deleteContents();
      } else {
        range = document.createRange();
        range.selectNodeContents(root);
        range.collapse(false);
      }
      const frag = document.createDocumentFragment();
      nodes.forEach((n) => frag.appendChild(n));
      const lastNode = nodes[nodes.length - 1];
      range.insertNode(frag);
      range.setStartAfter(lastNode);
      range.collapse(true);
      sel?.removeAllRanges();
      sel?.addRange(range);
      const firstMath = nodes.find((n) => n instanceof HTMLElement && n.dataset.math) as HTMLElement | undefined;
      const field = firstMath?.querySelector("math-field") as MathfieldElement | null | undefined;
      // The element finishes mounting on the next frame; focusing earlier is a no-op.
      if (field) {
        let tries = 0;
        const tryFocus = () => {
          field.focus();
          if (document.activeElement !== field && ++tries < 10) {
            setTimeout(tryFocus, 40);
          } else if (field.value.includes("\\placeholder")) {
            field.executeCommand("moveToMathfieldStart");
            field.executeCommand("moveToNextPlaceholder");
          }
        };
        setTimeout(tryFocus, 0);
      }
      emit();
    }

    return {
      insert(snippet) {
        const root = rootRef.current;
        if (!root || !mfRef.current) return;
        // A formula is being edited: drop the symbol straight into it.
        const active = document.activeElement;
        const ranges = findMathRanges(snippet);
        if (
          active instanceof HTMLElement &&
          active.tagName === "MATH-FIELD" &&
          root.contains(active) &&
          ranges.length === 1 &&
          ranges[0].start === 0 &&
          ranges[0].end === snippet.length
        ) {
          (active as MathfieldElement).insert(ranges[0].tex);
          emit();
          return;
        }
        const single = ranges.length === 1 && ranges[0].start === 0 && ranges[0].end === snippet.length;
        const template = single ? TEMPLATES[ranges[0].tex] : undefined;
        placeNodes(template ? [createMath(template, false)] : buildNodes(snippet));
      },
      insertFormula() {
        if (!mfRef.current) return;
        placeNodes([createMath("", false)]);
      },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).closest("math-field")) return;
    if (e.key !== "Enter") return;
    e.preventDefault();
    if (!multiline) return;
    const sel = window.getSelection();
    const root = rootRef.current;
    if (!sel || sel.rangeCount === 0 || !root) return;
    const range = sel.getRangeAt(0);
    range.deleteContents();
    const br = document.createElement("br");
    range.insertNode(br);
    // A trailing <br> is invisible in a contenteditable, so keep a phantom one after it.
    if (!br.nextSibling) {
      const phantom = document.createElement("br");
      phantom.dataset.phantom = "1";
      br.after(phantom);
    }
    range.setStartAfter(br);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
    emit();
  }

  function onPaste(e: React.ClipboardEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).closest("math-field")) return;
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    api.insert(multiline ? text : text.replace(/\n+/g, " "));
  }

  // Typed "$x^2$" becomes a real formula box once the teacher leaves the field.
  function onBlur() {
    const root = rootRef.current;
    if (!root) return;
    const text = serialize(root, multiline);
    const boxes = root.querySelectorAll("[data-math]").length;
    if (findMathRanges(text).length !== boxes) {
      rebuild(root, text);
      lastEmitted.current = text;
    }
  }

  return (
    <div
      ref={rootRef}
      contentEditable={ready}
      suppressContentEditableWarning
      role="textbox"
      aria-multiline={multiline}
      spellCheck
      data-empty="true"
      data-placeholder={placeholder}
      data-autofocus={autoFocus || undefined}
      onFocus={() => onActivate?.(api)}
      onKeyDown={onKeyDown}
      onPaste={onPaste}
      onBlur={onBlur}
      className={`input mre ${multiline ? "min-h-24" : ""} ${className}`}
    />
  );
}
