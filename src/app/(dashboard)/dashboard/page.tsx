import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  TrendingUp,
  ShoppingCart,
  Package,
  AlertTriangle,
  Users,
  BarChart3,
} from 'lucide-react'
import { formatVND } from '@/lib/format'
import { RevenueChart } from '@/components/dashboard/revenue-chart'
import { RecentOrders } from '@/components/dashboard/recent-orders'
import { LowStockAlert } from '@/components/dashboard/low-stock-alert'

export default async function DashboardPage() {
  const supabase = await createClient()

  const today = new Date().toISOString().split('T')[0]
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

  const [
    { data: todayOrders },
    { data: monthOrders },
    { data: products },
    { data: customers },
    { data: lowStock },
    { data: recentOrders },
  ] = await Promise.all([
    supabase
      .from('orders')
      .select('total')
      .gte('created_at', today)
      .eq('status', 'hoan_thanh'),
    supabase
      .from('orders')
      .select('total, created_at')
      .gte('created_at', monthStart)
      .eq('status', 'hoan_thanh'),
    supabase.from('products').select('id').eq('is_active', true),
    supabase.from('customers').select('id').eq('is_active', true),
    supabase
      .from('products')
      .select('id, name, stock_quantity, min_stock')
      .filter('stock_quantity', 'lte', 'min_stock')
      .eq('is_active', true),
    supabase
      .from('orders')
      .select('*, customer:customers(name)')
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  const todayRevenue = todayOrders?.reduce((s, o) => s + (o.total || 0), 0) || 0
  const todayOrderCount = todayOrders?.length || 0
  const monthRevenue = monthOrders?.reduce((s, o) => s + (o.total || 0), 0) || 0

  const stats = [
    {
      title: 'Doanh thu hôm nay',
      value: formatVND(todayRevenue),
      sub: `${todayOrderCount} đơn hàng`,
      icon: TrendingUp,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      title: 'Doanh thu tháng',
      value: formatVND(monthRevenue),
      sub: `${monthOrders?.length || 0} đơn hàng`,
      icon: BarChart3,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      title: 'Tổng sản phẩm',
      value: String(products?.length || 0),
      sub: `${lowStock?.length || 0} sắp hết hàng`,
      icon: Package,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
    {
      title: 'Khách hàng',
      value: String(customers?.length || 0),
      sub: 'Đang hoạt động',
      icon: Users,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Tổng quan</h1>
        <p className="text-slate-500 text-sm mt-1">
          {new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ title, value, sub, icon: Icon, color, bg }) => (
          <Card key={title}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-500">{title}</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
                  <p className="text-xs text-slate-400 mt-1">{sub}</p>
                </div>
                <div className={`${bg} p-3 rounded-xl`}>
                  <Icon size={22} className={color} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue chart */}
        <div className="lg:col-span-2">
          <RevenueChart />
        </div>

        {/* Low stock */}
        <div>
          <LowStockAlert items={lowStock || []} />
        </div>
      </div>

      {/* Recent orders */}
      <RecentOrders orders={recentOrders || []} />
    </div>
  )
}
