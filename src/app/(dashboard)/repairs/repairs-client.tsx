'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, Wrench, Loader2, Search, Edit } from 'lucide-react'
import { formatVND, formatDateTime } from '@/lib/format'
import { createClient } from '@/lib/supabase/client'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'

const STATUS = {
  dang_xu_ly: { label: 'Đang xử lý', color: 'bg-yellow-100 text-yellow-700' },
  hoan_thanh: { label: 'Hoàn thành', color: 'bg-green-100 text-green-700' },
  da_huy: { label: 'Đã hủy', color: 'bg-red-100 text-red-700' },
}

export function RepairsClient({ initialRepairs, customers }: any) {
  const [repairs, setRepairs] = useState(initialRepairs)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editRepair, setEditRepair] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [customerSearch, setCustomerSearch] = useState('')
  const supabase = createClient()

  const [form, setForm] = useState({
    customer_id: '', customer_name: '', customer_phone: '',
    product_name: '', serial_number: '', issue_description: '',
    cost: '', paid: '', note: '', status: 'dang_xu_ly',
  })

  const filtered = repairs.filter((r: any) => {
    const matchSearch = r.code.toLowerCase().includes(search.toLowerCase()) ||
      r.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      r.product_name.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || r.status === statusFilter
    return matchSearch && matchStatus
  })

  const filteredCustomers = customers.filter((c: any) =>
    c.name.toLowerCase().includes(customerSearch.toLowerCase()) || c.phone.includes(customerSearch)
  )

  function openNew() {
    setEditRepair(null)
    setForm({ customer_id: '', customer_name: '', customer_phone: '', product_name: '', serial_number: '', issue_description: '', cost: '', paid: '', note: '', status: 'dang_xu_ly' })
    setCustomerSearch('')
    setDialogOpen(true)
  }

  function openEdit(r: any) {
    setEditRepair(r)
    setForm({ customer_id: r.customer_id || '', customer_name: r.customer_name, customer_phone: r.customer_phone, product_name: r.product_name, serial_number: r.serial_number || '', issue_description: r.issue_description || '', cost: String(r.cost), paid: String(r.paid), note: r.note || '', status: r.status })
    setCustomerSearch(r.customer_name)
    setDialogOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const payload = {
      customer_id: form.customer_id || null,
      customer_name: form.customer_name,
      customer_phone: form.customer_phone,
      product_name: form.product_name,
      serial_number: form.serial_number || null,
      issue_description: form.issue_description || null,
      cost: Number(form.cost) || 0,
      paid: Number(form.paid) || 0,
      note: form.note || null,
      status: form.status,
    }

    if (editRepair) {
      const { data } = await supabase.from('repair_requests').update(payload).eq('id', editRepair.id).select('*, customer:customers(name,phone)').single()
      if (data) setRepairs((prev: any) => prev.map((r: any) => r.id === data.id ? data : r))
    } else {
      const code = 'SC' + Date.now().toString().slice(-8)
      const { data } = await supabase.from('repair_requests').insert({ ...payload, code }).select('*, customer:customers(name,phone)').single()
      if (data) setRepairs((prev: any) => [data, ...prev])
    }
    setLoading(false)
    setDialogOpen(false)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Yêu cầu sửa chữa</h1>
          <p className="text-slate-500 text-sm mt-0.5">{repairs.length} yêu cầu</p>
        </div>
        <Button onClick={openNew}><Plus size={16} className="mr-1" /> Tạo yêu cầu</Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative max-w-sm flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input placeholder="Tìm mã, khách hàng, sản phẩm..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-2">
          {['all', 'dang_xu_ly', 'hoan_thanh', 'da_huy'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${statusFilter === s ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border hover:bg-slate-50'}`}>
              {s === 'all' ? 'Tất cả' : STATUS[s as keyof typeof STATUS]?.label}
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
                  <th className="text-left px-4 py-3 font-medium">Mã yêu cầu</th>
                  <th className="text-left px-4 py-3 font-medium">Khách hàng</th>
                  <th className="text-left px-4 py-3 font-medium">Sản phẩm / Serial</th>
                  <th className="text-left px-4 py-3 font-medium">Mô tả lỗi</th>
                  <th className="text-right px-4 py-3 font-medium">Chi phí</th>
                  <th className="text-right px-4 py-3 font-medium">Đã trả</th>
                  <th className="text-center px-4 py-3 font-medium">Trạng thái</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-12 text-slate-400"><Wrench size={40} className="mx-auto mb-2 opacity-30" />Chưa có yêu cầu sửa chữa</td></tr>
                ) : filtered.map((r: any) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono font-medium text-blue-600">{r.code}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{r.customer_name}</p>
                      <p className="text-xs text-slate-400">{r.customer_phone}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-slate-800">{r.product_name}</p>
                      {r.serial_number && <p className="text-xs text-slate-400 font-mono">{r.serial_number}</p>}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs max-w-xs truncate">{r.issue_description || '—'}</td>
                    <td className="px-4 py-3 text-right font-medium">{formatVND(r.cost)}</td>
                    <td className="px-4 py-3 text-right">
                      {r.paid >= r.cost ? <span className="text-green-600 text-xs">Đã TT</span> : <span className="text-orange-500">{formatVND(r.paid)}</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS[r.status as keyof typeof STATUS]?.color}`}>
                        {STATUS[r.status as keyof typeof STATUS]?.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => openEdit(r)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"><Edit size={15} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editRepair ? 'Cập nhật yêu cầu' : 'Tạo yêu cầu sửa chữa'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3 mt-2">
            <div className="space-y-1.5">
              <Label>Khách hàng</Label>
              <div className="relative">
                <Input placeholder="Tìm khách hàng..." value={customerSearch}
                  onChange={e => { setCustomerSearch(e.target.value); setForm(p => ({ ...p, customer_id: '', customer_name: e.target.value })) }} />
                {customerSearch && !form.customer_id && (
                  <div className="absolute top-full left-0 right-0 bg-white border rounded-lg shadow-lg z-10 max-h-36 overflow-y-auto">
                    {filteredCustomers.slice(0, 6).map((c: any) => (
                      <button key={c.id} type="button" onClick={() => { setForm(p => ({ ...p, customer_id: c.id, customer_name: c.name, customer_phone: c.phone })); setCustomerSearch(c.name) }}
                        className="w-full text-left px-3 py-2 hover:bg-slate-50 text-sm flex justify-between">
                        <span>{c.name}</span><span className="text-slate-400">{c.phone}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Điện thoại *</Label>
                <Input value={form.customer_phone} onChange={e => setForm(p => ({ ...p, customer_phone: e.target.value }))} required />
              </div>
              <div className="space-y-1.5">
                <Label>Trạng thái</Label>
                <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))} className="w-full border rounded-md px-3 py-2 text-sm bg-white">
                  {Object.entries(STATUS).map(([v, { label }]) => <option key={v} value={v}>{label}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Sản phẩm *</Label>
                <Input value={form.product_name} onChange={e => setForm(p => ({ ...p, product_name: e.target.value }))} placeholder="Tên máy..." required />
              </div>
              <div className="space-y-1.5">
                <Label>Serial / IMEI</Label>
                <Input value={form.serial_number} onChange={e => setForm(p => ({ ...p, serial_number: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Mô tả lỗi</Label>
              <textarea value={form.issue_description} onChange={e => setForm(p => ({ ...p, issue_description: e.target.value }))}
                rows={2} className="w-full border rounded-md px-3 py-2 text-sm resize-none" placeholder="Mô tả vấn đề..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Chi phí sửa (đ)</Label>
                <Input type="number" value={form.cost} onChange={e => setForm(p => ({ ...p, cost: e.target.value }))} placeholder="0" />
              </div>
              <div className="space-y-1.5">
                <Label>Đã thu (đ)</Label>
                <Input type="number" value={form.paid} onChange={e => setForm(p => ({ ...p, paid: e.target.value }))} placeholder="0" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Ghi chú</Label>
              <Input value={form.note} onChange={e => setForm(p => ({ ...p, note: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Huỷ</Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 size={14} className="animate-spin mr-1" />}
                {editRepair ? 'Lưu' : 'Tạo yêu cầu'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
