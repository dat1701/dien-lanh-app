import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { formatDate } from '@/lib/format'

const WARRANTY_STATUS: Record<string, { label: string; color: string }> = {
  con_han: { label: 'Còn hạn', color: 'bg-green-100 text-green-700' },
  het_han: { label: 'Hết hạn', color: 'bg-red-100 text-red-700' },
  da_bao_hanh: { label: 'Đã bảo hành', color: 'bg-blue-100 text-blue-700' },
}

export default async function WarrantyPage() {
  const supabase = await createClient()
  const { data: warranties } = await supabase
    .from('warranty_cards')
    .select('*, product:products(name, code, brand), customer:customers(name, phone)')
    .order('created_at', { ascending: false })

  const today = new Date()
  const expiringSoon = warranties?.filter(w => {
    const exp = new Date(w.warranty_expires)
    const days = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return w.status === 'con_han' && days <= 30 && days > 0
  })

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Bảo hành</h1>
        <p className="text-slate-500 text-sm mt-0.5">{warranties?.length || 0} phiếu bảo hành</p>
      </div>

      {expiringSoon && expiringSoon.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg px-4 py-3 text-sm text-orange-700">
          ⚠️ <strong>{expiringSoon.length} phiếu bảo hành</strong> sắp hết hạn trong 30 ngày tới
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr className="text-slate-500 text-xs">
                  <th className="text-left px-4 py-3 font-medium">Serial</th>
                  <th className="text-left px-4 py-3 font-medium">Sản phẩm</th>
                  <th className="text-left px-4 py-3 font-medium">Khách hàng</th>
                  <th className="text-left px-4 py-3 font-medium">Ngày bán</th>
                  <th className="text-left px-4 py-3 font-medium">Hết hạn BH</th>
                  <th className="text-center px-4 py-3 font-medium">Trạng thái</th>
                  <th className="text-left px-4 py-3 font-medium">Ghi chú</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {!warranties || warranties.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-400">Chưa có phiếu bảo hành nào</td>
                  </tr>
                ) : (
                  warranties.map((w: any) => {
                    const daysLeft = Math.ceil(
                      (new Date(w.warranty_expires).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
                    )
                    return (
                      <tr key={w.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-mono text-sm font-medium">{w.serial_number}</td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-800">{w.product?.name}</p>
                          <p className="text-xs text-slate-400">{w.product?.brand}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-800">{w.customer_name}</p>
                          <p className="text-xs text-slate-400">{w.customer_phone}</p>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{formatDate(w.sell_date)}</td>
                        <td className="px-4 py-3">
                          <p className="text-slate-700">{formatDate(w.warranty_expires)}</p>
                          {w.status === 'con_han' && (
                            <p className={`text-xs ${daysLeft <= 30 ? 'text-orange-500' : 'text-slate-400'}`}>
                              {daysLeft > 0 ? `Còn ${daysLeft} ngày` : 'Hôm nay hết'}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${WARRANTY_STATUS[w.status]?.color}`}>
                            {WARRANTY_STATUS[w.status]?.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-400 text-xs">{w.note || '—'}</td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
