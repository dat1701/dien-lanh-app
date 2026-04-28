'use client'

import { useState, useTransition, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  ChevronDown, ChevronRight, Search, FileDown, Copy, RotateCcw,
  Printer, QrCode, Edit, ChevronLeft, ChevronRight as ChevronRightPage,
  Loader2, ExternalLink, X, CheckCircle2
} from 'lucide-react'
import { formatVND, formatDateTime, STATUS_LABELS, STATUS_COLORS, PAYMENT_LABELS } from '@/lib/format'
import { createClient } from '@/lib/supabase/client'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'

const TABS = ['Thông tin']

interface OrderItem {
  id: string
  product_id?: string
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
  subtotal?: number
  paid: number
  debt: number
  discount: number
  note?: string
  customer_name?: string
  customer_phone?: string
  customer_id?: string
  customer?: { name: string; phone: string }
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

const STATUS_FILTERS = [
  { value: 'all', label: 'Tất cả' },
  { value: 'cho_xu_ly', label: 'Chờ xử lý' },
  { value: 'dang_giao', label: 'Đang giao' },
  { value: 'hoan_thanh', label: 'Hoàn thành' },
  { value: 'tra_hang', label: 'Trả hàng' },
  { value: 'huy', label: 'Huỷ' },
]

export function OrdersClient({ initialOrders, total, page, totalPages, pageSize, initialSearch, initialStatus }: Props) {
  const [orders, setOrders] = useState(initialOrders)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [expandedItems, setExpandedItems] = useState<Record<string, OrderItem[]>>({})
  const [loadingItems, setLoadingItems] = useState<Record<string, boolean>>({})
  const [activeTab, setActiveTab] = useState<Record<string, string>>({})
  const [search, setSearch] = useState(initialSearch)
  const [statusFilter, setStatusFilter] = useState(initialStatus)
  const [isPending, startTransition] = useTransition()

  // Dialogs
  const [editDialog, setEditDialog] = useState<Order | null>(null)
  const [returnDialog, setReturnDialog] = useState<{ order: Order; items: OrderItem[] } | null>(null)
  const [printOrder, setPrintOrder] = useState<{ order: Order; items: OrderItem[] } | null>(null)
  const [qrOrder, setQrOrder] = useState<Order | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  // Edit form
  const [editForm, setEditForm] = useState({ status: '', paid: '', note: '' })

  // Return form
  const [returnQtys, setReturnQtys] = useState<Record<string, number>>({})

  const supabase = createClient()
  const router = useRouter()
  const pathname = usePathname()
  const printRef = useRef<HTMLDivElement>(null)

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

  async function loadItems(orderId: string): Promise<OrderItem[]> {
    if (expandedItems[orderId]) return expandedItems[orderId]
    setLoadingItems(p => ({ ...p, [orderId]: true }))
    const { data } = await supabase.from('order_items').select('*').eq('order_id', orderId)
    const items = data || []
    setExpandedItems(p => ({ ...p, [orderId]: items }))
    setLoadingItems(p => ({ ...p, [orderId]: false }))
    return items
  }

  async function toggleExpand(order: Order) {
    if (expandedId === order.id) { setExpandedId(null); return }
    setExpandedId(order.id)
    if (!activeTab[order.id]) setActiveTab(p => ({ ...p, [order.id]: 'Thông tin' }))
    await loadItems(order.id)
  }

  const customerName = (o: Order) => o.customer?.name || o.customer_name || 'Khách lẻ'
  const customerPhone = (o: Order) => o.customer?.phone || o.customer_phone || ''

  // ── HUỶ ──
  async function cancelOrder(order: Order) {
    if (!confirm(`Hủy đơn hàng ${order.code}?`)) return
    const { data } = await supabase.from('orders').update({ status: 'huy' }).eq('id', order.id).select().single()
    if (data) setOrders(prev => prev.map(o => o.id === data.id ? { ...o, status: 'huy' } : o))
  }

  // ── SAO CHÉP ──
  async function copyOrder(order: Order) {
    setActionLoading(true)
    const items = await loadItems(order.id)
    const code = 'DH' + Date.now().toString().slice(-8)
    const { data: newOrder } = await supabase.from('orders').insert({
      code, customer_id: order.customer_id || null,
      customer_name: customerName(order), customer_phone: customerPhone(order),
      status: 'cho_xu_ly', payment_method: order.payment_method,
      subtotal: order.subtotal || order.total, discount: order.discount || 0,
      total: order.total, paid: 0, debt: order.total, note: order.note || null,
    }).select().single()
    if (newOrder && items.length > 0) {
      await supabase.from('order_items').insert(items.map(i => ({
        order_id: newOrder.id, product_id: null,
        product_code: i.product_code, product_name: i.product_name,
        quantity: i.quantity, sell_price: i.sell_price, discount: i.discount || 0,
        serial_number: null, warranty_months: 12,
      })))
      setOrders(prev => [{ ...newOrder, customer: order.customer }, ...prev])
      alert(`Đã sao chép → Đơn mới: ${code}`)
    }
    setActionLoading(false)
  }

  // ── XUẤT FILE CSV ──
  function exportOrder(order: Order) {
    const items = expandedItems[order.id] || []
    const rows = [
      ['Mã đơn', 'Khách hàng', 'SĐT', 'Ngày', 'Trạng thái', 'Tổng tiền', 'Đã trả', 'Còn nợ'],
      [order.code, customerName(order), customerPhone(order), formatDateTime(order.created_at),
        STATUS_LABELS[order.status], order.total, order.paid, order.debt],
      [],
      ['Mã hàng', 'Tên hàng', 'SL', 'Đơn giá', 'Giảm giá', 'Thành tiền'],
      ...items.map(i => [i.product_code, i.product_name, i.quantity, i.sell_price, i.discount || 0,
        i.quantity * i.sell_price - (i.discount || 0)]),
    ]
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `${order.code}.csv`
    a.click(); URL.revokeObjectURL(url)
  }

  // ── CHỈNH SỬA ──
  function openEdit(order: Order) {
    setEditForm({ status: order.status, paid: String(order.paid), note: order.note || '' })
    setEditDialog(order)
  }
  async function saveEdit() {
    if (!editDialog) return
    setActionLoading(true)
    const paid = Number(editForm.paid) || 0
    const debt = Math.max(0, editDialog.total - paid)
    const { data } = await supabase.from('orders').update({
      status: editForm.status, paid, debt, note: editForm.note || null,
    }).eq('id', editDialog.id).select().single()
    if (data) setOrders(prev => prev.map(o => o.id === data.id ? { ...o, ...data } : o))
    setEditDialog(null)
    setActionLoading(false)
  }

  // ── TRẢ HÀNG ──
  async function openReturn(order: Order) {
    const items = await loadItems(order.id)
    const qtys: Record<string, number> = {}
    items.forEach(i => { qtys[i.id] = i.quantity })
    setReturnQtys(qtys)
    setReturnDialog({ order, items })
  }
  async function saveReturn() {
    if (!returnDialog) return
    setActionLoading(true)
    const { order, items } = returnDialog
    const returnItems = items.filter(i => (returnQtys[i.id] || 0) > 0)
    if (returnItems.length === 0) { setActionLoading(false); return }
    const returnTotal = returnItems.reduce((s, i) => s + i.sell_price * (returnQtys[i.id] || 0), 0)
    const code = 'TH' + Date.now().toString().slice(-8)

    // Tạo phiếu trả hàng (dùng đúng schema: subtotal, refund_amount, status='da_tra')
    const { data: ret, error: retErr } = await supabase.from('return_orders').insert({
      code,
      order_id: order.id,
      order_code: order.code,
      customer_id: order.customer_id || null,
      customer_name: customerName(order),
      customer_phone: customerPhone(order),
      subtotal: returnTotal,
      refund_amount: returnTotal,
      status: 'da_tra',
      note: null,
    }).select().single()

    if (retErr) {
      console.error('Return order error:', retErr)
      alert('Lỗi tạo phiếu trả hàng: ' + retErr.message)
      setActionLoading(false)
      return
    }

    if (ret) {
      // Lưu chi tiết trả hàng (schema: product_id, quantity, sell_price, total)
      await supabase.from('return_order_items').insert(returnItems.map(i => ({
        return_order_id: ret.id,
        product_id: i.product_id || null,
        quantity: returnQtys[i.id] || 0,
        sell_price: i.sell_price,
        total: i.sell_price * (returnQtys[i.id] || 0),
      })))

      // Hoàn kho: chỉ chạy khi có product_id, trigger tự cộng tồn kho
      for (const i of returnItems) {
        if (i.product_id) {
          await supabase.from('stock_transactions').insert({
            product_id: i.product_id,
            type: 'tra_hang',
            quantity: returnQtys[i.id] || 0,
            price: i.sell_price,
            order_id: order.id,
            note: `Trả hàng đơn ${order.code}`,
          })
        }
      }

      // Cập nhật trạng thái đơn gốc → tra_hang
      const { data: updatedOrder, error: updateErr } = await supabase
        .from('orders')
        .update({ status: 'tra_hang' })
        .eq('id', order.id)
        .select()
        .single()

      if (updateErr) {
        // migration_v4 chưa chạy → thông báo nhắc nhở
        console.error('Update status error:', updateErr)
        alert(`✅ Phiếu trả hàng ${code} đã tạo!\nTiền hoàn: ${formatVND(returnTotal)}\n\n⚠️ Để hiển thị trạng thái "Trả hàng", hãy chạy migration_v4.sql trong Supabase SQL Editor.`)
      } else {
        if (updatedOrder) {
          setOrders(prev => prev.map(o => o.id === updatedOrder.id ? { ...o, status: 'tra_hang' } : o))
        }
        alert(`✅ Trả hàng thành công!\nMã phiếu: ${code}\nTiền hoàn: ${formatVND(returnTotal)}\nTồn kho đã được cộng lại.`)
      }
    }
    setReturnDialog(null)
    setActionLoading(false)
  }

  // ── IN ──
  async function openPrint(order: Order) {
    const items = await loadItems(order.id)
    setPrintOrder({ order, items })
    setTimeout(() => window.print(), 300)
  }

  // ── TẠO QR ──
  function openQR(order: Order) { setQrOrder(order) }

  const start = (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, total)

  return (
    <>
      {/* Print area — hidden on screen, shown on print */}
      {printOrder && (
        <div id="print-area" className="hidden print:block p-8 font-sans text-sm">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold">HÓA ĐƠN BÁN HÀNG</h2>
            <p className="text-slate-500">{printOrder.order.code}</p>
            <p className="text-slate-500">{formatDateTime(printOrder.order.created_at)}</p>
          </div>
          <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
            <div><b>Khách hàng:</b> {customerName(printOrder.order)}</div>
            <div><b>SĐT:</b> {customerPhone(printOrder.order)}</div>
          </div>
          <table className="w-full text-xs border-collapse mb-4">
            <thead>
              <tr className="border-b border-t">
                <th className="text-left py-1">Sản phẩm</th>
                <th className="text-center py-1">SL</th>
                <th className="text-right py-1">Đơn giá</th>
                <th className="text-right py-1">T.tiền</th>
              </tr>
            </thead>
            <tbody>
              {printOrder.items.map(i => (
                <tr key={i.id} className="border-b">
                  <td className="py-1">{i.product_name}</td>
                  <td className="text-center">{i.quantity}</td>
                  <td className="text-right">{formatVND(i.sell_price)}</td>
                  <td className="text-right">{formatVND(i.quantity * i.sell_price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="text-right space-y-1 text-xs">
            {(printOrder.order.discount || 0) > 0 && <div>Giảm giá: -{formatVND(printOrder.order.discount)}</div>}
            <div className="font-bold text-sm">Tổng: {formatVND(printOrder.order.total)}</div>
            <div>Đã trả: {formatVND(printOrder.order.paid)}</div>
            {printOrder.order.debt > 0 && <div className="text-red-600">Còn nợ: {formatVND(printOrder.order.debt)}</div>}
          </div>
          {printOrder.order.note && <p className="mt-4 text-xs text-slate-500">Ghi chú: {printOrder.order.note}</p>}
          <p className="text-center mt-6 text-xs text-slate-400">Cảm ơn quý khách!</p>
        </div>
      )}

      <div className="space-y-5 print:hidden">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Đơn hàng</h1>
            <p className="text-slate-500 text-sm mt-0.5">{total.toLocaleString('vi-VN')} đơn hàng</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/sales"><Button size="sm">+ Tạo đơn mới</Button></Link>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <form onSubmit={e => { e.preventDefault(); navigate(1, search) }} className="relative max-w-sm flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input placeholder="Tìm mã đơn, khách hàng..." value={search}
              onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
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
                      <tr key={order.id} onClick={() => toggleExpand(order)}
                        className={`border-b cursor-pointer transition-colors ${expandedId === order.id ? 'bg-blue-50/60' : 'hover:bg-slate-50'}`}>
                        <td className="px-3 py-3 text-slate-400">
                          {expandedId === order.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
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
                            : <span className="text-green-600 text-xs">Đã TT</span>}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[order.status]}`}>
                            {STATUS_LABELS[order.status]}
                          </span>
                        </td>
                      </tr>

                      {/* Expanded panel */}
                      {expandedId === order.id && (
                        <tr key={`exp-${order.id}`} className="border-b bg-slate-50/80">
                          <td colSpan={8} className="p-0">
                            <div className="border-t-2 border-blue-400">
                              {/* Tab bar */}
                              <div className="flex border-b bg-white px-4">
                                {TABS.map(tab => (
                                  <button key={tab} onClick={e => { e.stopPropagation(); setActiveTab(p => ({ ...p, [order.id]: tab })) }}
                                    className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${(activeTab[order.id] || 'Thông tin') === tab ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                                    {tab}
                                  </button>
                                ))}
                              </div>

                              <div className="p-4 bg-white" onClick={e => e.stopPropagation()}>
                                {/* Hero */}
                                <div className="flex items-start justify-between mb-4">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                                      {customerName(order).charAt(0)}
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-1.5">
                                        <span className="font-semibold text-slate-900">{customerName(order)}</span>
                                        {order.customer_phone && <span className="text-xs text-slate-400">{customerPhone(order)}</span>}
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

                                {/* Meta */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4 p-3 bg-slate-50 rounded-lg">
                                  <div><p className="text-xs text-slate-400">Ngày bán</p><p className="text-sm font-medium text-slate-700">{formatDateTime(order.created_at)}</p></div>
                                  <div><p className="text-xs text-slate-400">Thanh toán</p><p className="text-sm font-medium text-slate-700">{PAYMENT_LABELS[order.payment_method]}</p></div>
                                  <div><p className="text-xs text-slate-400">Đã trả</p><p className="text-sm font-medium text-green-600">{formatVND(order.paid)}</p></div>
                                  <div><p className="text-xs text-slate-400">Còn nợ</p><p className={`text-sm font-medium ${order.debt > 0 ? 'text-red-600' : 'text-slate-400'}`}>{order.debt > 0 ? formatVND(order.debt) : '—'}</p></div>
                                </div>

                                {/* Items table */}
                                {loadingItems[order.id] ? (
                                  <div className="py-6 text-center"><Loader2 size={20} className="animate-spin mx-auto text-slate-300" /></div>
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
                                            <td className="px-3 py-2 text-slate-800">{item.product_name}
                                              {item.serial_number && <p className="text-xs text-slate-400 font-mono">{item.serial_number}</p>}
                                            </td>
                                            <td className="px-3 py-2 text-center">{item.quantity}</td>
                                            <td className="px-3 py-2 text-right">{formatVND(item.sell_price)}</td>
                                            <td className="px-3 py-2 text-right text-orange-600">{item.discount > 0 ? formatVND(item.discount) : '—'}</td>
                                            <td className="px-3 py-2 text-right font-medium">{formatVND(item.quantity * item.sell_price - (item.discount || 0))}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                )}

                                {/* Note + totals */}
                                <div className="flex gap-4">
                                  <div className="flex-1">
                                    <p className="text-xs text-slate-400 mb-1">Ghi chú</p>
                                    <p className="text-sm text-slate-600 bg-slate-50 rounded p-2 min-h-[48px]">
                                      {order.note || <span className="text-slate-300 italic">Không có ghi chú</span>}
                                    </p>
                                  </div>
                                  <div className="w-52 space-y-1.5 text-sm">
                                    <div className="flex justify-between text-slate-600">
                                      <span>Tổng hàng</span><span>{formatVND((order.subtotal || order.total) + (order.discount || 0))}</span>
                                    </div>
                                    {(order.discount || 0) > 0 && (
                                      <div className="flex justify-between text-orange-600">
                                        <span>Giảm giá</span><span>-{formatVND(order.discount)}</span>
                                      </div>
                                    )}
                                    <div className="flex justify-between font-semibold text-slate-900 border-t pt-1.5">
                                      <span>Khách trả</span><span>{formatVND(order.total)}</span>
                                    </div>
                                    <div className="flex justify-between text-green-600">
                                      <span>Đã thanh toán</span><span>{formatVND(order.paid)}</span>
                                    </div>
                                    {order.debt > 0 && (
                                      <div className="flex justify-between text-red-600 font-medium">
                                        <span>Còn nợ</span><span>{formatVND(order.debt)}</span>
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
                                    <Button size="sm" variant="outline" onClick={() => copyOrder(order)} disabled={actionLoading}>
                                      <Copy size={13} className="mr-1" /> Sao chép
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={() => exportOrder(order)}>
                                      <FileDown size={13} className="mr-1" /> Xuất file
                                    </Button>
                                  </div>
                                  <div className="flex gap-2">
                                    <Button size="sm" variant="outline" onClick={() => openEdit(order)}>
                                      <Edit size={13} className="mr-1" /> Chỉnh sửa
                                    </Button>
                                    {order.status !== 'huy' && (
                                      <Button size="sm" variant="outline" onClick={() => openReturn(order)}>
                                        <RotateCcw size={13} className="mr-1" /> Trả hàng
                                      </Button>
                                    )}
                                    <Button size="sm" variant="outline" onClick={() => openPrint(order)}>
                                      <Printer size={13} className="mr-1" /> In
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={() => openQR(order)}>
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
                <p className="text-xs text-slate-500">Hiển thị {start.toLocaleString()}–{end.toLocaleString()} / {total.toLocaleString()} đơn hàng</p>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="sm" onClick={() => navigate(page - 1)} disabled={page <= 1 || isPending} className="h-8 w-8 p-0"><ChevronLeft size={14} /></Button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let p = totalPages <= 5 ? i + 1 : page <= 3 ? i + 1 : page >= totalPages - 2 ? totalPages - 4 + i : page - 2 + i
                    return <Button key={p} variant={p === page ? 'default' : 'outline'} size="sm" onClick={() => navigate(p)} disabled={isPending} className="h-8 w-8 p-0 text-xs">{p}</Button>
                  })}
                  <Button variant="outline" size="sm" onClick={() => navigate(page + 1)} disabled={page >= totalPages || isPending} className="h-8 w-8 p-0"><ChevronRightPage size={14} /></Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── DIALOG CHỈNH SỬA ── */}
      <Dialog open={!!editDialog} onOpenChange={() => setEditDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Chỉnh sửa đơn hàng — {editDialog?.code}</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Trạng thái</Label>
              <select value={editForm.status} onChange={e => setEditForm(p => ({ ...p, status: e.target.value }))}
                className="w-full border rounded-md px-3 py-2 text-sm bg-white">
                {STATUS_FILTERS.filter(f => f.value !== 'all').map(f => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Khách đã trả (đ)</Label>
              <Input type="number" value={editForm.paid} onChange={e => setEditForm(p => ({ ...p, paid: e.target.value }))} />
              {editDialog && (
                <p className="text-xs text-slate-400">
                  Tổng đơn: {formatVND(editDialog.total)} —
                  Còn nợ sau: <span className={Number(editForm.paid) >= editDialog.total ? 'text-green-600' : 'text-red-600'}>
                    {formatVND(Math.max(0, editDialog.total - (Number(editForm.paid) || 0)))}
                  </span>
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Ghi chú</Label>
              <Input value={editForm.note} onChange={e => setEditForm(p => ({ ...p, note: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditDialog(null)}>Huỷ</Button>
              <Button onClick={saveEdit} disabled={actionLoading}>
                {actionLoading && <Loader2 size={14} className="animate-spin mr-1" />} Lưu
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── DIALOG TRẢ HÀNG ── */}
      <Dialog open={!!returnDialog} onOpenChange={() => setReturnDialog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Trả hàng — {returnDialog?.order.code}</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <p className="text-sm text-slate-500">Chọn sản phẩm và số lượng trả:</p>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr className="text-xs text-slate-500">
                    <th className="text-left px-3 py-2 font-medium">Sản phẩm</th>
                    <th className="text-center px-3 py-2 font-medium">Đã mua</th>
                    <th className="text-center px-3 py-2 font-medium">Số lượng trả</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(returnDialog?.items || []).map(item => (
                    <tr key={item.id}>
                      <td className="px-3 py-2 text-slate-800">{item.product_name}</td>
                      <td className="px-3 py-2 text-center text-slate-500">{item.quantity}</td>
                      <td className="px-3 py-2 text-center">
                        <input type="number" min={0} max={item.quantity}
                          value={returnQtys[item.id] ?? item.quantity}
                          onChange={e => setReturnQtys(p => ({ ...p, [item.id]: Math.min(item.quantity, Math.max(0, Number(e.target.value))) }))}
                          className="w-16 border rounded px-2 py-1 text-center text-sm" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {returnDialog && (
              <div className="flex justify-between text-sm font-medium bg-red-50 rounded-lg p-3">
                <span>Tổng tiền hoàn trả</span>
                <span className="text-red-600">
                  {formatVND((returnDialog.items || []).reduce((s, i) => s + i.sell_price * (returnQtys[i.id] ?? i.quantity), 0))}
                </span>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setReturnDialog(null)}>Huỷ</Button>
              <Button onClick={saveReturn} disabled={actionLoading} className="bg-red-600 hover:bg-red-700">
                {actionLoading && <Loader2 size={14} className="animate-spin mr-1" />}
                <RotateCcw size={13} className="mr-1" /> Xác nhận trả hàng
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── DIALOG QR CODE ── */}
      <Dialog open={!!qrOrder} onOpenChange={() => setQrOrder(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>QR Code — {qrOrder?.code}</DialogTitle></DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            {qrOrder && (
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                  `Đơn hàng: ${qrOrder.code}\nKhách: ${customerName(qrOrder)}\nTổng tiền: ${formatVND(qrOrder.total)}`
                )}`}
                alt="QR Code"
                className="border rounded-lg p-2"
                width={200} height={200}
              />
            )}
            <div className="text-center text-sm text-slate-500">
              <p className="font-mono font-bold text-slate-800">{qrOrder?.code}</p>
              <p>{qrOrder && customerName(qrOrder)}</p>
              <p className="font-semibold text-blue-600">{qrOrder && formatVND(qrOrder.total)}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => {
              const link = document.createElement('a')
              link.href = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(`Đơn hàng: ${qrOrder?.code}`)}`
              link.download = `QR-${qrOrder?.code}.png`
              link.click()
            }}>
              <FileDown size={13} className="mr-1" /> Tải QR
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
