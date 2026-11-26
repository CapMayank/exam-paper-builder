"use client";

import { Lock } from "lucide-react";
import Link from "next/link";
import { AuditTrail } from "@/components/exams/AuditTrail";
import { useExamsGate } from "@/components/exams/useExamsGate";
import { EmptyState, ListSkeleton } from "@/components/ui";

export default function ExamAuditPage() {
  const gate = useExamsGate();
  if (gate.state === "loading") return <ListSkeleton />;
  if (gate.state === "forbidden") return <EmptyState icon={Lock} title="You don't have access" description="The audit trail is for Admins and Exam Cell." />;
  return (
    <div className="space-y-6">
      <Link href="/exams" className="text-sm text-slate-600 hover:text-slate-900">← Exams</Link>
      <AuditTrail />
    </div>
  );
}
