'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { Product, ProductCategory } from '@/lib/types'
import { Loader2 } from 'lucide-react'

const CATEGORIES: { value: ProductCategory; label: string }[] = [
  { value: 'may_lanh', label: 'Máy lạnh' },
  { value: 'tu_lanh', label: 'Tủ lạnh' },
  { value: 'may_giat', label: 'Máy giặt' },
  { value: 'may_nuoc_nong', label: 'Máy nước nóng' },
  { value: 'quat', label: 'Quạt' },
  { value: 'khac', label: 'Khác' },
]

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  product: Product | null
  onSaved: (p: Product) => void
}

export function ProductDialog({ open, onOpenChange, product, onSaved }: Props) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    code: '',
    name: '',
    category: 'may_lanh' as ProductCategory,
    brand: '',
    model: '',
    description: '',
    cost_price: '',
    sell_price: '',
    min_stock: '2',
    unit: 'cái',
    warranty_months: '12',
  })

  useEffect(() => {
    if (product) {
      setForm({
        code: product.code,
        name: product.name,
        category: product.category,
        brand: product.brand,
        model: product.model,
        description: product.description || '',
        cost_price: String(product.cost_price),
        sell_price: String(product.sell_price),
        min_stock: String(product.min_stock),
        unit: product.unit,
        warranty_months: String(product.warranty_months),
      })
    } else {
      setForm({
        code: '',
        name: '',
        category: 'may_lanh',
        brand: '',
        model: '',
        description: '',
        cost_price: '',
        sell_price: '',
        min_stock: '2',
        unit: 'cái',
        warranty_months: '12',
      })
    }
  }, [product, open])

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const payload = {
      code: form.code.trim(),
      name: form.name.trim(),
      category: form.category,
      brand: form.brand.trim(),
      model: form.model.trim(),
      description: form.description.trim() || null,
      cost_price: Number(form.cost_price) || 0,
      sell_price: Number(form.sell_price) || 0,
      min_stock: Number(form.min_stock) || 0,
      unit: form.unit.trim(),
      warranty_months: Number(form.warranty_months) || 12,
    }

    if (product) {
      const { data, error } = await supabase
        .from('products')
        .update(payload)
        .eq('id', product.id)
        .select()
        .single()
      if (!error && data) onSaved(data as Product)
    } else {
      const { data, error } = await supabase
        .from('products')
        .insert({ ...payload, stock_quantity: 0 })
        .select()
        .single()
      if (!error && data) onSaved(data as Product)
    }

    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{product ? 'Sửa sản phẩm' : 'Thêm sản phẩm mới'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Mã sản phẩm *</Label>
              <Input value={form.code} onChange={e => set('code', e.target.value)} placeholder="SP001" required />
            </div>
            <div className="space-y-1.5">
              <Label>Danh mục *</Label>
              <select
                value={form.category}
                onChange={e => set('category', e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm bg-white"
                required
              >
                {CATEGORIES.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Tên sản phẩm *</Label>
            <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Máy lạnh Samsung 1HP" required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Hãng *</Label>
              <Input value={form.brand} onChange={e => set('brand', e.target.value)} placeholder="Samsung" required />
            </div>
            <div className="space-y-1.5">
              <Label>Model *</Label>
              <Input value={form.model} onChange={e => set('model', e.target.value)} placeholder="AR09TYHQ..." required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Giá nhập (đ) *</Label>
              <Input
                type="number"
                value={form.cost_price}
                onChange={e => set('cost_price', e.target.value)}
                placeholder="6500000"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Giá bán (đ) *</Label>
              <Input
                type="number"
                value={form.sell_price}
                onChange={e => set('sell_price', e.target.value)}
                placeholder="8500000"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Đơn vị</Label>
              <Input value={form.unit} onChange={e => set('unit', e.target.value)} placeholder="cái" />
            </div>
            <div className="space-y-1.5">
              <Label>Tồn kho tối thiểu</Label>
              <Input type="number" value={form.min_stock} onChange={e => set('min_stock', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Bảo hành (tháng)</Label>
              <Input type="number" value={form.warranty_months} onChange={e => set('warranty_months', e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Mô tả</Label>
            <textarea
              value={form.description}
              onChange={e => set('description', e.target.value)}
              rows={3}
              className="w-full border rounded-md px-3 py-2 text-sm resize-none"
              placeholder="Mô tả sản phẩm..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Huỷ
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 size={16} className="animate-spin mr-1" /> : null}
              {product ? 'Lưu thay đổi' : 'Thêm sản phẩm'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
