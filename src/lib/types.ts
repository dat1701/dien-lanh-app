export type ProductCategory =
  | 'may_lanh'
  | 'tu_lanh'
  | 'may_giat'
  | 'may_nuoc_nong'
  | 'quat'
  | 'khac'

export type StockTransactionType = 'nhap' | 'xuat' | 'tra_hang' | 'dieu_chinh'

export type OrderStatus = 'cho_xu_ly' | 'dang_giao' | 'hoan_thanh' | 'huy'

export type PaymentMethod = 'tien_mat' | 'chuyen_khoan' | 'the' | 'cong_no'

export interface Product {
  id: string
  code: string
  name: string
  category: ProductCategory
  brand: string
  model: string
  description?: string
  cost_price: number
  sell_price: number
  stock_quantity: number
  min_stock: number
  unit: string
  warranty_months: number
  image_url?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Supplier {
  id: string
  code: string
  name: string
  phone: string
  email?: string
  address?: string
  contact_person?: string
  debt: number
  is_active: boolean
  created_at: string
}

export interface Customer {
  id: string
  code: string
  name: string
  phone: string
  email?: string
  address?: string
  debt: number
  total_purchase: number
  points: number
  is_active: boolean
  created_at: string
}

export interface StockTransaction {
  id: string
  product_id: string
  product?: Product
  type: StockTransactionType
  quantity: number
  price: number
  supplier_id?: string
  supplier?: Supplier
  order_id?: string
  serial_numbers?: string[]
  note?: string
  created_by: string
  created_at: string
}

export interface OrderItem {
  id: string
  order_id: string
  product_id: string
  product?: Product
  quantity: number
  sell_price: number
  discount: number
  serial_number?: string
  warranty_months: number
}

export interface Order {
  id: string
  code: string
  customer_id?: string
  customer?: Customer
  customer_name?: string
  customer_phone?: string
  status: OrderStatus
  payment_method: PaymentMethod
  subtotal: number
  discount: number
  total: number
  paid: number
  debt: number
  note?: string
  items?: OrderItem[]
  created_by: string
  created_at: string
  updated_at: string
}

export interface WarrantyCard {
  id: string
  serial_number: string
  product_id: string
  product?: Product
  customer_id?: string
  customer?: Customer
  customer_name: string
  customer_phone: string
  order_id?: string
  sell_date: string
  warranty_expires: string
  status: 'con_han' | 'het_han' | 'da_bao_hanh'
  note?: string
  created_at: string
}

export interface Employee {
  id: string
  code: string
  name: string
  phone: string
  email?: string
  role: 'admin' | 'quan_ly' | 'ban_hang' | 'kho'
  commission_rate: number
  is_active: boolean
  created_at: string
}

export interface DashboardStats {
  today_revenue: number
  today_orders: number
  total_products: number
  low_stock_count: number
  total_customers: number
  monthly_revenue: number
}
