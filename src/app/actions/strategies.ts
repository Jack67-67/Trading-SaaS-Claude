"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createStrategy(formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const name = formData.get("name") as string;
  const description = (formData.get("description") as string) || null;
  const code = formData.get("code") as string;

  if (!name?.trim()) return { error: "Strategy name is required." };
  if (!code?.trim()) return { error: "Strategy code cannot be empty." };

  const { data, error } = await supabase
    .from("strategies")
    .insert({ user_id: user.id, name: name.trim(), description: description?.trim() || null, code })
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/dashboard/strategies");
  revalidatePath("/dashboard");
  redirect(`/dashboard/strategies/${data.id}`);
}

export async function updateStrategy(strategyId: string, formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const name = formData.get("name") as string;
  const description = (formData.get("description") as string) || null;
  const code = formData.get("code") as string;

  if (!name?.trim()) return { error: "Strategy name is required." };

  const { error } = await supabase
    .from("strategies")
    .update({ name: name.trim(), description: description?.trim() || null, code })
    .eq("id", strategyId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/strategies");
  revalidatePath(`/dashboard/strategies/${strategyId}`);
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteStrategy(strategyId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("strategies")
    .delete()
    .eq("id", strategyId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/strategies");
  revalidatePath("/dashboard");
  redirect("/dashboard/strategies");
}
