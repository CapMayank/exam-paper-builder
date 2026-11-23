"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { MathfieldElement } from "mathlive";
import { extractTableFromText, findMathRanges, type ParsedTableData } from "@/lib/math";
import { buildTableLatex } from "@/lib/tableUtils";

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
    installKeyboardCloseButton();
    return MF;
  });
  return mathliveLoad;
}

/**
 * MathLive's on-screen keyboard has no close key in its default layouts, so put a
 * "Close keyboard" button on its top edge while it is open.
 */
function installKeyboardCloseButton() {
  const kbd = window.mathVirtualKeyboard;
  if (!kbd || document.querySelector(".mre-vk-close")) return;
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "mre-vk-close";
  btn.textContent = "Close keyboard ✕";
  btn.setAttribute("aria-label", "Close the on-screen maths keyboard");
  btn.hidden = true;
  // keep the focus (and the caret) in the formula box being edited
  btn.addEventListener("mousedown", (e) => e.preventDefault());
  btn.addEventListener("click", () => kbd.hide());
  document.body.appendChild(btn);
  const update = () => {
    const height = kbd.visible ? kbd.boundingRect.height : 0;
    btn.hidden = height <= 0;
    btn.style.bottom = `${height + 6}px`;
  };
  kbd.addEventListener("virtual-keyboard-toggle", update);
  kbd.addEventListener("geometrychange", update);
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
        } else if (n.dataset.table) {
          if (n.dataset.dirty === "1") {
            const hasHeader = n.dataset.hasHeader === "1";
            const headers = Array.from(n.querySelectorAll("thead th")).map((th) =>
              (th.textContent ?? "").trim(),
            );
            const rows = Array.from(n.querySelectorAll("tbody tr")).map((tr) =>
              Array.from(tr.querySelectorAll("td")).map((td) => (td.textContent ?? "").trim()),
            );
            const built = buildTableLatex(headers, rows, hasHeader);
            if (built) out += built;
          } else if (n.dataset.latex) {
            out += n.dataset.latex;
          }
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
    // Backspace/Delete in an empty formula box removes the box itself.
    field.addEventListener(
      "keydown",
      (e) => {
        if ((e.key === "Backspace" || e.key === "Delete") && !field.getValue("latex").replace(/\\placeholder(\[[^\]]*\])?\{[^}]*\}/g, "").trim()) {
          e.preventDefault();
          e.stopPropagation();
          removeMath(wrap);
        } else if (e.key === "Escape") {
          window.mathVirtualKeyboard?.hide();
        }
      },
      { capture: true },
    );
    // The on-screen keyboard belongs to the box being edited: close it when the teacher leaves the box.
    field.addEventListener("focusout", () => {
      setTimeout(() => {
        const active = document.activeElement;
        if (!(active instanceof HTMLElement && active.tagName === "MATH-FIELD")) window.mathVirtualKeyboard?.hide();
      }, 0);
    });

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "mre-math-remove";
    removeBtn.title = "Remove formula";
    removeBtn.setAttribute("aria-label", "Remove formula");
    removeBtn.tabIndex = -1;
    removeBtn.textContent = "×";
    // mousedown would move the focus out of the box (and hide this button) before the click lands
    removeBtn.addEventListener("mousedown", (e) => e.preventDefault());
    removeBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      removeMath(wrap);
    });

    wrap.append(field, removeBtn);
    return wrap;
  }

  /** Delete a formula box and leave the caret where it was. */
  function removeMath(wrap: HTMLElement) {
    const root = rootRef.current;
    if (!root || !root.contains(wrap)) return;
    window.mathVirtualKeyboard?.hide();
    const range = document.createRange();
    range.setStartBefore(wrap);
    range.collapse(true);
    // Move the focus first: removing the focused box would drop the focus out of the dialog.
    root.focus({ preventScroll: true });
    wrap.remove();
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
    emit();
  }

  /** The formula box right next to a collapsed caret in the text, skipping the invisible spacer characters. */
  function mathBesideCaret(backward: boolean): HTMLElement | null {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || !sel.isCollapsed) return null;
    const { startContainer: node, startOffset: offset } = sel.getRangeAt(0);
    let sibling: Node | null;
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent ?? "";
      const rest = backward ? text.slice(0, offset) : text.slice(offset);
      if (rest.replace(/​/g, "") !== "") return null;
      sibling = backward ? node.previousSibling : node.nextSibling;
    } else {
      sibling = backward ? node.childNodes[offset - 1] ?? null : node.childNodes[offset] ?? null;
    }
    while (sibling && sibling.nodeType === Node.TEXT_NODE && (sibling.textContent ?? "").replace(/​/g, "") === "") {
      sibling = backward ? sibling.previousSibling : sibling.nextSibling;
    }
    return sibling instanceof HTMLElement && sibling.dataset.math ? sibling : null;
  }

  function createTable(rawLatex: string, parsed: ParsedTableData): HTMLElement {
    const wrap = document.createElement("div");
    wrap.contentEditable = "false";
    wrap.dataset.table = "1";
    wrap.dataset.latex = rawLatex;
    if (parsed.headers.length > 0) wrap.dataset.hasHeader = "1";
    wrap.className = "mre-table";

    const bar = document.createElement("div");
    bar.className = "mre-table-bar";
    const label = document.createElement("span");
    const totalRows = parsed.rows.length + (parsed.headers.length > 0 ? 1 : 0);
    const totalCols = Math.max(parsed.headers.length, ...parsed.rows.map((r) => r.length), 1);
    label.textContent = `Table (${totalRows} × ${totalCols})`;
    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "mre-table-remove";
    removeBtn.title = "Remove table";
    removeBtn.setAttribute("aria-label", "Remove table");
    removeBtn.textContent = "×";
    removeBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      wrap.remove();
      emit();
    });
    bar.append(label, removeBtn);
    wrap.appendChild(bar);

    const scroll = document.createElement("div");
    scroll.className = "mre-table-scroll";
    const table = document.createElement("table");

    const makeCell = (tag: "th" | "td", text: string) => {
      const cell = document.createElement(tag);
      cell.contentEditable = "true";
      cell.textContent = text;
      cell.addEventListener("input", () => {
        wrap.dataset.dirty = "1";
      });
      return cell;
    };

    if (parsed.headers.length > 0) {
      const thead = document.createElement("thead");
      const tr = document.createElement("tr");
      parsed.headers.forEach((h) => tr.appendChild(makeCell("th", h)));
      thead.appendChild(tr);
      table.appendChild(thead);
    }

    const tbody = document.createElement("tbody");
    parsed.rows.forEach((row) => {
      const tr = document.createElement("tr");
      for (let c = 0; c < totalCols; c++) {
        tr.appendChild(makeCell("td", row[c] ?? ""));
      }
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    scroll.appendChild(table);
    wrap.appendChild(scroll);
    return wrap;
  }

  /** Builds DOM nodes for a string: text, line breaks, rendered tables, and formula boxes. */
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
      if (/\\begin\{(?:array|tabular)\}\s*\{[^}]*\}/.test(r.tex)) {
        const rawSnippet = text.slice(r.start, r.end);
        const extracted = extractTableFromText(rawSnippet);
        if (extracted.table && (extracted.table.headers.length > 0 || extracted.table.rows.length > 0)) {
          nodes.push(createTable(rawSnippet, extracted.table));
          cursor = r.end;
          continue;
        }
      }
      nodes.push(createMath(r.tex, r.display));
      cursor = r.end;
    }
    pushText(text.slice(cursor));
    return nodes;
  }

  function rebuild(root: HTMLElement, text: string) {
    root.replaceChildren();
    const nodes = buildNodes(text);
    const isWidget = (n: Node | undefined): n is HTMLElement =>
      n instanceof HTMLElement && Boolean(n.dataset.math || n.dataset.table);
    if (isWidget(nodes[0])) nodes.unshift(document.createTextNode(ZWSP));
    const last = nodes[nodes.length - 1];
    if (isWidget(last)) nodes.push(document.createTextNode(ZWSP));
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
    const target = e.target as HTMLElement;
    if (target.closest("math-field")) return;
    if (target.closest("[data-table]")) {
      if (e.key === "Enter") e.preventDefault();
      return;
    }
    // Backspace/Delete next to a formula box removes the whole box in one go.
    if (e.key === "Backspace" || e.key === "Delete") {
      const box = mathBesideCaret(e.key === "Backspace");
      if (box) {
        e.preventDefault();
        removeMath(box);
      }
      return;
    }
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
    const target = e.target as HTMLElement;
    if (target.closest("math-field")) return;
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    if (target.closest("[data-table]")) {
      const clean = text.replace(/\s+/g, " ");
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        range.deleteContents();
        const node = document.createTextNode(clean);
        range.insertNode(node);
        range.setStartAfter(node);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
        const tableWrap = target.closest("[data-table]") as HTMLElement | null;
        if (tableWrap) tableWrap.dataset.dirty = "1";
        emit();
      }
      return;
    }
    api.insert(multiline ? text : text.replace(/\n+/g, " "));
  }

  // Typed "$x^2$" becomes a real formula box once the teacher leaves the field.
  function onBlur(e: React.FocusEvent<HTMLDivElement>) {
    const root = rootRef.current;
    if (!root) return;
    // Focus moving into a formula box (or back out to the text) is not leaving the field:
    // rebuilding here would throw away a freshly inserted, still-empty formula box.
    const next = e.relatedTarget as Node | null;
    if (next && root.contains(next)) return;
    const text = serialize(root, multiline);
    const boxes = root.querySelectorAll("[data-math], [data-table]").length;
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
