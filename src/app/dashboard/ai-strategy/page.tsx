import { AiStrategyClient } from "./ai-strategy-client";

export default function AiStrategyPage({
  searchParams,
}: {
  searchParams: { goal?: string };
}) {
  return <AiStrategyClient initialGoal={searchParams.goal ?? ""} />;
}
