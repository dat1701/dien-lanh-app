# Hướng dẫn cài đặt và deploy

## Bước 1: Tạo dự án Supabase

1. Vào https://supabase.com → Đăng ký miễn phí
2. Nhấn **New Project** → Đặt tên, mật khẩu database, chọn region (Singapore gần nhất)
3. Đợi project khởi tạo xong (~2 phút)

## Bước 2: Tạo database schema

1. Vào **SQL Editor** trong Supabase dashboard
2. Copy toàn bộ nội dung file `supabase/schema.sql`
3. Paste vào SQL Editor → Nhấn **Run**

## Bước 3: Lấy thông tin kết nối

Vào **Settings > API**:
- Copy **Project URL** → dán vào `NEXT_PUBLIC_SUPABASE_URL`
- Copy **anon public key** → dán vào `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Bước 4: Tạo tài khoản đăng nhập

1. Vào **Authentication > Users** → Nhấn **Add user**
2. Nhập email và mật khẩu của bạn
3. Dùng thông tin này để đăng nhập vào app

## Bước 5: Deploy lên Vercel (miễn phí)

### Cách 1: Dùng GitHub (khuyên dùng)
1. Tạo repo GitHub → Push code lên
2. Vào https://vercel.com → Import repo
3. Thêm Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL` = URL từ bước 3
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = Key từ bước 3
4. Nhấn **Deploy**

### Cách 2: Deploy trực tiếp bằng Vercel CLI
```bash
npm install -g vercel
vercel
# Nhập env variables khi được hỏi
```

## Bước 6: Chạy local (phát triển)

1. Sửa file `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
```

2. Chạy:
```bash
npm run dev
```

3. Mở http://localhost:3000

## Tính năng đã có

- ✅ Đăng nhập / bảo mật
- ✅ Dashboard tổng quan với biểu đồ doanh thu
- ✅ Quản lý sản phẩm (CRUD, lọc theo danh mục)
- ✅ Quản lý kho (nhập/xuất/điều chỉnh, tự động trừ tồn kho)
- ✅ Bán hàng (POS: chọn hàng, tính tiền, thanh toán, công nợ)
- ✅ Danh sách đơn hàng
- ✅ Quản lý khách hàng
- ✅ Quản lý nhà cung cấp
- ✅ Bảo hành (theo serial number)
- ✅ Báo cáo doanh thu, tồn kho, top sản phẩm
