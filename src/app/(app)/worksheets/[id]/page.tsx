"use client";

import { use } from "react";
import { WorksheetStudio } from "@/components/worksheet-studio/WorksheetStudio";

export default function WorksheetPage({ params }: PageProps<"/worksheets/[id]">) {
  const { id } = use(params);
  return <WorksheetStudio id={id} />;
}
