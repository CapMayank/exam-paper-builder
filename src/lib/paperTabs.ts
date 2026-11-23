/**
 * Print, answer key and OMR pages open in ONE named browser tab per paper instead of `_blank`,
 * so printing again reuses that tab and the tab keeps a link (window.opener) to the workbench.
 */
export function paperOutputTab(paperId: string): string {
  return `paper-output-${paperId}`;
}
