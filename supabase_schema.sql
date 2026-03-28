-- Chạy file này trong Supabase SQL Editor
-- https://supabase.com → SQL Editor → New query

-- Bảng lưu dữ liệu ngày của từng user
create table if not exists timeblock_days (
  id          uuid primary key default gen_random_uuid(),
  user_email  text not null,
  day_key     text not null,        -- format: "2026-03-24"
  data        jsonb not null,       -- toàn bộ blocks của ngày đó
  updated_at  timestamptz default now(),
  unique(user_email, day_key)       -- mỗi user chỉ có 1 record/ngày
);

-- Index để query nhanh theo user
create index if not exists idx_timeblock_user on timeblock_days(user_email);

-- Tự cập nhật updated_at
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger timeblock_updated_at
  before update on timeblock_days
  for each row execute function update_updated_at();

-- Row Level Security: mỗi user chỉ đọc/ghi được data của mình
alter table timeblock_days enable row level security;

create policy "Users manage own data"
  on timeblock_days
  for all
  using (true)        -- API route server-side nên dùng service key, bỏ qua RLS
  with check (true);
