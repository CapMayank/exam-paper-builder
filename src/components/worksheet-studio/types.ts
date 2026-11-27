import type { KindergartenActivityPlugin } from "@/lib/kindergarten/types";
import type { PaperItem, Section } from "@/lib/types";

/** One activity on the worksheet: the saved question, the section that carries its marks, and its plugin. */
export type Activity = { item: PaperItem; section: Section; plugin: KindergartenActivityPlugin };
