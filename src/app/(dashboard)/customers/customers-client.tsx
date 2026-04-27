'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import {
  Plus, Search, ChevronLeft, ChevronRight, Loader2,
  ChevronDown, ChevronRight as ChevronRightIcon, X,
  Phone, Mail, MapPin, User, Calendar, Building2,
  ShoppingBag, CreditCard, Edit
} from 'lucide-react'
import { formatVND, formatDate, formatDateTime } from '@/lib/format'
import { Customer } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { useRouter, usePathname } from 'next/navigation'

const CUSTOMER_TABS = ['Thông tin', 'Địa chỉ nhận hàng', 'Nợ cần thu']

interface Props {
  initialCustomers: Customer[]
  total: number
  page: number
  totalPages: number
  pageSize: number
  initialSearch: string
}

export function CustomersClient({ initialCustomers, total, page, totalPages, pageSize, initialSearch }: Props) {
  const [customers, setCustomers] = useState(initialCustomers)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Record<string, string>>({})
  const [expandedOrders, setExpandedOrders] = useState<Record<string, any[]>>({})
  const [loadingOrders, setLoadingOrders] = useState<Record<string, boolean>>({})
  const [search, setSearch] = useState(initialSearch)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null)
  const [saving, setSaving] = useState(false)
  const [isPending, startTransition] = useTransition()
  const supabase = createClient()
  const router = useRouter()
  const pathname = usePathname()

  const [form, setForm] = useState({ code: '', name: '', phone: '', email: '', address: '' })

  function navigate(newPage: number, q?: string) {
    const params = new URLSearchParams()
    if (newPage > 1) params.set('page', String(newPage))
    const query = q !== undefined ? q : search
    if (query) params.set('q', query)
    startTransition(() => {
      router.push(`${pathname}${params.toString() ? '?' + params.toString() : ''}`)
    })
  }

  async function toggleExpand(c: Customer) {
    if (expandedId === c.id) {
      setExpandedId(null)
      return
    }
    setExpandedId(c.id)
    if (!activeTab[c.id]) setActiveTab(p => ({ ...p, [c.id]: 'Thông tin' }))
  }

  async function loadOrders(customerId: string) {
    if (expandedOrders[customerId]) return
    setLoadingOrders(p => ({ ...p, [customerId]: true }))
    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .limit(20)
    setExpandedOrders(p => ({ ...p, [customerId]: data || [] }))
    setLoadingOrders(p => ({ ...p, [customerId]: false }))
  }

  function openNew() {
    setEditCustomer(null)
    setForm({ code: '', name: '', phone: '', email: '', address: '' })
    setDialogOpen(true)
  }

  function openEdit(c: Customer, e: React.MouseEvent) {
    e.stopPropagation()
    setEditCustomer(c)
    setForm({ code: c.code, name: c.name, phone: c.phone, email: c.email || '', address: c.address || '' })
    setDialogOpen(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const payload = {
      code: form.code.trim(),
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim() || null,
      address: form.address.trim() || null,
    }
    if (editCustomer) {
      const { data } = await supabase.from('customers').update(payload).eq('id', editCustomer.id).select().single()
      if (data) setCustomers(prev => prev.map(c => c.id === data.id ? data as Customer : c))
    } else {
      const { data } = await supabase.from('customers').insert(payload).select().single()
      if (data) setCustomers(prev => [data as Customer, ...prev])
    }
    setSaving(false)
    setDialogOpen(false)
  }

  const start = (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, total)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Khách hàng</h1>
          <p className="text-slate-500 text-sm mt-0.5">{total.toLocaleString('vi-VN')} khách hàng</p>
        </div>
        <Button onClick={openNew}><Plus size={16} className="mr-1" /> Thêm khách hàng</Button>
      </div>

      {/* Search */}
      <form onSubmit={e => { e.preventDefault(); navigate(1, search) }} className="flex gap-2 max-w-md">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input placeholder="Tìm theo tên, SĐT, mã..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button type="submit" variant="outline" disabled={isPending}>
          {isPending ? <Loader2 size={14} className="animate-spin" /> : 'Tìm'}
        </Button>
        {initialSearch && (
          <Button type="button" variant="ghost" onClick={() => { setSearch(''); navigate(1, '') }}>Xoá</Button>
        )}
      </form>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr className="text-slate-500 text-xs">
                  <th className="w-8 px-3 py-3"></th>
                  <th className="text-left px-4 py-3 font-medium">Mã / Tên</th>
                  <th className="text-left px-4 py-3 font-medium">Điện thoại</th>
                  <th className="text-left px-4 py-3 font-medium">Địa chỉ</th>
                  <th className="text-right px-4 py-3 font-medium">Tổng mua</th>
                  <th className="text-right px-4 py-3 font-medium">Công nợ</th>
                  <th className="text-left px-4 py-3 font-medium">Ngày tạo</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {isPending ? (
                  <tr><td colSpan={8} className="text-center py-12"><Loader2 size={24} className="animate-spin mx-auto text-slate-300" /></td></tr>
                ) : customers.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-16 text-slate-400 text-sm">Không tìm thấy khách hàng</td></tr>
                ) : customers.map(c => (
                  <>
                    {/* Main row */}
                    <tr
                      key={c.id}
                      onClick={() => toggleExpand(c)}
                      className={`border-b cursor-pointer transition-colors ${expandedId === c.id ? 'bg-blue-50/60' : 'hover:bg-slate-50'}`}
                    >
                      <td className="px-3 py-3 text-slate-400">
                        {expandedId === c.id ? <ChevronDown size={16} /> : <ChevronRightIcon size={16} />}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-mono text-xs text-slate-400">{c.code}</p>
                        <p className="font-medium text-slate-800">{c.name}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{c.phone}</td>
                      <td className="px-4 py-3 text-slate-400 text-xs max-w-xs truncate">{c.address || '—'}</td>
                      <td className="px-4 py-3 text-right font-medium">{formatVND(c.total_purchase)}</td>
                      <td className="px-4 py-3 text-right">
                        {c.debt > 0
                          ? <span className="text-red-600 font-medium">{formatVND(c.debt)}</span>
                          : <span className="text-green-600 text-xs">—</span>
                        }
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs">{formatDate(c.created_at)}</td>
                      <td className="px-4 py-3">
                        <button onClick={e => openEdit(c, e)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded">
                          <Edit size={15} />
                        </button>
                      </td>
                    </tr>

                    {/* Expanded detail */}
                    {expandedId === c.id && (
                      <tr key={`expand-${c.id}`} className="border-b bg-slate-50/80">
                        <td colSpan={8} className="p-0">
                          <div className="border-t-2 border-blue-400">
                            {/* Tab bar */}
                            <div className="flex border-b bg-white px-4">
                              {CUSTOMER_TABS.map(tab => (
                                <button key={tab}
                                  onClick={e => {
                                    e.stopPropagation()
                                    setActiveTab(p => ({ ...p, [c.id]: tab }))
                                    if (tab === 'Nợ cần thu') loadOrders(c.id)
                                  }}
                                  className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${(activeTab[c.id] || 'Thông tin') === tab ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                                  {tab}
                                </button>
                              ))}
                            </div>

                            {/* Tab content */}
                            <div className="p-4 bg-white" onClick={e => e.stopPropagation()}>
                              {/* Close button */}
                              <div className="flex justify-end mb-3">
                                <button onClick={() => setExpandedId(null)} className="p-1 text-slate-400 hover:text-slate-600 rounded">
                                  <X size={16} />
                                </button>
                              </div>

                              {/* Tab: Thông tin */}
                              {(activeTab[c.id] || 'Thông tin') === 'Thông tin' && (
                                <div className="flex gap-6">
                                  {/* Avatar + name */}
                                  <div className="flex flex-col items-center gap-2 w-32">
                                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-2xl">
                                      {c.name.charAt(0)}
                                    </div>
                                    <p className="text-sm font-semibold text-slate-800 text-center">{c.name}</p>
                                    <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                                      {c.is_active !== false ? 'Đang hoạt động' : 'Ngừng hoạt động'}
                                    </span>
                                  </div>

                                  {/* Fields grid */}
                                  <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-4">
                                    <div className="flex items-start gap-2">
                                      <User size={14} className="text-slate-400 mt-0.5 flex-shrink-0" />
                                      <div>
                                        <p className="text-xs text-slate-400">Mã khách hàng</p>
                                        <p className="text-sm font-mono text-slate-700">{c.code}</p>
                                      </div>
                                    </div>
                                    <div className="flex items-start gap-2">
                                      <Phone size={14} className="text-slate-400 mt-0.5 flex-shrink-0" />
                                      <div>
                                        <p className="text-xs text-slate-400">Điện thoại</p>
                                        <p className="text-sm text-slate-700">{c.phone || '—'}</p>
                                      </div>
                                    </div>
                                    <div className="flex items-start gap-2">
                                      <Mail size={14} className="text-slate-400 mt-0.5 flex-shrink-0" />
                                      <div>
                                        <p className="text-xs text-slate-400">Email</p>
                                        <p className="text-sm text-slate-700">{c.email || '—'}</p>
                                      </div>
                                    </div>
                                    <div className="flex items-start gap-2">
                                      <MapPin size={14} className="text-slate-400 mt-0.5 flex-shrink-0" />
                                      <div>
                                        <p className="text-xs text-slate-400">Địa chỉ</p>
                                        <p className="text-sm text-slate-700">{c.address || '—'}</p>
                                      </div>
                                    </div>
                                    <div className="flex items-start gap-2">
                                      <Calendar size={14} className="text-slate-400 mt-0.5 flex-shrink-0" />
                                      <div>
                                        <p className="text-xs text-slate-400">Ngày tạo</p>
                                        <p className="text-sm text-slate-700">{formatDate(c.created_at)}</p>
                                      </div>
                                    </div>
                                    <div className="flex items-start gap-2">
                                      <ShoppingBag size={14} className="text-slate-400 mt-0.5 flex-shrink-0" />
                                      <div>
                                        <p className="text-xs text-slate-400">Tổng mua</p>
                                        <p className="text-sm font-semibold text-blue-600">{formatVND(c.total_purchase)}</p>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Stats */}
                                  <div className="w-40 space-y-3">
                                    <div className="bg-blue-50 rounded-lg p-3">
                                      <p className="text-xs text-blue-600">Tổng mua hàng</p>
                                      <p className="text-lg font-bold text-blue-700">{formatVND(c.total_purchase)}</p>
                                    </div>
                                    <div className={`rounded-lg p-3 ${c.debt > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
                                      <p className={`text-xs ${c.debt > 0 ? 'text-red-600' : 'text-green-600'}`}>Công nợ</p>
                                      <p className={`text-lg font-bold ${c.debt > 0 ? 'text-red-700' : 'text-green-700'}`}>
                                        {c.debt > 0 ? formatVND(c.debt) : 'Không nợ'}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Tab: Địa chỉ nhận hàng */}
                              {(activeTab[c.id]) === 'Địa chỉ nhận hàng' && (
                                <div className="space-y-3">
                                  {c.address ? (
                                    <div className="flex items-start gap-3 p-3 border rounded-lg hover:bg-slate-50">
                                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                                        <MapPin size={14} className="text-blue-600" />
                                      </div>
                                      <div className="flex-1">
                                        <p className="font-medium text-slate-800">{c.name}</p>
                                        <p className="text-sm text-slate-500 mt-0.5">{c.address}</p>
                                        <p className="text-sm text-slate-500">{c.phone}</p>
                                      </div>
                                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">Mặc định</span>
                                    </div>
                                  ) : (
                                    <div className="text-center py-8 text-slate-400">
                                      <MapPin size={32} className="mx-auto mb-2 opacity-30" />
                                      <p className="text-sm">Chưa có địa chỉ nhận hàng</p>
                                      <Button size="sm" variant="outline" className="mt-3">
                                        <Plus size={13} className="mr-1" /> Thêm địa chỉ
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Tab: Nợ cần thu */}
                              {(activeTab[c.id]) === 'Nợ cần thu' && (
                                <div>
                                  {loadingOrders[c.id] ? (
                                    <div className="py-8 text-center"><Loader2 size={20} className="animate-spin mx-auto text-slate-300" /></div>
                                  ) : c.debt <= 0 ? (
                                    <div className="text-center py-8 text-slate-400">
                                      <CreditCard size={32} className="mx-auto mb-2 opacity-30" />
                                      <p className="text-sm">Khách hàng không có công nợ</p>
                                    </div>
                                  ) : (
                                    <div className="space-y-3">
                                      <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                                        <span className="text-sm font-medium text-red-700">Tổng nợ cần thu</span>
                                        <span className="text-lg font-bold text-red-700">{formatVND(c.debt)}</span>
                                      </div>
                                      <div className="border rounded-lg overflow-hidden">
                                        <table className="w-full text-sm">
                                          <thead className="bg-slate-50 border-b">
                                            <tr className="text-xs text-slate-500">
                                              <th className="text-left px-3 py-2 font-medium">Mã đơn</th>
                                              <th className="text-left px-3 py-2 font-medium">Ngày bán</th>
                                              <th className="text-right px-3 py-2 font-medium">Tổng tiền</th>
                                              <th className="text-right px-3 py-2 font-medium">Còn nợ</th>
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y">
                                            {(expandedOrders[c.id] || []).filter((o: any) => o.debt > 0).map((o: any) => (
                                              <tr key={o.id} className="hover:bg-slate-50">
                                                <td className="px-3 py-2 font-mono text-blue-600">{o.code}</td>
                                                <td className="px-3 py-2 text-slate-500 text-xs">{formatDateTime(o.created_at)}</td>
                                                <td className="px-3 py-2 text-right">{formatVND(o.total)}</td>
                                                <td className="px-3 py-2 text-right font-medium text-red-600">{formatVND(o.debt)}</td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Footer actions */}
                              <div className="flex justify-end gap-2 mt-4 pt-3 border-t">
                                <Button size="sm" variant="outline" onClick={e => openEdit(c, e)}>
                                  <Edit size={13} className="mr-1" /> Chỉnh sửa
                                </Button>
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
                Hiển thị {start.toLocaleString()}–{end.toLocaleString()} / {total.toLocaleString()} khách hàng
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
                  <ChevronRight size={14} />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog thêm/sửa khách hàng */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editCustomer ? 'Sửa khách hàng' : 'Thêm khách hàng'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Mã khách hàng *</Label>
                <Input value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value }))} placeholder="KH001" required />
              </div>
              <div className="space-y-1.5">
                <Label>Họ tên *</Label>
                <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Nguyễn Văn A" required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Điện thoại *</Label>
                <Input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="0901234567" required />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Địa chỉ</Label>
              <Input value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Huỷ</Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 size={14} className="animate-spin mr-1" />}
                {editCustomer ? 'Lưu' : 'Thêm'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
