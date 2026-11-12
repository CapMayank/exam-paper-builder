/**
 * Questions written from the offline curriculum template (no AI, nothing from the bank) when Auto-Fill or an
 * AI commit has nothing better. They are generic and need a teacher's review before the paper is printed.
 */
export const TEMPLATE_FALLBACK_PROVENANCE =
  "TEMPLATE_FALLBACK: offline curriculum template, not AI-generated; teacher review required";

/** True for a question created from the offline curriculum template (sourceProvenance starts with "TEMPLATE_FALLBACK"). */
export function isTemplateFiller(q: { sourceProvenance?: string | null }): boolean {
  return typeof q.sourceProvenance === "string" && q.sourceProvenance.startsWith("TEMPLATE_FALLBACK");
}
