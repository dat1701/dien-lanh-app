-- Migration v3: Thêm product_code, product_name vào order_items
-- Chạy trong Supabase SQL Editor

alter table order_items add column if not exists product_code text;
alter table order_items add column if not exists product_name text;
