export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      autotrading_portfolios: {
        Row: {
          created_at: string
          id: string
          kill_switch_at: string | null
          max_monthly_loss_pct: number
          max_portfolio_risk_pct: number
          max_risk_per_strategy_pct: number
          max_simultaneous_trades: number
          max_weekly_loss_pct: number
          name: string
          pause_on_events: boolean
          pause_reason: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kill_switch_at?: string | null
          max_monthly_loss_pct?: number
          max_portfolio_risk_pct?: number
          max_risk_per_strategy_pct?: number
          max_simultaneous_trades?: number
          max_weekly_loss_pct?: number
          name?: string
          pause_on_events?: boolean
          pause_reason?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kill_switch_at?: string | null
          max_monthly_loss_pct?: number
          max_portfolio_risk_pct?: number
          max_risk_per_strategy_pct?: number
          max_simultaneous_trades?: number
          max_weekly_loss_pct?: number
          name?: string
          pause_on_events?: boolean
          pause_reason?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      backtest_runs: {
        Row: {
          completed_at: string | null
          config: Json
          created_at: string
          error_message: string | null
          id: string
          results: Json | null
          started_at: string | null
          status: string
          strategy_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          config?: Json
          created_at?: string
          error_message?: string | null
          id?: string
          results?: Json | null
          started_at?: string | null
          status?: string
          strategy_id: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          config?: Json
          created_at?: string
          error_message?: string | null
          id?: string
          results?: Json | null
          started_at?: string | null
          status?: string
          strategy_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "backtest_runs_strategy_id_fkey"
            columns: ["strategy_id"]
            isOneToOne: false
            referencedRelation: "strategies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "backtest_runs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      broker_connections: {
        Row: {
          account_number: string | null
          api_key: string
          api_secret: string
          broker: string
          cached_account_status: string | null
          cached_buying_power: number | null
          cached_equity: number | null
          cached_positions_count: number
          created_at: string
          display_name: string | null
          error_message: string | null
          id: string
          last_verified_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_number?: string | null
          api_key: string
          api_secret: string
          broker: string
          cached_account_status?: string | null
          cached_buying_power?: number | null
          cached_equity?: number | null
          cached_positions_count?: number
          created_at?: string
          display_name?: string | null
          error_message?: string | null
          id?: string
          last_verified_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_number?: string | null
          api_key?: string
          api_secret?: string
          broker?: string
          cached_account_status?: string | null
          cached_buying_power?: number | null
          cached_equity?: number | null
          cached_positions_count?: number
          created_at?: string
          display_name?: string | null
          error_message?: string | null
          id?: string
          last_verified_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      execution_orders: {
        Row: {
          broker_order_id: string | null
          close_price: number | null
          close_reason: string | null
          closed_at: string | null
          commission: number
          confidence: string | null
          created_at: string
          direction: string
          entry_price: number | null
          failure_reason: string | null
          filled_at: string | null
          filled_price: number | null
          filled_qty: number | null
          id: string
          limit_price: number | null
          order_type: string
          pnl: number | null
          pnl_pct: number | null
          portfolio_id: string | null
          qty: number
          risk_amount: number | null
          risk_pct: number | null
          session_id: string
          signal_at: string
          signal_reason: string | null
          status: string
          stop_loss: number | null
          strategy_name: string | null
          submitted_at: string | null
          symbol: string
          take_profit: number | null
          trading_mode: string
          updated_at: string
          user_id: string
        }
        Insert: {
          broker_order_id?: string | null
          close_price?: number | null
          close_reason?: string | null
          closed_at?: string | null
          commission?: number
          confidence?: string | null
          created_at?: string
          direction: string
          entry_price?: number | null
          failure_reason?: string | null
          filled_at?: string | null
          filled_price?: number | null
          filled_qty?: number | null
          id?: string
          limit_price?: number | null
          order_type: string
          pnl?: number | null
          pnl_pct?: number | null
          portfolio_id?: string | null
          qty: number
          risk_amount?: number | null
          risk_pct?: number | null
          session_id: string
          signal_at?: string
          signal_reason?: string | null
          status?: string
          stop_loss?: number | null
          strategy_name?: string | null
          submitted_at?: string | null
          symbol: string
          take_profit?: number | null
          trading_mode: string
          updated_at?: string
          user_id: string
        }
        Update: {
          broker_order_id?: string | null
          close_price?: number | null
          close_reason?: string | null
          closed_at?: string | null
          commission?: number
          confidence?: string | null
          created_at?: string
          direction?: string
          entry_price?: number | null
          failure_reason?: string | null
          filled_at?: string | null
          filled_price?: number | null
          filled_qty?: number | null
          id?: string
          limit_price?: number | null
          order_type?: string
          pnl?: number | null
          pnl_pct?: number | null
          portfolio_id?: string | null
          qty?: number
          risk_amount?: number | null
          risk_pct?: number | null
          session_id?: string
          signal_at?: string
          signal_reason?: string | null
          status?: string
          stop_loss?: number | null
          strategy_name?: string | null
          submitted_at?: string | null
          symbol?: string
          take_profit?: number | null
          trading_mode?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "execution_orders_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "paper_trade_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      paper_trade_sessions: {
        Row: {
          autotrading_enabled: boolean
          broker_connection_id: string | null
          commission_pct: number
          created_at: string
          id: string
          initial_capital: number
          interval: string
          last_action: string | null
          last_action_at: string | null
          last_refreshed_at: string | null
          last_results: Json | null
          live_prep_enabled_at: string | null
          max_capital_pct: number
          max_daily_trades: number
          max_monthly_loss_pct: number
          max_weekly_loss_pct: number
          name: string
          params: Json
          pause_on_events: boolean
          pause_reason: string | null
          portfolio_id: string | null
          risk: Json
          slippage_pct: number
          start_date: string
          status: string
          strategy_id: string
          symbol: string
          trading_mode: string
          updated_at: string
          user_id: string
        }
        Insert: {
          autotrading_enabled?: boolean
          broker_connection_id?: string | null
          commission_pct?: number
          created_at?: string
          id?: string
          initial_capital?: number
          interval?: string
          last_action?: string | null
          last_action_at?: string | null
          last_refreshed_at?: string | null
          last_results?: Json | null
          live_prep_enabled_at?: string | null
          max_capital_pct?: number
          max_daily_trades?: number
          max_monthly_loss_pct?: number
          max_weekly_loss_pct?: number
          name: string
          params?: Json
          pause_on_events?: boolean
          pause_reason?: string | null
          portfolio_id?: string | null
          risk?: Json
          slippage_pct?: number
          start_date: string
          status?: string
          strategy_id: string
          symbol: string
          trading_mode?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          autotrading_enabled?: boolean
          broker_connection_id?: string | null
          commission_pct?: number
          created_at?: string
          id?: string
          initial_capital?: number
          interval?: string
          last_action?: string | null
          last_action_at?: string | null
          last_refreshed_at?: string | null
          last_results?: Json | null
          live_prep_enabled_at?: string | null
          max_capital_pct?: number
          max_daily_trades?: number
          max_monthly_loss_pct?: number
          max_weekly_loss_pct?: number
          name?: string
          params?: Json
          pause_on_events?: boolean
          pause_reason?: string | null
          portfolio_id?: string | null
          risk?: Json
          slippage_pct?: number
          start_date?: string
          status?: string
          strategy_id?: string
          symbol?: string
          trading_mode?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "paper_trade_sessions_broker_connection_id_fkey"
            columns: ["broker_connection_id"]
            isOneToOne: false
            referencedRelation: "broker_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "paper_trade_sessions_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "autotrading_portfolios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "paper_trade_sessions_strategy_id_fkey"
            columns: ["strategy_id"]
            isOneToOne: false
            referencedRelation: "strategies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          subscription_tier: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          subscription_tier?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          subscription_tier?: string
          updated_at?: string
        }
        Relationships: []
      }
      strategies: {
        Row: {
          code: string
          config: Json | null
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          code?: string
          config?: Json | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          code?: string
          config?: Json | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "strategies_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
