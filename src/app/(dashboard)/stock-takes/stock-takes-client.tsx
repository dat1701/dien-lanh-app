'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, ClipboardList, Loader2, CheckCircle } from 'lucide-react'
import { formatVND, formatDateTime } from '@/lib/format'
import { createClient } from '@/lib/supabase/client'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useRouter } from 'next/navigation'

const STATUS = {
  phieu_tam: { label: 'Phiếu tạm', color: 'bg-yellow-100 text-yellow-700' },
  da_can_bang: { label: 'Đã cân bằng kho', color: 'bg-green-100 text-green-700' },
  da_huy: { label: 'Đã hủy', color: 'bg-red-100 text-red-700' },
}

export function StockTakesClient({ initialTakes, products }: any) {
  const [takes, setTakes] = useState(initialTakes)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [balanceDialogId, setBalanceDialogId] = useState<string | null>(null)
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [note, setNote] = useState('')
  const supabase = createClient()
  const router = useRouter()

  function openNew() {
    setItems(products.map((p: any) => ({ product_id: p.id, name: p.name, code: p.code, system_quantity: p.stock_quantity, actual_quantity: p.stock_quantity })))
    setNote('')
    setDialogOpen(true)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const code = 'KK' + Date.now().toString().slice(-8)
    const { data: take } = await supabase.from('stock_takes').insert({ code, note: note || null, status: 'phieu_tam' }).select().single()
    if (!take) { setLoading(false); return }

    await supabase.from('stock_take_items').insert(
      items.map(i => ({ stock_take_id: take.id, product_id: i.product_id, system_quantity: i.system_quantity, actual_quantity: Number(i.actual_quantity) }))
    )

    setTakes((prev: any) => [take, ...prev])
    setDialogOpen(false)
    setLoading(false)
  }

  async function handleBalance(id: string) {
    if (!confirm('Cân bằng kho sẽ điều chỉnh tồn kho thực tế vào hệ thống. Xác nhận?')) return
    setLoading(true)

    const { data: takeItems } = await supabase.from('stock_take_items').select('*').eq('stock_take_id', id)

    for (const item of takeItems || []) {
      const diff = item.actual_quantity - item.system_quantity
      if (diff !== 0) {
        await supabase.from('stock_transactions').insert({
          product_id: item.product_id,
          type: 'dieu_chinh',
          quantity: Math.abs(diff),
          price: 0,
          note: `Kiểm kho - ${diff > 0 ? 'tăng' : 'giảm'} ${Math.abs(diff)}`,
        })
      }
    }

    await supabase.from('stock_takes').update({ status: 'da_can_bang', balanced_at: new Date().toISOString() }).eq('id', id)
    setTakes((prev: any) => prev.map((t: any) => t.id === id ? { ...t, status: 'da_can_bang' } : t))
    setLoading(false)
    router.refresh()
  }

  const totalDiff = items.reduce((s, i) => s + (Number(i.actual_quantity) - i.system_quantity), 0)
  const diffItems = items.filter(i => Number(i.actual_quantity) !== i.system_quantity)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Kiểm kho</h1>
          <p className="text-slate-500 text-sm mt-0.5">{takes.length} phiếu kiểm kho</p>
        </div>
        <Button onClick={openNew}><Plus size={16} className="mr-1" /> Kiểm kho</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr className="text-slate-500 text-xs">
                  <th className="text-left px-4 py-3 font-medium">Mã kiểm kho</th>
                  <th className="text-left px-4 py-3 font-medium">Thời gian tạo</th>
                  <th className="text-left px-4 py-3 font-medium">Ngày cân bằng</th>
                  <th className="text-left px-4 py-3 font-medium">Ghi chú</th>
                  <th className="text-center px-4 py-3 font-medium">Trạng thái</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {takes.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-12 text-slate-400"><ClipboardList size={40} className="mx-auto mb-2 opacity-30" />Chưa có phiếu kiểm kho</td></tr>
                ) : takes.map((t: any) => (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono font-medium text-blue-600">{t.code}</td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{formatDateTime(t.created_at)}</td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{t.balanced_at ? formatDateTime(t.balanced_at) : '—'}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{t.note || '—'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS[t.status as keyof typeof STATUS]?.color}`}>
                        {STATUS[t.status as keyof typeof STATUS]?.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {t.status === 'phieu_tam' && (
                        <Button size="sm" variant="outline" onClick={() => handleBalance(t.id)} disabled={loading} className="text-xs h-7">
                          <CheckCircle size={12} className="mr-1" /> Cân bằng kho
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Phiếu kiểm kho</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 mt-2">
            {diffItems.length > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg px-4 py-2 text-sm text-orange-700">
                ⚠️ <strong>{diffItems.length} sản phẩm</strong> có chênh lệch (tổng: {totalDiff > 0 ? '+' : ''}{totalDiff})
              </div>
            )}

            <div className="border rounded-lg overflow-hidden max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 sticky top-0">
                  <tr className="text-xs text-slate-500">
                    <th className="text-left px-3 py-2 font-medium">Hàng hóa</th>
                    <th className="text-center px-3 py-2 font-medium">Tồn hệ thống</th>
                    <th className="text-center px-3 py-2 font-medium">Tồn thực tế</th>
                    <th className="text-center px-3 py-2 font-medium">Chênh lệch</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {items.map((item, idx) => {
                    const diff = Number(item.actual_quantity) - item.system_quantity
                    return (
                      <tr key={item.product_id} className={diff !== 0 ? 'bg-orange-50' : ''}>
                        <td className="px-3 py-2">
                          <p className="font-mono text-xs text-slate-400">{item.code}</p>
                          <p className="text-slate-800">{item.name}</p>
                        </td>
                        <td className="px-3 py-2 text-center font-medium">{item.system_quantity}</td>
                        <td className="px-3 py-2 text-center">
                          <Input type="number" min="0" value={item.actual_quantity}
                            onChange={e => setItems(prev => prev.map((x, i) => i === idx ? { ...x, actual_quantity: e.target.value } : x))}
                            className="w-20 mx-auto text-center h-7 text-sm" />
                        </td>
                        <td className={`px-3 py-2 text-center font-bold ${diff > 0 ? 'text-green-600' : diff < 0 ? 'text-red-600' : 'text-slate-400'}`}>
                          {diff > 0 ? '+' : ''}{diff}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Ghi chú</label>
              <Input value={note} onChange={e => setNote(e.target.value)} placeholder="Ghi chú kiểm kho..." />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Huỷ</Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 size={14} className="animate-spin mr-1" />}
                Lưu phiếu kiểm kho
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
