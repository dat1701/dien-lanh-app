'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import {
  ChevronDown, ChevronRight, Search, FileDown, Copy, RotateCcw,
  Printer, QrCode, Edit, ChevronLeft, ChevronRight as ChevronRightPage,
  Loader2, ExternalLink, X
} from 'lucide-react'
import { formatVND, formatDateTime, formatDate, STATUS_LABELS, STATUS_COLORS, PAYMENT_LABELS } from '@/lib/format'
import { createClient } from '@/lib/supabase/client'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'

const TABS = ['Thông tin']

interface OrderItem {
  id: string
  product_name: string
  product_code: string
  quantity: number
  sell_price: number
  discount: number
  serial_number?: string
}

interface Order {
  id: string
  code: string
  created_at: string
  status: string
  payment_method: string
  total: number
  paid: number
  debt: number
  discount: number
  note?: string
  customer_name?: string
  customer_phone?: string
  customer_id?: string
  customer?: { name: string; phone: string }
  order_items?: OrderItem[]
}

interface Props {
  initialOrders: Order[]
  total: number
  page: number
  totalPages: number
  pageSize: number
  initialSearch: string
  initialStatus: string
}

export function OrdersClient({ initialOrders, total, page, totalPages, pageSize, initialSearch, initialStatus }: Props) {
  const [orders, setOrders] = useState(initialOrders)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [expandedItems, setExpandedItems] = useState<Record<string, OrderItem[]>>({})
  const [loadingItems, setLoadingItems] = useState<Record<string, boolean>>({})
  const [activeTab, setActiveTab] = useState<Record<string, string>>({})
  const [search, setSearch] = useState(initialSearch)
  const [statusFilter, setStatusFilter] = useState(initialStatus)
  const [isPending, startTransition] = useTransition()
  const supabase = createClient()
  const router = useRouter()
  const pathname = usePathname()

  function navigate(newPage: number, q?: string, status?: string) {
    const params = new URLSearchParams()
    if (newPage > 1) params.set('page', String(newPage))
    const query = q !== undefined ? q : search
    const st = status !== undefined ? status : statusFilter
    if (query) params.set('q', query)
    if (st && st !== 'all') params.set('status', st)
    startTransition(() => {
      router.push(`${pathname}${params.toString() ? '?' + params.toString() : ''}`)
    })
  }

  async function toggleExpand(order: Order) {
    if (expandedId === order.id) {
      setExpandedId(null)
      return
    }
    setExpandedId(order.id)
    if (!activeTab[order.id]) setActiveTab(p => ({ ...p, [order.id]: 'Thông tin' }))
    if (!expandedItems[order.id]) {
      setLoadingItems(p => ({ ...p, [order.id]: true }))
      const { data } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', order.id)
      setExpandedItems(p => ({ ...p, [order.id]: data || [] }))
      setLoadingItems(p => ({ ...p, [order.id]: false }))
    }
  }

  async function cancelOrder(order: Order) {
    if (!confirm(`Hủy đơn hàng ${order.code}?`)) return
    const { data } = await supabase
      .from('orders')
      .update({ status: 'huy' })
      .eq('id', order.id)
      .select()
      .single()
    if (data) setOrders(prev => prev.map(o => o.id === data.id ? { ...o, status: 'huy' } : o))
  }

  const customerName = (o: Order) => o.customer?.name || o.customer_name || 'Khách lẻ'
  const customerPhone = (o: Order) => o.customer?.phone || o.customer_phone || ''

  const start = (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, total)

  const STATUS_FILTERS = [
    { value: 'all', label: 'Tất cả' },
    { value: 'cho_xu_ly', label: 'Chờ xử lý' },
    { value: 'dang_giao', label: 'Đang giao' },
    { value: 'hoan_thanh', label: 'Hoàn thành' },
    { value: 'huy', label: 'Huỷ' },
  ]

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Đơn hàng</h1>
          <p className="text-slate-500 text-sm mt-0.5">{total.toLocaleString('vi-VN')} đơn hàng</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="text-slate-600">
            <FileDown size={15} className="mr-1.5" /> Xuất file
          </Button>
          <Link href="/sales">
            <Button size="sm">+ Tạo đơn mới</Button>
          </Link>
        </div>
      </div>

      {/* Toolbar: search + status tabs */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={e => { e.preventDefault(); navigate(1, search) }} className="relative max-w-sm flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Tìm mã đơn, khách hàng..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </form>
        <div className="flex gap-1.5 flex-wrap">
          {STATUS_FILTERS.map(f => (
            <button key={f.value}
              onClick={() => { setStatusFilter(f.value); navigate(1, search, f.value) }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${statusFilter === f.value ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border hover:bg-slate-50'}`}>
              {f.label}
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
                  <th className="w-8 px-3 py-3"></th>
                  <th className="text-left px-4 py-3 font-medium">Mã đơn</th>
                  <th className="text-left px-4 py-3 font-medium">Khách hàng</th>
                  <th className="text-left px-4 py-3 font-medium">Thời gian</th>
                  <th className="text-center px-4 py-3 font-medium">Thanh toán</th>
                  <th className="text-right px-4 py-3 font-medium">Tổng tiền</th>
                  <th className="text-right px-4 py-3 font-medium">Còn nợ</th>
                  <th className="text-center px-4 py-3 font-medium">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {isPending ? (
                  <tr><td colSpan={8} className="text-center py-12"><Loader2 size={24} className="animate-spin mx-auto text-slate-300" /></td></tr>
                ) : orders.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-16 text-slate-400 text-sm">Không tìm thấy đơn hàng nào</td></tr>
                ) : orders.map(order => (
                  <>
                    {/* Main row */}
                    <tr
                      key={order.id}
                      onClick={() => toggleExpand(order)}
                      className={`border-b cursor-pointer transition-colors ${expandedId === order.id ? 'bg-blue-50/60' : 'hover:bg-slate-50'}`}
                    >
                      <td className="px-3 py-3 text-slate-400">
                        {expandedId === order.id
                          ? <ChevronDown size={16} />
                          : <ChevronRight size={16} />
                        }
                      </td>
                      <td className="px-4 py-3 font-mono font-medium text-blue-600">{order.code}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800">{customerName(order)}</p>
                        <p className="text-xs text-slate-400">{customerPhone(order)}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs">{formatDateTime(order.created_at)}</td>
                      <td className="px-4 py-3 text-center text-xs text-slate-600">{PAYMENT_LABELS[order.payment_method]}</td>
                      <td className="px-4 py-3 text-right font-medium">{formatVND(order.total)}</td>
                      <td className="px-4 py-3 text-right">
                        {order.debt > 0
                          ? <span className="text-red-600 font-medium">{formatVND(order.debt)}</span>
                          : <span className="text-green-600 text-xs">Đã TT</span>
                        }
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[order.status]}`}>
                          {STATUS_LABELS[order.status]}
                        </span>
                      </td>
                    </tr>

                    {/* Expanded detail panel */}
                    {expandedId === order.id && (
                      <tr key={`expand-${order.id}`} className="border-b bg-slate-50/80">
                        <td colSpan={8} className="p-0">
                          <div className="border-t-2 border-blue-400">
                            {/* Tab bar */}
                            <div className="flex border-b bg-white px-4">
                              {TABS.map(tab => (
                                <button key={tab}
                                  onClick={e => { e.stopPropagation(); setActiveTab(p => ({ ...p, [order.id]: tab })) }}
                                  className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${(activeTab[order.id] || 'Thông tin') === tab ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                                  {tab}
                                </button>
                              ))}
                            </div>

                            {/* Content */}
                            <div className="p-4 bg-white" onClick={e => e.stopPropagation()}>
                              {/* Hero info */}
                              <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-base">
                                    {customerName(order).charAt(0)}
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-semibold text-slate-900">{customerName(order)}</span>
                                      {order.customer_id && (
                                        <Link href={`/customers`} onClick={e => e.stopPropagation()}>
                                          <ExternalLink size={13} className="text-slate-400 hover:text-blue-500" />
                                        </Link>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2 mt-0.5">
                                      <span className="font-mono text-xs text-blue-600">{order.code}</span>
                                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[order.status]}`}>
                                        {STATUS_LABELS[order.status]}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                <button onClick={() => setExpandedId(null)} className="p-1 text-slate-400 hover:text-slate-600 rounded">
                                  <X size={16} />
                                </button>
                              </div>

                              {/* Meta grid */}
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4 p-3 bg-slate-50 rounded-lg">
                                <div>
                                  <p className="text-xs text-slate-400">Ngày bán</p>
                                  <p className="text-sm font-medium text-slate-700">{formatDateTime(order.created_at)}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-slate-400">Thanh toán</p>
                                  <p className="text-sm font-medium text-slate-700">{PAYMENT_LABELS[order.payment_method]}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-slate-400">Đã trả</p>
                                  <p className="text-sm font-medium text-green-600">{formatVND(order.paid)}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-slate-400">Còn nợ</p>
                                  <p className={`text-sm font-medium ${order.debt > 0 ? 'text-red-600' : 'text-slate-400'}`}>
                                    {order.debt > 0 ? formatVND(order.debt) : '—'}
                                  </p>
                                </div>
                              </div>

                              {/* Order items table */}
                              {loadingItems[order.id] ? (
                                <div className="py-6 text-center text-slate-400"><Loader2 size={20} className="animate-spin mx-auto" /></div>
                              ) : (
                                <div className="border rounded-lg overflow-hidden mb-4">
                                  <table className="w-full text-sm">
                                    <thead className="bg-slate-50 border-b">
                                      <tr className="text-xs text-slate-500">
                                        <th className="text-left px-3 py-2 font-medium">Mã hàng</th>
                                        <th className="text-left px-3 py-2 font-medium">Tên hàng</th>
                                        <th className="text-center px-3 py-2 font-medium">SL</th>
                                        <th className="text-right px-3 py-2 font-medium">Đơn giá</th>
                                        <th className="text-right px-3 py-2 font-medium">Giảm giá</th>
                                        <th className="text-right px-3 py-2 font-medium">Thành tiền</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                      {(expandedItems[order.id] || []).length === 0 ? (
                                        <tr><td colSpan={6} className="text-center py-4 text-slate-400 text-xs">Không có sản phẩm</td></tr>
                                      ) : (expandedItems[order.id] || []).map(item => (
                                        <tr key={item.id} className="hover:bg-slate-50/50">
                                          <td className="px-3 py-2 font-mono text-xs text-slate-400">{item.product_code}</td>
                                          <td className="px-3 py-2">
                                            <p className="text-slate-800">{item.product_name}</p>
                                            {item.serial_number && <p className="text-xs text-slate-400 font-mono">{item.serial_number}</p>}
                                          </td>
                                          <td className="px-3 py-2 text-center">{item.quantity}</td>
                                          <td className="px-3 py-2 text-right">{formatVND(item.sell_price)}</td>
                                          <td className="px-3 py-2 text-right text-orange-600">
                                            {item.discount > 0 ? formatVND(item.discount) : '—'}
                                          </td>
                                          <td className="px-3 py-2 text-right font-medium">
                                            {formatVND(item.quantity * item.sell_price - (item.discount || 0))}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}

                              {/* Bottom: note + totals */}
                              <div className="flex gap-4">
                                <div className="flex-1">
                                  <p className="text-xs text-slate-400 mb-1">Ghi chú</p>
                                  <p className="text-sm text-slate-600 bg-slate-50 rounded p-2 min-h-[48px]">
                                    {order.note || <span className="text-slate-300 italic">Không có ghi chú</span>}
                                  </p>
                                </div>
                                <div className="w-56 space-y-1.5 text-sm">
                                  <div className="flex justify-between text-slate-600">
                                    <span>Tổng tiền hàng</span>
                                    <span>{formatVND(order.total + (order.discount || 0))}</span>
                                  </div>
                                  {(order.discount || 0) > 0 && (
                                    <div className="flex justify-between text-orange-600">
                                      <span>Giảm giá</span>
                                      <span>- {formatVND(order.discount)}</span>
                                    </div>
                                  )}
                                  <div className="flex justify-between font-semibold text-slate-900 border-t pt-1.5">
                                    <span>Khách phải trả</span>
                                    <span>{formatVND(order.total)}</span>
                                  </div>
                                  <div className="flex justify-between text-green-600">
                                    <span>Đã thanh toán</span>
                                    <span>{formatVND(order.paid)}</span>
                                  </div>
                                  {order.debt > 0 && (
                                    <div className="flex justify-between text-red-600 font-medium">
                                      <span>Còn nợ</span>
                                      <span>{formatVND(order.debt)}</span>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Action bar */}
                              <div className="flex items-center justify-between mt-4 pt-3 border-t">
                                <div className="flex gap-2">
                                  {order.status !== 'huy' && order.status !== 'hoan_thanh' && (
                                    <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50"
                                      onClick={() => cancelOrder(order)}>
                                      <X size={13} className="mr-1" /> Huỷ
                                    </Button>
                                  )}
                                  <Button size="sm" variant="outline" className="text-slate-600">
                                    <Copy size={13} className="mr-1" /> Sao chép
                                  </Button>
                                  <Button size="sm" variant="outline" className="text-slate-600">
                                    <FileDown size={13} className="mr-1" /> Xuất file
                                  </Button>
                                </div>
                                <div className="flex gap-2">
                                  <Button size="sm" variant="outline">
                                    <Edit size={13} className="mr-1" /> Chỉnh sửa
                                  </Button>
                                  {order.status !== 'huy' && (
                                    <Button size="sm" variant="outline">
                                      <RotateCcw size={13} className="mr-1" /> Trả hàng
                                    </Button>
                                  )}
                                  <Button size="sm" variant="outline">
                                    <Printer size={13} className="mr-1" /> In
                                  </Button>
                                  <Button size="sm" variant="outline">
                                    <QrCode size={13} className="mr-1" /> Tạo QR
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t bg-slate-50">
              <p className="text-xs text-slate-500">
                Hiển thị {start.toLocaleString()}–{end.toLocaleString()} / {total.toLocaleString()} đơn hàng
              </p>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" onClick={() => navigate(page - 1)} disabled={page <= 1 || isPending} className="h-8 w-8 p-0">
                  <ChevronLeft size={14} />
                </Button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let p: number
                  if (totalPages <= 5) p = i + 1
                  else if (page <= 3) p = i + 1
                  else if (page >= totalPages - 2) p = totalPages - 4 + i
                  else p = page - 2 + i
                  return (
                    <Button key={p} variant={p === page ? 'default' : 'outline'} size="sm"
                      onClick={() => navigate(p)} disabled={isPending} className="h-8 w-8 p-0 text-xs">
                      {p}
                    </Button>
                  )
                })}
                <Button variant="outline" size="sm" onClick={() => navigate(page + 1)} disabled={page >= totalPages || isPending} className="h-8 w-8 p-0">
                  <ChevronRightPage size={14} />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
