import { createClient } from '@/lib/supabase/server'
import { ReportsClient } from './reports-client'

export default async function ReportsPage() {
  const supabase = await createClient()

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
  const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString()

  const [
    { data: monthOrders },
    { data: prevMonthOrders },
    { data: allProducts },
    { data: topProducts },
    { data: recentTransactions },
  ] = await Promise.all([
    supabase
      .from('orders')
      .select('total, paid, debt, created_at')
      .gte('created_at', monthStart)
      .eq('status', 'hoan_thanh'),
    supabase
      .from('orders')
      .select('total')
      .gte('created_at', prevMonthStart)
      .lte('created_at', prevMonthEnd)
      .eq('status', 'hoan_thanh'),
    supabase
      .from('products')
      .select('id, name, stock_quantity, cost_price, sell_price')
      .eq('is_active', true),
    supabase
      .from('order_items')
      .select('product_id, quantity, sell_price, product:products(name)')
      .gte('created_at' as any, monthStart),
    supabase
      .from('stock_transactions')
      .select('type, quantity, price, created_at')
      .gte('created_at', monthStart),
  ])

  return (
    <ReportsClient
      monthOrders={monthOrders || []}
      prevMonthOrders={prevMonthOrders || []}
      products={allProducts || []}
      topProductItems={topProducts || []}
      transactions={recentTransactions || []}
    />
  )
}
