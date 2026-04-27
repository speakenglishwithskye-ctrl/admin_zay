-- ================================================
-- INVENTORY MANAGER - SUPABASE SCHEMA MIGRATION
-- Run this in your Supabase SQL Editor
-- ================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ================================================
-- TABLE: users_profiles
-- ================================================
create table if not exists public.users_profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  full_name text,
  role text not null check (role in ('admin', 'agent')),
  created_at timestamptz default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users_profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'agent')
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ================================================
-- TABLE: products
-- ================================================
create table if not exists public.products (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  category text,
  book_price numeric default 0,
  sale_price numeric default 0,
  stock_quantity integer default 0,
  unit text,
  image_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ================================================
-- TABLE: sales
-- ================================================
create table if not exists public.sales (
  id uuid primary key default uuid_generate_v4(),
  agent_id uuid references public.users_profiles(id) on delete set null,
  created_at timestamptz default now(),
  total_amount numeric not null default 0,
  status text not null default 'confirmed' check (status in ('confirmed'))
);

-- ================================================
-- TABLE: sale_items
-- ================================================
create table if not exists public.sale_items (
  id uuid primary key default uuid_generate_v4(),
  sale_id uuid references public.sales(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  quantity integer not null,
  unit_price numeric not null,
  subtotal numeric not null
);

-- ================================================
-- FUNCTION: decrease_stock (called from frontend)
-- ================================================
create or replace function public.decrease_stock(p_product_id uuid, p_quantity integer)
returns void as $$
begin
  update public.products
  set stock_quantity = greatest(0, stock_quantity - p_quantity),
      updated_at = now()
  where id = p_product_id;
end;
$$ language plpgsql security definer;

-- ================================================
-- ROW LEVEL SECURITY
-- ================================================

alter table public.users_profiles enable row level security;
alter table public.products enable row level security;
alter table public.sales enable row level security;
alter table public.sale_items enable row level security;

-- Helper: get current user role
create or replace function public.get_user_role()
returns text as $$
  select role from public.users_profiles where id = auth.uid();
$$ language sql security definer;

-- users_profiles policies
create policy "Users can read own profile" on public.users_profiles
  for select using (id = auth.uid());

create policy "Admins can read all profiles" on public.users_profiles
  for select using (public.get_user_role() = 'admin');

create policy "Admins can update profiles" on public.users_profiles
  for all using (public.get_user_role() = 'admin');

-- products policies
create policy "All authenticated users can read products" on public.products
  for select using (auth.uid() is not null);

create policy "Admins can manage products" on public.products
  for all using (public.get_user_role() = 'admin');

-- sales policies
create policy "Agents can read own sales" on public.sales
  for select using (agent_id = auth.uid());

create policy "Agents can insert own sales" on public.sales
  for insert with check (agent_id = auth.uid());

create policy "Admins can read all sales" on public.sales
  for select using (public.get_user_role() = 'admin');

-- sale_items policies
create policy "Agents can read own sale items" on public.sale_items
  for select using (
    sale_id in (select id from public.sales where agent_id = auth.uid())
  );

create policy "Agents can insert sale items" on public.sale_items
  for insert with check (
    sale_id in (select id from public.sales where agent_id = auth.uid())
  );

create policy "Admins can read all sale items" on public.sale_items
  for select using (public.get_user_role() = 'admin');

-- ================================================
-- STORAGE: product-images bucket
-- ================================================
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

create policy "Anyone can view product images" on storage.objects
  for select using (bucket_id = 'product-images');

create policy "Admins can upload product images" on storage.objects
  for insert with check (
    bucket_id = 'product-images' and
    (select role from public.users_profiles where id = auth.uid()) = 'admin'
  );

create policy "Admins can update product images" on storage.objects
  for update using (
    bucket_id = 'product-images' and
    (select role from public.users_profiles where id = auth.uid()) = 'admin'
  );
