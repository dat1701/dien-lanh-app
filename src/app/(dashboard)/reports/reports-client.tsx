'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatVND } from '@/lib/format'
import { TrendingUp, TrendingDown, Package, ShoppingCart, DollarSign, AlertCircle } from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'

interface Props {
  monthOrders: { total: number; paid: number; debt: number; created_at: string }[]
  prevMonthOrders: { total: number }[]
  products: { id: string; name: string; stock_quantity: number; cost_price: number; sell_price: number }[]
  topProductItems: { product_id: string; quantity: number; sell_price: number; product: any }[]
  transactions: { type: string; quantity: number; price: number; created_at: string }[]
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

export function ReportsClient({ monthOrders, prevMonthOrders, products, topProductItems, transactions }: Props) {
  const monthRevenue = monthOrders.reduce((s, o) => s + (o.total || 0), 0)
  const prevRevenue = prevMonthOrders.reduce((s, o) => s + (o.total || 0), 0)
  const revGrowth = prevRevenue > 0 ? ((monthRevenue - prevRevenue) / prevRevenue) * 100 : 0

  const monthDebt = monthOrders.reduce((s, o) => s + (o.debt || 0), 0)
  const totalInventoryValue = products.reduce((s, p) => s + p.stock_quantity * p.cost_price, 0)
  const totalInventoryRetail = products.reduce((s, p) => s + p.stock_quantity * p.sell_price, 0)

  const importValue = transactions
    .filter(t => t.type === 'nhap')
    .reduce((s, t) => s + t.quantity * t.price, 0)

  // Top selling products
  const productMap: Record<string, { name: string; qty: number; revenue: number }> = {}
  for (const item of topProductItems) {
    const pid = item.product_id
    if (!productMap[pid]) {
      productMap[pid] = { name: item.product?.name || pid, qty: 0, revenue: 0 }
    }
    productMap[pid].qty += item.quantity
    productMap[pid].revenue += item.quantity * item.sell_price
  }
  const topProducts = Object.values(productMap)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)

  const pieData = topProducts.map(p => ({ name: p.name, value: p.revenue }))

  const month = new Date().toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Báo cáo</h1>
        <p className="text-slate-500 text-sm mt-0.5">Tổng hợp {month}</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500">Doanh thu tháng</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{formatVND(monthRevenue)}</p>
                <div className={`flex items-center gap-1 mt-1 text-xs ${revGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {revGrowth >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {Math.abs(revGrowth).toFixed(1)}% so với tháng trước
                </div>
              </div>
              <div className="bg-blue-50 p-3 rounded-xl"><DollarSign size={22} className="text-blue-600" /></div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500">Số đơn hàng</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{monthOrders.length}</p>
                <p className="text-xs text-slate-400 mt-1">
                  TB {monthOrders.length > 0 ? formatVND(Math.round(monthRevenue / monthOrders.length)) : '0đ'}/đơn
                </p>
              </div>
              <div className="bg-green-50 p-3 rounded-xl"><ShoppingCart size={22} className="text-green-600" /></div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500">Giá trị tồn kho</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{formatVND(totalInventoryValue)}</p>
                <p className="text-xs text-slate-400 mt-1">Giá bán: {formatVND(totalInventoryRetail)}</p>
              </div>
              <div className="bg-purple-50 p-3 rounded-xl"><Package size={22} className="text-purple-600" /></div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500">Công nợ phát sinh</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{formatVND(monthDebt)}</p>
                <p className="text-xs text-slate-400 mt-1">Trong tháng này</p>
              </div>
              <div className="bg-red-50 p-3 rounded-xl"><AlertCircle size={22} className="text-red-500" /></div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top products chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top sản phẩm bán chạy tháng này</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length === 0 ? (
              <p className="text-center text-slate-400 py-8">Chưa có dữ liệu</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ percent }) => `${((percent ?? 0) * 100).toFixed(0)}%`}>
                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => formatVND(Number(v))} />
                  <Legend formatter={v => v.length > 20 ? v.slice(0, 20) + '...' : v} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Top products table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Chi tiết bán hàng</CardTitle>
          </CardHeader>
          <CardContent>
            {topProducts.length === 0 ? (
              <p className="text-center text-slate-400 py-8">Chưa có dữ liệu</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-slate-500 border-b">
                    <th className="text-left pb-2 font-medium">Sản phẩm</th>
                    <th className="text-center pb-2 font-medium">SL</th>
                    <th className="text-right pb-2 font-medium">Doanh thu</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {topProducts.map((p, i) => (
                    <tr key={i}>
                      <td className="py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                          <span className="text-slate-700 text-xs">{p.name}</span>
                        </div>
                      </td>
                      <td className="py-2.5 text-center text-slate-600">{p.qty}</td>
                      <td className="py-2.5 text-right font-medium">{formatVND(p.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Inventory status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tồn kho hiện tại</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-500 border-b">
                  <th className="text-left pb-2 font-medium">Sản phẩm</th>
                  <th className="text-center pb-2 font-medium">Tồn kho</th>
                  <th className="text-right pb-2 font-medium">Giá vốn</th>
                  <th className="text-right pb-2 font-medium">Giá bán</th>
                  <th className="text-right pb-2 font-medium">Giá trị tồn (vốn)</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {products.map(p => (
                  <tr key={p.id} className={p.stock_quantity === 0 ? 'opacity-50' : ''}>
                    <td className="py-2.5 text-slate-800">{p.name}</td>
                    <td className="py-2.5 text-center font-bold">
                      <span className={p.stock_quantity === 0 ? 'text-red-500' : 'text-slate-700'}>{p.stock_quantity}</span>
                    </td>
                    <td className="py-2.5 text-right text-slate-500">{formatVND(p.cost_price)}</td>
                    <td className="py-2.5 text-right">{formatVND(p.sell_price)}</td>
                    <td className="py-2.5 text-right font-medium">{formatVND(p.stock_quantity * p.cost_price)}</td>
                  </tr>
                ))}
                <tr className="border-t font-bold">
                  <td className="py-2.5" colSpan={4}>Tổng giá trị tồn kho</td>
                  <td className="py-2.5 text-right text-blue-600">{formatVND(totalInventoryValue)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
