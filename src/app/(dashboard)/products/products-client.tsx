'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import {
  Plus, Search, Edit, Trash2, Package, SlidersHorizontal,
  FileDown, FileUp, X, ChevronDown, ChevronUp, LayoutGrid, List
} from 'lucide-react'
import { formatVND, CATEGORY_LABELS } from '@/lib/format'
import { Product } from '@/lib/types'
import { ProductDialog } from '@/components/products/product-dialog'
import { createClient } from '@/lib/supabase/client'

const CATEGORIES = [
  { value: 'may_lanh', label: 'Máy lạnh' },
  { value: 'tu_lanh', label: 'Tủ lạnh' },
  { value: 'may_giat', label: 'Máy giặt' },
  { value: 'may_nuoc_nong', label: 'Máy nước nóng' },
  { value: 'quat', label: 'Quạt' },
  { value: 'khac', label: 'Khác' },
]

const STOCK_STATUS = [
  { value: 'all', label: 'Tất cả' },
  { value: 'in_stock', label: 'Còn hàng' },
  { value: 'low_stock', label: 'Sắp hết' },
  { value: 'out_of_stock', label: 'Hết hàng' },
]

export function ProductsClient({ initialProducts }: { initialProducts: Product[] }) {
  const [products, setProducts] = useState(initialProducts)
  const [search, setSearch] = useState('')
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [stockFilter, setStockFilter] = useState('all')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editProduct, setEditProduct] = useState<Product | null>(null)
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table')
  const supabase = createClient()

  const hasActiveFilter = selectedCategories.length > 0 || stockFilter !== 'all'

  function toggleCategory(cat: string) {
    setSelectedCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    )
  }

  function clearFilters() {
    setSelectedCategories([])
    setStockFilter('all')
  }

  const filtered = products.filter(p => {
    const matchSearch = !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.code.toLowerCase().includes(search.toLowerCase()) ||
      p.brand.toLowerCase().includes(search.toLowerCase())
    const matchCat = selectedCategories.length === 0 || selectedCategories.includes(p.category)
    const matchStock =
      stockFilter === 'all' ||
      (stockFilter === 'in_stock' && p.stock_quantity > p.min_stock) ||
      (stockFilter === 'low_stock' && p.stock_quantity > 0 && p.stock_quantity <= p.min_stock) ||
      (stockFilter === 'out_of_stock' && p.stock_quantity === 0)
    return matchSearch && matchCat && matchStock
  })

  async function handleDelete(id: string) {
    if (!confirm('Xác nhận xoá sản phẩm này?')) return
    await supabase.from('products').update({ is_active: false }).eq('id', id)
    setProducts(prev => prev.filter(p => p.id !== id))
  }

  function handleSaved(product: Product) {
    setProducts(prev => {
      const idx = prev.findIndex(p => p.id === product.id)
      if (idx >= 0) { const next = [...prev]; next[idx] = product; return next }
      return [product, ...prev]
    })
    setDialogOpen(false)
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Sản phẩm</h1>
          <p className="text-slate-500 text-sm mt-0.5">{products.length} sản phẩm</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="text-slate-600">
            <FileUp size={15} className="mr-1.5" /> Nhập file
          </Button>
          <Button variant="outline" size="sm" className="text-slate-600">
            <FileDown size={15} className="mr-1.5" /> Xuất file
          </Button>
          <Button size="sm" onClick={() => { setEditProduct(null); setDialogOpen(true) }}>
            <Plus size={15} className="mr-1" /> Thêm sản phẩm
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Tìm theo tên, mã, hãng..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filter toggle with dot indicator */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className={`relative flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${sidebarOpen ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
        >
          <SlidersHorizontal size={15} />
          Bộ lọc
          {hasActiveFilter && (
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full" />
          )}
        </button>

        {/* Active filter chips */}
        {hasActiveFilter && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {selectedCategories.map(cat => (
              <span key={cat} className="flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
                {CATEGORY_LABELS[cat] || cat}
                <button onClick={() => toggleCategory(cat)} className="hover:text-blue-900"><X size={10} /></button>
              </span>
            ))}
            {stockFilter !== 'all' && (
              <span className="flex items-center gap-1 px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded-full font-medium">
                {STOCK_STATUS.find(s => s.value === stockFilter)?.label}
                <button onClick={() => setStockFilter('all')} className="hover:text-orange-900"><X size={10} /></button>
              </span>
            )}
            <button onClick={clearFilters} className="text-xs text-slate-400 hover:text-red-500 ml-1">Xoá tất cả</button>
          </div>
        )}

        <div className="ml-auto flex items-center gap-1 border rounded-lg overflow-hidden">
          <button onClick={() => setViewMode('table')} className={`p-2 transition-colors ${viewMode === 'table' ? 'bg-slate-100 text-slate-700' : 'text-slate-400 hover:bg-slate-50'}`}><List size={15} /></button>
          <button onClick={() => setViewMode('grid')} className={`p-2 transition-colors ${viewMode === 'grid' ? 'bg-slate-100 text-slate-700' : 'text-slate-400 hover:bg-slate-50'}`}><LayoutGrid size={15} /></button>
        </div>
      </div>

      <div className="flex gap-4">
        {/* Filter Sidebar */}
        {sidebarOpen && (
          <aside className="w-52 flex-shrink-0 space-y-4">
            <Card>
              <CardContent className="p-4 space-y-4">
                {/* Danh mục */}
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Danh mục</p>
                  <div className="space-y-1.5">
                    {CATEGORIES.map(cat => (
                      <label key={cat.value} className="flex items-center gap-2 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={selectedCategories.includes(cat.value)}
                          onChange={() => toggleCategory(cat.value)}
                          className="rounded border-slate-300 text-blue-600 w-3.5 h-3.5"
                        />
                        <span className="text-sm text-slate-700 group-hover:text-slate-900">{cat.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Tình trạng kho */}
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Tình trạng kho</p>
                  <div className="space-y-1.5">
                    {STOCK_STATUS.map(s => (
                      <label key={s.value} className="flex items-center gap-2 cursor-pointer group">
                        <input
                          type="radio"
                          name="stock_status"
                          value={s.value}
                          checked={stockFilter === s.value}
                          onChange={() => setStockFilter(s.value)}
                          className="border-slate-300 text-blue-600 w-3.5 h-3.5"
                        />
                        <span className="text-sm text-slate-700 group-hover:text-slate-900">{s.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {hasActiveFilter && (
                  <button onClick={clearFilters} className="w-full text-xs text-red-500 hover:text-red-700 py-1 border border-dashed border-red-200 rounded-lg hover:bg-red-50 transition-colors">
                    Xoá bộ lọc
                  </button>
                )}
              </CardContent>
            </Card>
          </aside>
        )}

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {viewMode === 'table' ? (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b">
                      <tr className="text-slate-500 text-xs">
                        <th className="text-left px-4 py-3 font-medium">Mã / Sản phẩm</th>
                        <th className="text-left px-4 py-3 font-medium">Danh mục</th>
                        <th className="text-left px-4 py-3 font-medium">Hãng</th>
                        <th className="text-right px-4 py-3 font-medium">Giá nhập</th>
                        <th className="text-right px-4 py-3 font-medium">Giá bán</th>
                        <th className="text-center px-4 py-3 font-medium">Tồn kho</th>
                        <th className="text-center px-4 py-3 font-medium">BH</th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filtered.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="text-center py-16">
                            <Package size={36} className="mx-auto mb-2 text-slate-200" />
                            <p className="text-sm text-slate-400">Không tìm thấy sản phẩm</p>
                          </td>
                        </tr>
                      ) : filtered.map(p => (
                        <tr key={p.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3">
                            <p className="font-mono text-xs text-slate-400">{p.code}</p>
                            <p className="font-medium text-slate-800">{p.name}</p>
                            {p.model && <p className="text-xs text-slate-400">{p.model}</p>}
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">
                              {CATEGORY_LABELS[p.category] || p.category}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-700">{p.brand}</td>
                          <td className="px-4 py-3 text-right text-slate-600">{formatVND(p.cost_price)}</td>
                          <td className="px-4 py-3 text-right font-medium">{formatVND(p.sell_price)}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`font-bold ${p.stock_quantity === 0 ? 'text-red-600' : p.stock_quantity <= p.min_stock ? 'text-orange-500' : 'text-green-600'}`}>
                              {p.stock_quantity}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center text-slate-500 text-xs">{p.warranty_months}th</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <button onClick={() => { setEditProduct(p); setDialogOpen(true) }} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded">
                                <Edit size={14} />
                              </button>
                              <button onClick={() => handleDelete(p.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded">
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="px-4 py-2.5 border-t bg-slate-50 text-xs text-slate-500">
                  Hiển thị {filtered.length} / {products.length} sản phẩm
                </div>
              </CardContent>
            </Card>
          ) : (
            /* Grid view */
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {filtered.length === 0 ? (
                <div className="col-span-4 py-16 text-center">
                  <Package size={36} className="mx-auto mb-2 text-slate-200" />
                  <p className="text-sm text-slate-400">Không tìm thấy sản phẩm</p>
                </div>
              ) : filtered.map(p => (
                <Card key={p.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">{CATEGORY_LABELS[p.category] || p.category}</span>
                      <span className={`text-xs font-bold ${p.stock_quantity === 0 ? 'text-red-600' : p.stock_quantity <= p.min_stock ? 'text-orange-500' : 'text-green-600'}`}>
                        Tồn: {p.stock_quantity}
                      </span>
                    </div>
                    <p className="font-mono text-xs text-slate-400">{p.code}</p>
                    <p className="font-medium text-slate-800 mt-0.5 text-sm leading-tight">{p.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{p.brand}</p>
                    <div className="flex items-center justify-between mt-3">
                      <span className="font-bold text-blue-600">{formatVND(p.sell_price)}</span>
                      <div className="flex gap-1">
                        <button onClick={() => { setEditProduct(p); setDialogOpen(true) }} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded">
                          <Edit size={13} />
                        </button>
                        <button onClick={() => handleDelete(p.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      <ProductDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        product={editProduct}
        onSaved={handleSaved}
      />
    </div>
  )
}
