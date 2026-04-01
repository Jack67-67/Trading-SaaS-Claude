import type { Metadata } from "next";
import { StrategyForm } from "@/components/dashboard/strategy-form";

export const metadata: Metadata = { title: "New Strategy" };

export default function NewStrategyPage() {
  return <StrategyForm mode="create" />;
}
