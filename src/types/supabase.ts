/**
 * Supabase-generated types stub.
 *
 * In production, run `npx supabase gen types typescript` to regenerate
 * this file from your live schema. This manual version keeps the app
 * buildable before that step.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          subscription_tier: "free" | "pro" | "enterprise";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          subscription_tier?: "free" | "pro" | "enterprise";
        };
        Update: {
          full_name?: string | null;
          avatar_url?: string | null;
          subscription_tier?: "free" | "pro" | "enterprise";
        };
      };
      strategies: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          code: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          name: string;
          description?: string | null;
          code: string;
        };
        Update: {
          name?: string;
          description?: string | null;
          code?: string;
        };
      };
      backtest_runs: {
        Row: {
          id: string;
          user_id: string;
          strategy_id: string;
          status: string;
          config: Json;
          results: Json | null;
          error_message: string | null;
          created_at: string;
          started_at: string | null;
          completed_at: string | null;
        };
        Insert: {
          user_id: string;
          strategy_id: string;
          status?: string;
          config: Json;
        };
        Update: {
          status?: string;
          results?: Json | null;
          error_message?: string | null;
          started_at?: string | null;
          completed_at?: string | null;
        };
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
  };
}
