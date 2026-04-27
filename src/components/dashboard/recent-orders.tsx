import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatVND, formatDateTime, STATUS_LABELS, STATUS_COLORS } from '@/lib/format'
import Link from 'next/link'

export function RecentOrders({ orders }: { orders: any[] }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Đơn hàng gần đây</CardTitle>
        <Link href="/orders" className="text-sm text-blue-600 hover:underline">
          Xem tất cả →
        </Link>
      </CardHeader>
      <CardContent>
        {orders.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-8">Chưa có đơn hàng nào</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-slate-500 text-xs">
                  <th className="text-left pb-2 font-medium">Mã đơn</th>
                  <th className="text-left pb-2 font-medium">Khách hàng</th>
                  <th className="text-left pb-2 font-medium">Thời gian</th>
                  <th className="text-right pb-2 font-medium">Tổng tiền</th>
                  <th className="text-center pb-2 font-medium">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {orders.map((order: any) => (
                  <tr key={order.id} className="hover:bg-slate-50">
                    <td className="py-2.5 font-mono font-medium text-blue-600">
                      <Link href={`/orders/${order.id}`}>{order.code}</Link>
                    </td>
                    <td className="py-2.5 text-slate-700">
                      {order.customer?.name || order.customer_name || 'Khách lẻ'}
                    </td>
                    <td className="py-2.5 text-slate-400 text-xs">
                      {formatDateTime(order.created_at)}
                    </td>
                    <td className="py-2.5 text-right font-medium">
                      {formatVND(order.total)}
                    </td>
                    <td className="py-2.5 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[order.status]}`}>
                        {STATUS_LABELS[order.status]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
