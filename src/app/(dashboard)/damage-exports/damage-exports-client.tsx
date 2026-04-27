'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, AlertTriangle, Loader2, Trash2, Search } from 'lucide-react'
import { formatVND, formatDateTime } from '@/lib/format'
import { createClient } from '@/lib/supabase/client'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { useRouter } from 'next/navigation'

const STATUS = {
  phieu_tam: { label: 'Phiếu tạm', color: 'bg-yellow-100 text-yellow-700' },
  hoan_thanh: { label: 'Hoàn thành', color: 'bg-green-100 text-green-700' },
  da_huy: { label: 'Đã hủy', color: 'bg-red-100 text-red-700' },
}

export function DamageExportsClient({ initialExports, products }: any) {
  const [exports_, setExports] = useState(initialExports)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [cart, setCart] = useState<any[]>([])
  const [productSearch, setProductSearch] = useState('')
  const [note, setNote] = useState('')
  const [status, setStatus] = useState('hoan_thanh')
  const supabase = createClient()
  const router = useRouter()

  const filteredProducts = products.filter((p: any) =>
    p.name.toLowerCase().includes(productSearch.toLowerCase()) || p.code.toLowerCase().includes(productSearch.toLowerCase())
  )

  function addProduct(p: any) {
    setCart(prev => {
      if (prev.find(i => i.product_id === p.id)) return prev
      return [...prev, { product_id: p.id, name: p.name, code: p.code, quantity: 1, cost_price: p.cost_price }]
    })
    setProductSearch('')
  }

  const totalValue = cart.reduce((s, i) => s + i.quantity * i.cost_price, 0)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (cart.length === 0) return
    setLoading(true)
    const code = 'XH' + Date.now().toString().slice(-8)

    const { data: exp } = await supabase.from('damage_exports').insert({
      code, status, total_value: totalValue, note: note || null,
    }).select().single()

    if (!exp) { setLoading(false); return }

    await supabase.from('damage_export_items').insert(
      cart.map(i => ({ damage_export_id: exp.id, product_id: i.product_id, quantity: i.quantity, cost_price: i.cost_price, total: i.quantity * i.cost_price }))
    )

    if (status === 'hoan_thanh') {
      for (const item of cart) {
        await supabase.from('stock_transactions').insert({
          product_id: item.product_id, type: 'xuat', quantity: item.quantity, price: item.cost_price, note: `Xuất hủy ${code}`,
        })
      }
    }

    setExports((prev: any) => [exp, ...prev])
    setDialogOpen(false)
    setCart([])
    setNote('')
    setLoading(false)
    router.refresh()
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Xuất hủy</h1>
          <p className="text-slate-500 text-sm mt-0.5">{exports_.length} phiếu xuất hủy</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}><Plus size={16} className="mr-1" /> Xuất hủy</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr className="text-slate-500 text-xs">
                  <th className="text-left px-4 py-3 font-medium">Mã xuất hủy</th>
                  <th className="text-left px-4 py-3 font-medium">Thời gian</th>
                  <th className="text-right px-4 py-3 font-medium">Tổng giá trị hủy</th>
                  <th className="text-left px-4 py-3 font-medium">Ghi chú</th>
                  <th className="text-center px-4 py-3 font-medium">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {exports_.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-12 text-slate-400"><AlertTriangle size={40} className="mx-auto mb-2 opacity-30" />Chưa có phiếu xuất hủy</td></tr>
                ) : exports_.map((e: any) => (
                  <tr key={e.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono font-medium text-blue-600">{e.code}</td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{formatDateTime(e.created_at)}</td>
                    <td className="px-4 py-3 text-right font-medium text-red-600">{formatVND(e.total_value)}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{e.note || '—'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS[e.status as keyof typeof STATUS]?.color}`}>
                        {STATUS[e.status as keyof typeof STATUS]?.label}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Tạo phiếu xuất hủy</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Trạng thái</Label>
                <select value={status} onChange={e => setStatus(e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm bg-white">
                  <option value="hoan_thanh">Hoàn thành</option>
                  <option value="phieu_tam">Phiếu tạm</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Ghi chú</Label>
                <Input value={note} onChange={e => setNote(e.target.value)} placeholder="Lý do xuất hủy..." />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Hàng hóa xuất hủy</Label>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input placeholder="Tìm hàng hóa..." value={productSearch} onChange={e => setProductSearch(e.target.value)} className="pl-8" />
                {productSearch && (
                  <div className="absolute top-full left-0 right-0 bg-white border rounded-lg shadow-lg z-10 max-h-40 overflow-y-auto">
                    {filteredProducts.slice(0, 8).map((p: any) => (
                      <button key={p.id} type="button" onClick={() => addProduct(p)} className="w-full text-left px-3 py-2 hover:bg-slate-50 text-sm flex justify-between">
                        <span>{p.code} - {p.name}</span>
                        <span className="text-slate-400">{formatVND(p.cost_price)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {cart.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50"><tr className="text-xs text-slate-500">
                    <th className="text-left px-3 py-2 font-medium">Hàng hóa</th>
                    <th className="text-center px-3 py-2 font-medium">SL</th>
                    <th className="text-right px-3 py-2 font-medium">Giá vốn</th>
                    <th className="text-right px-3 py-2 font-medium">Thành tiền</th>
                    <th className="px-2 w-8"></th>
                  </tr></thead>
                  <tbody className="divide-y">
                    {cart.map((i, idx) => (
                      <tr key={i.product_id}>
                        <td className="px-3 py-2 text-slate-800">{i.name}</td>
                        <td className="px-3 py-2 text-center">
                          <Input type="number" min="1" value={i.quantity}
                            onChange={e => setCart(prev => prev.map((x, j) => j === idx ? { ...x, quantity: Number(e.target.value) } : x))}
                            className="w-16 mx-auto text-center h-7 text-sm" />
                        </td>
                        <td className="px-3 py-2 text-right text-slate-500">{formatVND(i.cost_price)}</td>
                        <td className="px-3 py-2 text-right font-medium">{formatVND(i.quantity * i.cost_price)}</td>
                        <td className="px-2 py-2"><button type="button" onClick={() => setCart(prev => prev.filter((_, j) => j !== idx))} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button></td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 border-t"><tr>
                    <td colSpan={3} className="px-3 py-2 text-right font-medium text-sm">Tổng giá trị hủy:</td>
                    <td className="px-3 py-2 text-right font-bold text-red-600">{formatVND(totalValue)}</td>
                    <td></td>
                  </tr></tfoot>
                </table>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Huỷ</Button>
              <Button type="submit" disabled={loading || cart.length === 0}>
                {loading && <Loader2 size={14} className="animate-spin mr-1" />}Xác nhận xuất hủy
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
