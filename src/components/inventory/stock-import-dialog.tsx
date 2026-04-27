'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  products: { id: string; code: string; name: string }[]
  suppliers: { id: string; name: string }[]
  onSaved: (tx: any) => void
}

export function StockImportDialog({ open, onOpenChange, products, suppliers, onSaved }: Props) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    product_id: '',
    type: 'nhap',
    quantity: '1',
    price: '',
    supplier_id: '',
    note: '',
  })

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const { data, error } = await supabase
      .from('stock_transactions')
      .insert({
        product_id: form.product_id,
        type: form.type,
        quantity: Number(form.quantity),
        price: Number(form.price) || 0,
        supplier_id: form.supplier_id || null,
        note: form.note || null,
      })
      .select('*, product:products(name, code), supplier:suppliers(name)')
      .single()

    if (!error && data) {
      onSaved(data)
      setForm({ product_id: '', type: 'nhap', quantity: '1', price: '', supplier_id: '', note: '' })
    }
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nhập / Xuất kho</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label>Sản phẩm *</Label>
            <select
              value={form.product_id}
              onChange={e => set('product_id', e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm bg-white"
              required
            >
              <option value="">-- Chọn sản phẩm --</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Loại giao dịch *</Label>
              <select
                value={form.type}
                onChange={e => set('type', e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm bg-white"
              >
                <option value="nhap">Nhập kho</option>
                <option value="xuat">Xuất kho</option>
                <option value="tra_hang">Trả hàng</option>
                <option value="dieu_chinh">Điều chỉnh</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Số lượng *</Label>
              <Input
                type="number"
                min="1"
                value={form.quantity}
                onChange={e => set('quantity', e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Đơn giá (đ)</Label>
              <Input
                type="number"
                value={form.price}
                onChange={e => set('price', e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Nhà cung cấp</Label>
              <select
                value={form.supplier_id}
                onChange={e => set('supplier_id', e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm bg-white"
              >
                <option value="">-- Không chọn --</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Ghi chú</Label>
            <Input
              value={form.note}
              onChange={e => set('note', e.target.value)}
              placeholder="Ghi chú..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Huỷ</Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 size={14} className="animate-spin mr-1" />}
              Xác nhận
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
