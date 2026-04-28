-- Migration v4: Thêm trạng thái 'tra_hang' cho orders
-- Chạy trong Supabase SQL Editor

alter table orders drop constraint if exists orders_status_check;
alter table orders add constraint orders_status_check
  check (status in ('cho_xu_ly', 'dang_giao', 'hoan_thanh', 'huy', 'tra_hang'));
