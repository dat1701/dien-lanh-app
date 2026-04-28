export function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('vi-VN')
}

export function formatDateTime(date: string): string {
  return new Date(date).toLocaleString('vi-VN')
}

export const CATEGORY_LABELS: Record<string, string> = {
  may_lanh: 'Máy lạnh',
  tu_lanh: 'Tủ lạnh',
  may_giat: 'Máy giặt',
  may_nuoc_nong: 'Máy nước nóng',
  quat: 'Quạt',
  khac: 'Khác',
}

export const STATUS_LABELS: Record<string, string> = {
  cho_xu_ly: 'Chờ xử lý',
  dang_giao: 'Đang giao',
  hoan_thanh: 'Hoàn thành',
  huy: 'Huỷ',
  tra_hang: 'Trả hàng',
}

export const PAYMENT_LABELS: Record<string, string> = {
  tien_mat: 'Tiền mặt',
  chuyen_khoan: 'Chuyển khoản',
  the: 'Thẻ',
  cong_no: 'Công nợ',
}

export const STATUS_COLORS: Record<string, string> = {
  cho_xu_ly: 'bg-yellow-100 text-yellow-700',
  dang_giao: 'bg-blue-100 text-blue-700',
  hoan_thanh: 'bg-green-100 text-green-700',
  huy: 'bg-red-100 text-red-700',
  tra_hang: 'bg-purple-100 text-purple-700',
}
