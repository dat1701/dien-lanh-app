'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, Search, Trash2, ArrowLeftRight, Loader2, X, Minus } from 'lucide-react'
import { formatVND, formatDateTime } from '@/lib/format'
import { createClient } from '@/lib/supabase/client'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { useRouter } from 'next/navigation'

const STATUS_LABELS: Record<string, string> = { phieu_tam: 'Phiếu tạm', da_nhap: 'Đã nhập hàng', da_huy: 'Đã hủy' }
const STATUS_COLORS: Record<string, string> = {
  phieu_tam: 'bg-yellow-100 text-yellow-700',
  da_nhap: 'bg-green-100 text-green-700',
  da_huy: 'bg-red-100 text-red-700',
}

interface CartItem { product_id: string; name: string; code: string; quantity: number; cost_price: number; discount: number }

export function PurchaseOrdersClient({ initialOrders, suppliers, products }: any) {
  const [orders, setOrders] = useState(initialOrders)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [productSearch, setProductSearch] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [form, setForm] = useState({ supplier_id: '', paid: '', note: '', status: 'da_nhap' })
  const supabase = createClient()
  const router = useRouter()

  const filtered = orders.filter((o: any) => {
    const matchSearch = o.code.toLowerCase().includes(search.toLowerCase()) ||
      (o.supplier?.name || '').toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || o.status === statusFilter
    return matchSearch && matchStatus
  })

  const filteredProducts = products.filter((p: any) =>
    p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.code.toLowerCase().includes(productSearch.toLowerCase())
  )

  function addProduct(p: any) {
    setCart(prev => {
      const ex = prev.find(i => i.product_id === p.id)
      if (ex) return prev.map(i => i.product_id === p.id ? { ...i, quantity: i.quantity + 1 } : i)
      return [...prev, { product_id: p.id, name: p.name, code: p.code, quantity: 1, cost_price: p.cost_price, discount: 0 }]
    })
    setProductSearch('')
  }

  function updateCart(product_id: string, field: string, value: any) {
    setCart(prev => prev.map(i => i.product_id === product_id ? { ...i, [field]: value } : i))
  }

  const subtotal = cart.reduce((s, i) => s + i.quantity * i.cost_price - i.discount, 0)
  const total = subtotal
  const paid = Number(form.paid) || 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (cart.length === 0) return
    setLoading(true)

    const code = 'NH' + Date.now().toString().slice(-8)
    const supplier = suppliers.find((s: any) => s.id === form.supplier_id)

    const { data: po, error } = await supabase.from('purchase_orders').insert({
      code,
      supplier_id: form.supplier_id || null,
      supplier_name: supplier?.name || null,
      status: form.status,
      total_items: cart.reduce((s, i) => s + i.quantity, 0),
      subtotal,
      discount: 0,
      total,
      paid,
      debt: Math.max(0, total - paid),
      note: form.note || null,
    }).select('*, supplier:suppliers(name)').single()

    if (error || !po) { setLoading(false); return }

    await supabase.from('purchase_order_items').insert(
      cart.map(i => ({
        purchase_order_id: po.id,
        product_id: i.product_id,
        quantity: i.quantity,
        cost_price: i.cost_price,
        discount: i.discount,
        total: i.quantity * i.cost_price - i.discount,
      }))
    )

    if (form.status === 'da_nhap') {
      for (const item of cart) {
        await supabase.from('stock_transactions').insert({
          product_id: item.product_id,
          type: 'nhap',
          quantity: item.quantity,
          price: item.cost_price,
          supplier_id: form.supplier_id || null,
          note: `Nhập hàng ${code}`,
        })
      }
    }

    setOrders((prev: any) => [po, ...prev])
    setDialogOpen(false)
    setCart([])
    setForm({ supplier_id: '', paid: '', note: '', status: 'da_nhap' })
    setLoading(false)
    router.refresh()
  }

  async function handleCancel(id: string) {
    if (!confirm('Hủy phiếu nhập hàng này?')) return
    await supabase.from('purchase_orders').update({ status: 'da_huy' }).eq('id', id)
    setOrders((prev: any) => prev.map((o: any) => o.id === id ? { ...o, status: 'da_huy' } : o))
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Nhập hàng</h1>
          <p className="text-slate-500 text-sm mt-0.5">{orders.length} phiếu nhập</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}><Plus size={16} className="mr-1" /> Nhập hàng</Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input placeholder="Tìm mã phiếu, nhà cung cấp..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-2">
          {['all', 'phieu_tam', 'da_nhap', 'da_huy'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${statusFilter === s ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border hover:bg-slate-50'}`}>
              {s === 'all' ? 'Tất cả' : STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr className="text-slate-500 text-xs">
                  <th className="text-left px-4 py-3 font-medium">Mã phiếu</th>
                  <th className="text-left px-4 py-3 font-medium">Nhà cung cấp</th>
                  <th className="text-left px-4 py-3 font-medium">Thời gian</th>
                  <th className="text-right px-4 py-3 font-medium">Tổng tiền</th>
                  <th className="text-right px-4 py-3 font-medium">Cần trả NCC</th>
                  <th className="text-center px-4 py-3 font-medium">Trạng thái</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-12 text-slate-400"><ArrowLeftRight size={40} className="mx-auto mb-2 opacity-30" />Chưa có phiếu nhập hàng</td></tr>
                ) : filtered.map((o: any) => (
                  <tr key={o.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono font-medium text-blue-600">{o.code}</td>
                    <td className="px-4 py-3 text-slate-700">{o.supplier?.name || o.supplier_name || '—'}</td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{formatDateTime(o.created_at)}</td>
                    <td className="px-4 py-3 text-right font-medium">{formatVND(o.total)}</td>
                    <td className="px-4 py-3 text-right">
                      {o.debt > 0 ? <span className="text-red-600 font-medium">{formatVND(o.debt)}</span> : <span className="text-green-600 text-xs">Đã TT</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[o.status]}`}>{STATUS_LABELS[o.status]}</span>
                    </td>
                    <td className="px-4 py-3">
                      {o.status === 'phieu_tam' && (
                        <button onClick={() => handleCancel(o.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded">
                          <X size={15} />
                        </button>
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
          <DialogHeader><DialogTitle>Tạo phiếu nhập hàng</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Nhà cung cấp</Label>
                <select value={form.supplier_id} onChange={e => setForm(p => ({ ...p, supplier_id: e.target.value }))}
                  className="w-full border rounded-md px-3 py-2 text-sm bg-white">
                  <option value="">-- Chọn NCC --</option>
                  {suppliers.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Trạng thái</Label>
                <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
                  className="w-full border rounded-md px-3 py-2 text-sm bg-white">
                  <option value="da_nhap">Đã nhập hàng</option>
                  <option value="phieu_tam">Phiếu tạm</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Thêm hàng hóa</Label>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input placeholder="Tìm hàng hóa để thêm..." value={productSearch}
                  onChange={e => setProductSearch(e.target.value)} className="pl-8" />
                {productSearch && (
                  <div className="absolute top-full left-0 right-0 bg-white border rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                    {filteredProducts.slice(0, 10).map((p: any) => (
                      <button key={p.id} type="button" onClick={() => addProduct(p)}
                        className="w-full text-left px-3 py-2 hover:bg-slate-50 text-sm flex justify-between">
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
                  <thead className="bg-slate-50">
                    <tr className="text-xs text-slate-500">
                      <th className="text-left px-3 py-2 font-medium">Hàng hóa</th>
                      <th className="text-center px-3 py-2 font-medium w-24">SL</th>
                      <th className="text-right px-3 py-2 font-medium">Đơn giá</th>
                      <th className="text-right px-3 py-2 font-medium">Thành tiền</th>
                      <th className="px-2 py-2 w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {cart.map(item => (
                      <tr key={item.product_id}>
                        <td className="px-3 py-2">
                          <p className="font-mono text-xs text-slate-400">{item.code}</p>
                          <p className="text-slate-800">{item.name}</p>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center border rounded overflow-hidden w-20 mx-auto">
                            <button type="button" className="px-1.5 py-1 hover:bg-slate-100" onClick={() => updateCart(item.product_id, 'quantity', Math.max(1, item.quantity - 1))}><Minus size={10} /></button>
                            <input type="number" min="1" value={item.quantity}
                              onChange={e => updateCart(item.product_id, 'quantity', Number(e.target.value))}
                              className="w-8 text-center text-xs border-0 outline-none" />
                            <button type="button" className="px-1.5 py-1 hover:bg-slate-100" onClick={() => updateCart(item.product_id, 'quantity', item.quantity + 1)}><Plus size={10} /></button>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <input type="number" value={item.cost_price}
                            onChange={e => updateCart(item.product_id, 'cost_price', Number(e.target.value))}
                            className="w-28 text-right border rounded px-2 py-0.5 text-sm" />
                        </td>
                        <td className="px-3 py-2 text-right font-medium">{formatVND(item.quantity * item.cost_price)}</td>
                        <td className="px-2 py-2">
                          <button type="button" onClick={() => setCart(prev => prev.filter(i => i.product_id !== item.product_id))}
                            className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 border-t">
                    <tr>
                      <td colSpan={3} className="px-3 py-2 text-right font-medium text-sm">Tổng tiền hàng:</td>
                      <td className="px-3 py-2 text-right font-bold text-blue-600">{formatVND(subtotal)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Tiền đã trả NCC (đ)</Label>
                <Input type="number" value={form.paid} onChange={e => setForm(p => ({ ...p, paid: e.target.value }))} placeholder="0" />
              </div>
              <div className="space-y-1.5">
                <Label>Ghi chú</Label>
                <Input value={form.note} onChange={e => setForm(p => ({ ...p, note: e.target.value }))} />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Huỷ</Button>
              <Button type="submit" disabled={loading || cart.length === 0}>
                {loading && <Loader2 size={14} className="animate-spin mr-1" />}
                Tạo phiếu nhập
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
