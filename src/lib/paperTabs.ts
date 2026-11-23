/**
 * Print, answer key and OMR pages open in ONE named browser tab per paper instead of `_blank`,
 * so printing again reuses that tab and the tab keeps a link (window.opener) to the workbench.
 */
export function paperOutputTab(paperId: string): string {
  return `paper-output-${paperId}`;
}

/** The Printables page opens its print view in one reused tab, the same way. */
export const PRINTABLES_OUTPUT_TAB = "printables-output";
