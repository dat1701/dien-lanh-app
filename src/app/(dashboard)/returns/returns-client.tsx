'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, Search, RotateCcw, Loader2, Trash2, Minus } from 'lucide-react'
import { formatVND, formatDateTime } from '@/lib/format'
import { createClient } from '@/lib/supabase/client'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { useRouter } from 'next/navigation'

const STATUS = { da_tra: { label: 'Đã trả', color: 'bg-green-100 text-green-700' }, da_huy: { label: 'Đã hủy', color: 'bg-red-100 text-red-700' } }

interface CartItem { product_id: string; name: string; quantity: number; sell_price: number }

export function ReturnsClient({ initialReturns, orders, products }: any) {
  const [returns_, setReturns] = useState(initialReturns)
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [cart, setCart] = useState<CartItem[]>([])
  const [productSearch, setProductSearch] = useState('')
  const [orderSearch, setOrderSearch] = useState('')
  const [form, setForm] = useState({ order_id: '', customer_name: '', customer_phone: '', note: '' })
  const supabase = createClient()
  const router = useRouter()

  const filtered = returns_.filter((r: any) =>
    r.code.toLowerCase().includes(search.toLowerCase()) ||
    (r.customer_name || '').toLowerCase().includes(search.toLowerCase())
  )

  const filteredOrders = orders.filter((o: any) =>
    o.code.toLowerCase().includes(orderSearch.toLowerCase()) ||
    (o.customer_name || '').toLowerCase().includes(orderSearch.toLowerCase())
  )

  const filteredProducts = products.filter((p: any) =>
    p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.code.toLowerCase().includes(productSearch.toLowerCase())
  )

  function selectOrder(o: any) {
    setForm(prev => ({ ...prev, order_id: o.id, customer_name: o.customer_name || '', customer_phone: o.customer_phone || '' }))
    setOrderSearch(o.code)
  }

  function addProduct(p: any) {
    setCart(prev => {
      const ex = prev.find(i => i.product_id === p.id)
      if (ex) return prev.map(i => i.product_id === p.id ? { ...i, quantity: i.quantity + 1 } : i)
      return [...prev, { product_id: p.id, name: p.name, quantity: 1, sell_price: p.sell_price }]
    })
    setProductSearch('')
  }

  const total = cart.reduce((s, i) => s + i.quantity * i.sell_price, 0)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (cart.length === 0) return
    setLoading(true)

    const code = 'TH' + Date.now().toString().slice(-8)
    const order = orders.find((o: any) => o.id === form.order_id)

    const { data: ret, error } = await supabase.from('return_orders').insert({
      code,
      order_id: form.order_id || null,
      order_code: order?.code || null,
      customer_name: form.customer_name || 'Khách lẻ',
      customer_phone: form.customer_phone || '',
      status: 'da_tra',
      subtotal: total,
      refund_amount: total,
      note: form.note || null,
    }).select('*, customer:customers(name,phone)').single()

    if (error || !ret) { setLoading(false); return }

    await supabase.from('return_order_items').insert(
      cart.map(i => ({ return_order_id: ret.id, product_id: i.product_id, quantity: i.quantity, sell_price: i.sell_price, total: i.quantity * i.sell_price }))
    )

    for (const item of cart) {
      await supabase.from('stock_transactions').insert({
        product_id: item.product_id, type: 'tra_hang', quantity: item.quantity, price: item.sell_price,
        order_id: form.order_id || null, note: `Trả hàng ${code}`,
      })
    }

    setReturns((prev: any) => [ret, ...prev])
    setDialogOpen(false)
    setCart([])
    setForm({ order_id: '', customer_name: '', customer_phone: '', note: '' })
    setOrderSearch('')
    setLoading(false)
    router.refresh()
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Trả hàng</h1>
          <p className="text-slate-500 text-sm mt-0.5">{returns_.length} phiếu trả hàng</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}><Plus size={16} className="mr-1" /> Trả hàng</Button>
      </div>

      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <Input placeholder="Tìm mã phiếu, khách hàng..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr className="text-slate-500 text-xs">
                  <th className="text-left px-4 py-3 font-medium">Mã trả hàng</th>
                  <th className="text-left px-4 py-3 font-medium">Mã hóa đơn gốc</th>
                  <th className="text-left px-4 py-3 font-medium">Khách hàng</th>
                  <th className="text-left px-4 py-3 font-medium">Thời gian</th>
                  <th className="text-right px-4 py-3 font-medium">Cần trả KH</th>
                  <th className="text-center px-4 py-3 font-medium">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-12 text-slate-400"><RotateCcw size={40} className="mx-auto mb-2 opacity-30" />Chưa có phiếu trả hàng</td></tr>
                ) : filtered.map((r: any) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono font-medium text-blue-600">{r.code}</td>
                    <td className="px-4 py-3 font-mono text-slate-500 text-xs">{r.order_code || '—'}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{r.customer_name || 'Khách lẻ'}</p>
                      <p className="text-xs text-slate-400">{r.customer_phone}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{formatDateTime(r.created_at)}</td>
                    <td className="px-4 py-3 text-right font-medium text-green-600">{formatVND(r.refund_amount)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS[r.status as keyof typeof STATUS]?.color}`}>
                        {STATUS[r.status as keyof typeof STATUS]?.label}
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
          <DialogHeader><DialogTitle>Tạo phiếu trả hàng</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Hóa đơn gốc (nếu có)</Label>
              <div className="relative">
                <Input placeholder="Tìm mã hóa đơn..." value={orderSearch} onChange={e => { setOrderSearch(e.target.value); setForm(p => ({ ...p, order_id: '' })) }} />
                {orderSearch && !form.order_id && (
                  <div className="absolute top-full left-0 right-0 bg-white border rounded-lg shadow-lg z-10 max-h-40 overflow-y-auto">
                    {filteredOrders.slice(0, 8).map((o: any) => (
                      <button key={o.id} type="button" onClick={() => selectOrder(o)} className="w-full text-left px-3 py-2 hover:bg-slate-50 text-sm flex justify-between">
                        <span className="font-mono">{o.code}</span>
                        <span className="text-slate-400">{o.customer_name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Tên khách hàng</Label>
                <Input value={form.customer_name} onChange={e => setForm(p => ({ ...p, customer_name: e.target.value }))} placeholder="Khách lẻ" />
              </div>
              <div className="space-y-1.5">
                <Label>Điện thoại</Label>
                <Input value={form.customer_phone} onChange={e => setForm(p => ({ ...p, customer_phone: e.target.value }))} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Hàng hóa trả</Label>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input placeholder="Tìm hàng hóa..." value={productSearch} onChange={e => setProductSearch(e.target.value)} className="pl-8" />
                {productSearch && (
                  <div className="absolute top-full left-0 right-0 bg-white border rounded-lg shadow-lg z-10 max-h-40 overflow-y-auto">
                    {filteredProducts.slice(0, 8).map((p: any) => (
                      <button key={p.id} type="button" onClick={() => addProduct(p)} className="w-full text-left px-3 py-2 hover:bg-slate-50 text-sm flex justify-between">
                        <span>{p.code} - {p.name}</span>
                        <span className="text-slate-400">{formatVND(p.sell_price)}</span>
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
                    <th className="text-right px-3 py-2 font-medium">Đơn giá</th>
                    <th className="text-right px-3 py-2 font-medium">Thành tiền</th>
                    <th className="px-2 w-8"></th>
                  </tr></thead>
                  <tbody className="divide-y">
                    {cart.map(i => (
                      <tr key={i.product_id}>
                        <td className="px-3 py-2 text-slate-800">{i.name}</td>
                        <td className="px-3 py-2">
                          <div className="flex items-center border rounded overflow-hidden w-20 mx-auto">
                            <button type="button" className="px-1.5 py-1 hover:bg-slate-100" onClick={() => setCart(prev => prev.map(x => x.product_id === i.product_id ? { ...x, quantity: Math.max(1, x.quantity - 1) } : x))}><Minus size={10} /></button>
                            <span className="w-8 text-center text-xs">{i.quantity}</span>
                            <button type="button" className="px-1.5 py-1 hover:bg-slate-100" onClick={() => setCart(prev => prev.map(x => x.product_id === i.product_id ? { ...x, quantity: x.quantity + 1 } : x))}><Plus size={10} /></button>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right">{formatVND(i.sell_price)}</td>
                        <td className="px-3 py-2 text-right font-medium">{formatVND(i.quantity * i.sell_price)}</td>
                        <td className="px-2 py-2"><button type="button" onClick={() => setCart(prev => prev.filter(x => x.product_id !== i.product_id))} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button></td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 border-t"><tr>
                    <td colSpan={3} className="px-3 py-2 text-right font-medium text-sm">Cần trả khách:</td>
                    <td className="px-3 py-2 text-right font-bold text-green-600">{formatVND(total)}</td>
                    <td></td>
                  </tr></tfoot>
                </table>
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Ghi chú</Label>
              <Input value={form.note} onChange={e => setForm(p => ({ ...p, note: e.target.value }))} />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Huỷ</Button>
              <Button type="submit" disabled={loading || cart.length === 0}>
                {loading && <Loader2 size={14} className="animate-spin mr-1" />}
                Xác nhận trả hàng
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
