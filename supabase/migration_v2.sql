-- ============================================================
-- Migration v2: Thêm các module Trả hàng, Nhập hàng, Kiểm kho, Xuất hủy, Sổ quỹ
-- ============================================================

-- Purchase Orders (Nhập hàng chính thức)
create table if not exists purchase_orders (
  id uuid primary key default uuid_generate_v4(),
  code text unique not null,
  supplier_id uuid references suppliers(id),
  supplier_name text,
  status text not null default 'phieu_tam' check (status in ('phieu_tam','da_nhap','da_huy')),
  total_items int not null default 0,
  subtotal numeric(15,0) not null default 0,
  discount numeric(15,0) not null default 0,
  total numeric(15,0) not null default 0,
  paid numeric(15,0) not null default 0,
  debt numeric(15,0) not null default 0,
  note text,
  created_by text not null default 'admin',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists purchase_order_items (
  id uuid primary key default uuid_generate_v4(),
  purchase_order_id uuid references purchase_orders(id) on delete cascade,
  product_id uuid references products(id),
  quantity int not null default 1,
  cost_price numeric(15,0) not null,
  discount numeric(15,0) not null default 0,
  total numeric(15,0) not null default 0
);

-- Returns (Trả hàng từ khách)
create table if not exists return_orders (
  id uuid primary key default uuid_generate_v4(),
  code text unique not null,
  order_id uuid references orders(id),
  order_code text,
  customer_id uuid references customers(id),
  customer_name text,
  customer_phone text,
  status text not null default 'da_tra' check (status in ('da_tra','da_huy')),
  subtotal numeric(15,0) not null default 0,
  refund_amount numeric(15,0) not null default 0,
  note text,
  created_by text not null default 'admin',
  created_at timestamptz default now()
);

create table if not exists return_order_items (
  id uuid primary key default uuid_generate_v4(),
  return_order_id uuid references return_orders(id) on delete cascade,
  product_id uuid references products(id),
  quantity int not null default 1,
  sell_price numeric(15,0) not null,
  total numeric(15,0) not null default 0
);

-- Supplier Returns (Trả hàng nhập)
create table if not exists supplier_returns (
  id uuid primary key default uuid_generate_v4(),
  code text unique not null,
  purchase_order_id uuid references purchase_orders(id),
  supplier_id uuid references suppliers(id),
  supplier_name text,
  status text not null default 'hoan_thanh' check (status in ('hoan_thanh','da_huy')),
  total numeric(15,0) not null default 0,
  refund_amount numeric(15,0) not null default 0,
  note text,
  created_by text not null default 'admin',
  created_at timestamptz default now()
);

create table if not exists supplier_return_items (
  id uuid primary key default uuid_generate_v4(),
  supplier_return_id uuid references supplier_returns(id) on delete cascade,
  product_id uuid references products(id),
  quantity int not null default 1,
  cost_price numeric(15,0) not null,
  total numeric(15,0) not null default 0
);

-- Stock Takes (Kiểm kho)
create table if not exists stock_takes (
  id uuid primary key default uuid_generate_v4(),
  code text unique not null,
  status text not null default 'phieu_tam' check (status in ('phieu_tam','da_can_bang','da_huy')),
  note text,
  balanced_at timestamptz,
  created_by text not null default 'admin',
  created_at timestamptz default now()
);

create table if not exists stock_take_items (
  id uuid primary key default uuid_generate_v4(),
  stock_take_id uuid references stock_takes(id) on delete cascade,
  product_id uuid references products(id),
  system_quantity int not null default 0,
  actual_quantity int not null default 0,
  difference int generated always as (actual_quantity - system_quantity) stored
);

-- Damage Exports (Xuất hủy)
create table if not exists damage_exports (
  id uuid primary key default uuid_generate_v4(),
  code text unique not null,
  status text not null default 'phieu_tam' check (status in ('phieu_tam','hoan_thanh','da_huy')),
  total_value numeric(15,0) not null default 0,
  note text,
  created_by text not null default 'admin',
  created_at timestamptz default now()
);

create table if not exists damage_export_items (
  id uuid primary key default uuid_generate_v4(),
  damage_export_id uuid references damage_exports(id) on delete cascade,
  product_id uuid references products(id),
  quantity int not null default 1,
  cost_price numeric(15,0) not null default 0,
  total numeric(15,0) not null default 0
);

-- Cash Flow (Sổ quỹ - Phiếu thu/chi)
create table if not exists cash_transactions (
  id uuid primary key default uuid_generate_v4(),
  code text unique not null,
  type text not null check (type in ('thu','chi')),
  fund_type text not null default 'tien_mat' check (fund_type in ('tien_mat','ngan_hang','vi_dien_tu')),
  category text not null,
  amount numeric(15,0) not null default 0,
  payer_receiver text,
  reference_id uuid,
  reference_type text,
  note text,
  status text not null default 'da_thanh_toan' check (status in ('da_thanh_toan','da_huy')),
  account_number text,
  created_by text not null default 'admin',
  created_at timestamptz default now()
);

-- Repair Requests (Yêu cầu sửa chữa)
create table if not exists repair_requests (
  id uuid primary key default uuid_generate_v4(),
  code text unique not null,
  customer_id uuid references customers(id),
  customer_name text not null,
  customer_phone text not null,
  product_name text not null,
  serial_number text,
  issue_description text,
  status text not null default 'dang_xu_ly' check (status in ('dang_xu_ly','hoan_thanh','da_huy')),
  cost numeric(15,0) not null default 0,
  paid numeric(15,0) not null default 0,
  note text,
  created_by text not null default 'admin',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Customer groups
create table if not exists customer_groups (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  created_at timestamptz default now()
);

alter table customers add column if not exists group_id uuid references customer_groups(id);
alter table customers add column if not exists birthday date;
alter table customers add column if not exists gender text check (gender in ('nam','nu','khac'));
alter table customers add column if not exists company text;
alter table customers add column if not exists tax_code text;

-- RLS policies
alter table purchase_orders enable row level security;
alter table purchase_order_items enable row level security;
alter table return_orders enable row level security;
alter table return_order_items enable row level security;
alter table supplier_returns enable row level security;
alter table supplier_return_items enable row level security;
alter table stock_takes enable row level security;
alter table stock_take_items enable row level security;
alter table damage_exports enable row level security;
alter table damage_export_items enable row level security;
alter table cash_transactions enable row level security;
alter table repair_requests enable row level security;
alter table customer_groups enable row level security;

create policy "Allow all for authenticated" on purchase_orders for all to authenticated using (true) with check (true);
create policy "Allow all for authenticated" on purchase_order_items for all to authenticated using (true) with check (true);
create policy "Allow all for authenticated" on return_orders for all to authenticated using (true) with check (true);
create policy "Allow all for authenticated" on return_order_items for all to authenticated using (true) with check (true);
create policy "Allow all for authenticated" on supplier_returns for all to authenticated using (true) with check (true);
create policy "Allow all for authenticated" on supplier_return_items for all to authenticated using (true) with check (true);
create policy "Allow all for authenticated" on stock_takes for all to authenticated using (true) with check (true);
create policy "Allow all for authenticated" on stock_take_items for all to authenticated using (true) with check (true);
create policy "Allow all for authenticated" on damage_exports for all to authenticated using (true) with check (true);
create policy "Allow all for authenticated" on damage_export_items for all to authenticated using (true) with check (true);
create policy "Allow all for authenticated" on cash_transactions for all to authenticated using (true) with check (true);
create policy "Allow all for authenticated" on repair_requests for all to authenticated using (true) with check (true);
create policy "Allow all for authenticated" on customer_groups for all to authenticated using (true) with check (true);

-- Trigger updated_at for new tables
create trigger purchase_orders_updated_at before update on purchase_orders
  for each row execute function update_updated_at();
create trigger repair_requests_updated_at before update on repair_requests
  for each row execute function update_updated_at();
