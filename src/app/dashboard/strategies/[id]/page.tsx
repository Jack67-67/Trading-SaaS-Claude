import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StrategyForm } from "@/components/dashboard/strategy-form";

interface PageProps {
  params: { id: string };
}

export async function generateMetadata({ params }: PageProps) {
  const supabase = createClient();
  const { data } = await supabase
    .from("strategies")
    .select("name")
    .eq("id", params.id)
    .single();

  return { title: data?.name ?? "Edit Strategy" };
}

export default async function StrategyEditorPage({ params }: PageProps) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: strategy, error } = await supabase
    .from("strategies")
    .select("*")
    .eq("id", params.id)
    .eq("user_id", user!.id)
    .single();

  if (error || !strategy) {
    notFound();
  }

  return (
    <StrategyForm
      mode="edit"
      strategyId={strategy.id}
      initialData={{
        name: strategy.name,
        description: strategy.description,
        code: strategy.code,
      }}
    />
  );
}
