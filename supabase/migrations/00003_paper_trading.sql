-- Paper trade sessions table
-- Stores virtual trading sessions that replay a strategy from a start date to today.

create table if not exists paper_trade_sessions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  strategy_id     uuid not null references strategies(id) on delete cascade,
  name            text not null,
  symbol          text not null,
  interval        text not null default '1d',
  start_date      date not null,
  params          jsonb not null default '{}',
  risk            jsonb not null default '{}',
  commission_pct  numeric(6,4) not null default 0,
  slippage_pct    numeric(6,4) not null default 0,
  initial_capital numeric(14,2) not null default 100000,
  status          text not null default 'active' check (status in ('active', 'paused', 'archived')),
  last_results    jsonb,            -- cached result from last refresh
  last_refreshed_at timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- RLS
alter table paper_trade_sessions enable row level security;

create policy "Users manage own paper sessions"
  on paper_trade_sessions
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Auto-update updated_at
create or replace function update_updated_at_column()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger paper_trade_sessions_updated_at
  before update on paper_trade_sessions
  for each row execute function update_updated_at_column();
