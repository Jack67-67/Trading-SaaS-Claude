"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { fetchBrokerData, type BrokerType, type BrokerConnectionData } from "@/lib/broker";
import { encryptCredential, decryptCredential } from "@/lib/broker-crypto";

// ── Public display type (never includes api_key / api_secret) ────────────────

export interface BrokerConnectionRow {
  id:               string;
  broker:           BrokerType;
  status:           "connected" | "error" | "pending";
  display_name:     string | null;
  account_number:   string | null;
  error_message:    string | null;
  last_verified_at: string | null;
  created_at:       string;
}

// ── Save a new connection (test credentials first) ───────────────────────────

export async function saveBrokerConnection(
  broker: BrokerType,
  apiKey: string,
  apiSecret: string,
): Promise<{ error: string } | { id: string; data: BrokerConnectionData }> {
  const supabase = createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return { error: "Not authenticated" };

  if (!apiKey.trim() || !apiSecret.trim()) {
    return { error: "API key and secret are required" };
  }

  // Verify credentials before saving
  const result = await fetchBrokerData(broker, apiKey.trim(), apiSecret.trim());
  if ("error" in result) return { error: result.error };

  const displayName = broker === "alpaca_paper" ? "Alpaca Paper" : "Alpaca Live";

  const { data, error } = await supabase
    .from("broker_connections")
    .upsert(
      {
        user_id:                user.id,
        broker,
        api_key:                encryptCredential(apiKey.trim()),
        api_secret:             encryptCredential(apiSecret.trim()),
        status:                 "connected" as const,
        display_name:           displayName,
        account_number:         result.account.account_number,
        cached_account_status:  result.account.status,
        cached_equity:          result.account.equity,
        cached_buying_power:    result.account.buying_power,
        cached_positions_count: result.positions.length,
        error_message:          null,
        last_verified_at:       new Date().toISOString(),
      },
      { onConflict: "user_id,broker" },
    )
    .select("id")
    .single();

  if (error) return { error: error.message };
  if (!data) return { error: "No row returned" };
  revalidatePath("/dashboard/settings");
  return { id: data.id, data: result };
}

// ── Remove a connection ───────────────────────────────────────────────────────

export async function removeBrokerConnection(
  connectionId: string,
): Promise<{ error: string } | undefined> {
  const supabase = createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("broker_connections")
    .delete()
    .eq("id", connectionId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/settings");
}

// ── Fetch live account data (credentials stay server-side) ───────────────────

export async function getBrokerLiveData(
  connectionId: string,
): Promise<{ error: string } | BrokerConnectionData> {
  const supabase = createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return { error: "Not authenticated" };

  // Read credentials server-side — never sent to client
  const { data: conn, error: connErr } = await supabase
    .from("broker_connections")
    .select("broker, api_key, api_secret")
    .eq("id", connectionId)
    .eq("user_id", user.id)
    .single();

  if (connErr || !conn) return { error: "Connection not found" };

  let apiKey: string;
  let apiSecret: string;
  try {
    apiKey = decryptCredential(conn.api_key);
    apiSecret = decryptCredential(conn.api_secret);
  } catch (decryptErr) {
    const msg = decryptErr instanceof Error ? decryptErr.message : String(decryptErr);
    console.error("[broker] credential decryption failed:", msg);
    return { error: "Failed to decrypt broker credentials. Re-enter your API keys in Settings." };
  }

  const result = await fetchBrokerData(
    conn.broker as BrokerType,
    apiKey,
    apiSecret,
  );

  // Update verified status + cache key account fields for readiness checks
  const newStatus = "error" in result ? "error" : "connected";
  await supabase
    .from("broker_connections")
    .update({
      status:                   newStatus,
      error_message:            "error" in result ? result.error : null,
      last_verified_at:         new Date().toISOString(),
      ...("error" in result ? {} : {
        account_number:         result.account.account_number,
        cached_account_status:  result.account.status,
        cached_equity:          result.account.equity,
        cached_buying_power:    result.account.buying_power,
        cached_positions_count: result.positions.length,
      }),
    })
    .eq("id", connectionId)
    .eq("user_id", user.id);

  revalidatePath("/dashboard/settings");
  return result;
}
