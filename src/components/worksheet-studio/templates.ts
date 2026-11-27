import { getKindergartenActivity } from "@/lib/kindergarten/registry";
import type { WorksheetTemplate } from "@/lib/worksheetTemplates";

/** What it takes to add one activity to a worksheet. */
export type ActivitySnapshot = { type: string; text: string; options: string[]; marks: number };

/**
 * The activities a template adds. Saved templates carry their own text and settings; built-in ones use each
 * activity's defaults for the worksheet's subject (so a Hindi worksheet gets Hindi letters). Types this
 * app no longer has are skipped.
 */
export function templateSnapshots(template: WorksheetTemplate, subject?: string): ActivitySnapshot[] {
  return template.activities.flatMap((a) => {
    const plugin = getKindergartenActivity(a.type);
    if (!plugin) return [];
    if (a.text !== undefined && a.options?.length) return [{ type: a.type, text: a.text, options: a.options, marks: a.marks }];
    const config = plugin.defaultConfig(subject) as { instruction?: string };
    return [{ type: a.type, text: a.text ?? config.instruction ?? plugin.label, options: [JSON.stringify(config)], marks: a.marks }];
  });
}
