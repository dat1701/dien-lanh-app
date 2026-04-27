-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Suppliers
create table suppliers (
  id uuid primary key default uuid_generate_v4(),
  code text unique not null,
  name text not null,
  phone text not null,
  email text,
  address text,
  contact_person text,
  debt numeric(15,0) default 0,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Customers
create table customers (
  id uuid primary key default uuid_generate_v4(),
  code text unique not null,
  name text not null,
  phone text not null,
  email text,
  address text,
  debt numeric(15,0) default 0,
  total_purchase numeric(15,0) default 0,
  points int default 0,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Products
create table products (
  id uuid primary key default uuid_generate_v4(),
  code text unique not null,
  name text not null,
  category text not null check (category in ('may_lanh','tu_lanh','may_giat','may_nuoc_nong','quat','khac')),
  brand text not null,
  model text not null,
  description text,
  cost_price numeric(15,0) not null default 0,
  sell_price numeric(15,0) not null default 0,
  stock_quantity int not null default 0,
  min_stock int not null default 0,
  unit text not null default 'cái',
  warranty_months int not null default 12,
  image_url text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Orders
create table orders (
  id uuid primary key default uuid_generate_v4(),
  code text unique not null,
  customer_id uuid references customers(id),
  customer_name text,
  customer_phone text,
  status text not null default 'cho_xu_ly' check (status in ('cho_xu_ly','dang_giao','hoan_thanh','huy')),
  payment_method text not null default 'tien_mat' check (payment_method in ('tien_mat','chuyen_khoan','the','cong_no')),
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

-- Order items
create table order_items (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid references orders(id) on delete cascade,
  product_id uuid references products(id),
  quantity int not null default 1,
  sell_price numeric(15,0) not null,
  discount numeric(15,0) not null default 0,
  serial_number text,
  warranty_months int not null default 12
);

-- Stock transactions
create table stock_transactions (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid references products(id),
  type text not null check (type in ('nhap','xuat','tra_hang','dieu_chinh')),
  quantity int not null,
  price numeric(15,0) not null default 0,
  supplier_id uuid references suppliers(id),
  order_id uuid references orders(id),
  serial_numbers text[],
  note text,
  created_by text not null default 'admin',
  created_at timestamptz default now()
);

-- Warranty cards
create table warranty_cards (
  id uuid primary key default uuid_generate_v4(),
  serial_number text not null,
  product_id uuid references products(id),
  customer_id uuid references customers(id),
  customer_name text not null,
  customer_phone text not null,
  order_id uuid references orders(id),
  sell_date date not null,
  warranty_expires date not null,
  status text not null default 'con_han' check (status in ('con_han','het_han','da_bao_hanh')),
  note text,
  created_at timestamptz default now()
);

-- Function to auto-update updated_at
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger products_updated_at before update on products
  for each row execute function update_updated_at();

create trigger orders_updated_at before update on orders
  for each row execute function update_updated_at();

-- Function to auto-adjust stock on transaction insert
create or replace function adjust_stock_on_transaction()
returns trigger as $$
begin
  if new.type = 'nhap' or new.type = 'tra_hang' then
    update products set stock_quantity = stock_quantity + new.quantity where id = new.product_id;
  elsif new.type = 'xuat' or new.type = 'dieu_chinh' then
    update products set stock_quantity = stock_quantity - new.quantity where id = new.product_id;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger stock_auto_adjust after insert on stock_transactions
  for each row execute function adjust_stock_on_transaction();

-- RLS policies (allow all for authenticated users)
alter table products enable row level security;
alter table suppliers enable row level security;
alter table customers enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table stock_transactions enable row level security;
alter table warranty_cards enable row level security;

create policy "Allow all for authenticated" on products for all to authenticated using (true) with check (true);
create policy "Allow all for authenticated" on suppliers for all to authenticated using (true) with check (true);
create policy "Allow all for authenticated" on customers for all to authenticated using (true) with check (true);
create policy "Allow all for authenticated" on orders for all to authenticated using (true) with check (true);
create policy "Allow all for authenticated" on order_items for all to authenticated using (true) with check (true);
create policy "Allow all for authenticated" on stock_transactions for all to authenticated using (true) with check (true);
create policy "Allow all for authenticated" on warranty_cards for all to authenticated using (true) with check (true);

-- Sample data
insert into suppliers (code, name, phone, contact_person) values
  ('NCC001', 'Công ty Hòa Phát', '0901234567', 'Anh Minh'),
  ('NCC002', 'Điện máy Sài Gòn', '0912345678', 'Chị Lan');

insert into products (code, name, category, brand, model, cost_price, sell_price, stock_quantity, min_stock, warranty_months) values
  ('SP001', 'Máy lạnh Samsung 1HP', 'may_lanh', 'Samsung', 'AR09TYHQBWKNSV', 6500000, 8500000, 10, 3, 24),
  ('SP002', 'Máy lạnh LG 1.5HP', 'may_lanh', 'LG', 'V13WIN1', 7800000, 10500000, 8, 3, 24),
  ('SP003', 'Tủ lạnh Samsung 300L', 'tu_lanh', 'Samsung', 'RT29K5532S8/SV', 8200000, 11000000, 5, 2, 24),
  ('SP004', 'Máy giặt LG 8kg', 'may_giat', 'LG', 'FV1208S4W', 6900000, 9500000, 4, 2, 24),
  ('SP005', 'Máy lạnh Daikin 1HP', 'may_lanh', 'Daikin', 'FTKZ25VVMV', 9500000, 13000000, 3, 2, 36);

insert into customers (code, name, phone, address) values
  ('KH001', 'Nguyễn Văn A', '0901111111', '123 Lê Lợi, TP.HCM'),
  ('KH002', 'Trần Thị B', '0902222222', '456 Nguyễn Huệ, TP.HCM');
