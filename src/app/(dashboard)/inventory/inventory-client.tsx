'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, Search, ArrowDownCircle, ArrowUpCircle, Warehouse } from 'lucide-react'
import { formatVND, formatDateTime } from '@/lib/format'
import { StockImportDialog } from '@/components/inventory/stock-import-dialog'

const TYPE_LABELS: Record<string, string> = {
  nhap: 'Nhập kho',
  xuat: 'Xuất kho',
  tra_hang: 'Trả hàng',
  dieu_chinh: 'Điều chỉnh',
}

const TYPE_COLORS: Record<string, string> = {
  nhap: 'text-green-600 bg-green-50',
  xuat: 'text-red-600 bg-red-50',
  tra_hang: 'text-orange-600 bg-orange-50',
  dieu_chinh: 'text-blue-600 bg-blue-50',
}

interface Props {
  initialTransactions: any[]
  products: { id: string; code: string; name: string; stock_quantity: number; min_stock: number }[]
  suppliers: { id: string; name: string }[]
}

export function InventoryClient({ initialTransactions, products, suppliers }: Props) {
  const [transactions, setTransactions] = useState(initialTransactions)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [importOpen, setImportOpen] = useState(false)

  const filtered = transactions.filter(t => {
    const matchSearch =
      t.product?.name?.toLowerCase().includes(search.toLowerCase()) ||
      t.product?.code?.toLowerCase().includes(search.toLowerCase())
    const matchType = typeFilter === 'all' || t.type === typeFilter
    return matchSearch && matchType
  })

  function handleSaved(tx: any) {
    setTransactions(prev => [tx, ...prev])
    setImportOpen(false)
  }

  // Chỉ cảnh báo sản phẩm có tồn kho > 0 nhưng dưới mức tối thiểu (min_stock > 0)
  const stockSummary = products.filter(p => p.min_stock > 0 && p.stock_quantity <= p.min_stock && p.stock_quantity >= 0)
  const outOfStock = products.filter(p => p.stock_quantity === 0 && p.min_stock > 0)
  // 4 sản phẩm có tồn kho > 0, sắp xếp theo tồn kho thấp nhất
  const topLowStock = products.filter(p => p.stock_quantity > 0).sort((a, b) => a.stock_quantity - b.stock_quantity).slice(0, 4)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Kho hàng</h1>
          <p className="text-slate-500 text-sm mt-0.5">Quản lý nhập xuất kho</p>
        </div>
        <Button onClick={() => setImportOpen(true)}>
          <Plus size={16} className="mr-1" /> Nhập kho
        </Button>
      </div>

      {/* Tổng quan tồn kho */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-slate-400">Tổng sản phẩm</p>
            <p className="text-2xl font-bold text-slate-800 mt-0.5">{products.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-slate-400">Còn hàng</p>
            <p className="text-2xl font-bold text-green-600 mt-0.5">{products.filter(p => p.stock_quantity > 0).length}</p>
          </CardContent>
        </Card>
        <Card className="border-orange-200">
          <CardContent className="p-4">
            <p className="text-xs text-slate-400">Sắp hết hàng</p>
            <p className="text-2xl font-bold text-orange-500 mt-0.5">{stockSummary.length}</p>
          </CardContent>
        </Card>
        <Card className="border-red-200">
          <CardContent className="p-4">
            <p className="text-xs text-slate-400">Hết hàng</p>
            <p className="text-2xl font-bold text-red-600 mt-0.5">{products.filter(p => p.stock_quantity === 0).length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Cảnh báo sắp hết hàng — chỉ hiện khi có sản phẩm thực sự sắp hết */}
      {stockSummary.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg px-4 py-3 text-sm text-orange-700">
          ⚠️ <strong>{stockSummary.length} sản phẩm</strong> sắp hết hàng:{' '}
          {stockSummary.slice(0, 5).map(p => p.name).join(', ')}
          {stockSummary.length > 5 && ` và ${stockSummary.length - 5} sản phẩm khác...`}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Tìm theo sản phẩm..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          {['all', 'nhap', 'xuat', 'tra_hang', 'dieu_chinh'].map(type => (
            <button
              key={type}
              onClick={() => setTypeFilter(type)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                typeFilter === type ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border hover:bg-slate-50'
              }`}
            >
              {type === 'all' ? 'Tất cả' : TYPE_LABELS[type]}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr className="text-slate-500 text-xs">
                  <th className="text-left px-4 py-3 font-medium">Sản phẩm</th>
                  <th className="text-center px-4 py-3 font-medium">Loại</th>
                  <th className="text-center px-4 py-3 font-medium">Số lượng</th>
                  <th className="text-right px-4 py-3 font-medium">Đơn giá</th>
                  <th className="text-left px-4 py-3 font-medium">Nhà cung cấp</th>
                  <th className="text-left px-4 py-3 font-medium">Ghi chú</th>
                  <th className="text-left px-4 py-3 font-medium">Thời gian</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-400">
                      <Warehouse size={40} className="mx-auto mb-2 opacity-30" />
                      Không có giao dịch nào
                    </td>
                  </tr>
                ) : (
                  filtered.map(t => (
                    <tr key={t.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <p className="font-mono text-xs text-slate-400">{t.product?.code}</p>
                        <p className="font-medium text-slate-800">{t.product?.name}</p>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLORS[t.type]}`}>
                          {TYPE_LABELS[t.type]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`font-bold ${t.type === 'nhap' || t.type === 'tra_hang' ? 'text-green-600' : 'text-red-600'}`}>
                          {t.type === 'nhap' || t.type === 'tra_hang' ? '+' : '-'}{t.quantity}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">{t.price ? formatVND(t.price) : '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{t.supplier?.name || '—'}</td>
                      <td className="px-4 py-3 text-slate-400 text-xs">{t.note || '—'}</td>
                      <td className="px-4 py-3 text-slate-400 text-xs">{formatDateTime(t.created_at)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <StockImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        products={products}
        suppliers={suppliers}
        onSaved={handleSaved}
      />
    </div>
  )
}
