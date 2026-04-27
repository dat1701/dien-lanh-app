'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, Search, Edit, Truck } from 'lucide-react'
import { formatVND, formatDate } from '@/lib/format'
import { Supplier } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'

export function SuppliersClient({ initialSuppliers }: { initialSuppliers: Supplier[] }) {
  const [suppliers, setSuppliers] = useState(initialSuppliers)
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editSupplier, setEditSupplier] = useState<Supplier | null>(null)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const [form, setForm] = useState({ code: '', name: '', phone: '', email: '', address: '', contact_person: '' })

  function openNew() {
    setEditSupplier(null)
    setForm({ code: '', name: '', phone: '', email: '', address: '', contact_person: '' })
    setDialogOpen(true)
  }

  function openEdit(s: Supplier) {
    setEditSupplier(s)
    setForm({
      code: s.code, name: s.name, phone: s.phone,
      email: s.email || '', address: s.address || '', contact_person: s.contact_person || ''
    })
    setDialogOpen(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const payload = {
      code: form.code.trim(),
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim() || null,
      address: form.address.trim() || null,
      contact_person: form.contact_person.trim() || null,
    }

    if (editSupplier) {
      const { data } = await supabase.from('suppliers').update(payload).eq('id', editSupplier.id).select().single()
      if (data) setSuppliers(prev => prev.map(s => s.id === data.id ? data as Supplier : s))
    } else {
      const { data } = await supabase.from('suppliers').insert(payload).select().single()
      if (data) setSuppliers(prev => [data as Supplier, ...prev])
    }
    setLoading(false)
    setDialogOpen(false)
  }

  const filtered = suppliers.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.phone.includes(search) ||
    s.code.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Nhà cung cấp</h1>
          <p className="text-slate-500 text-sm mt-0.5">{suppliers.length} nhà cung cấp</p>
        </div>
        <Button onClick={openNew}><Plus size={16} className="mr-1" /> Thêm NCC</Button>
      </div>

      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <Input placeholder="Tìm theo tên, SĐT, mã..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr className="text-slate-500 text-xs">
                  <th className="text-left px-4 py-3 font-medium">Mã / Tên</th>
                  <th className="text-left px-4 py-3 font-medium">Điện thoại</th>
                  <th className="text-left px-4 py-3 font-medium">Người liên hệ</th>
                  <th className="text-left px-4 py-3 font-medium">Địa chỉ</th>
                  <th className="text-right px-4 py-3 font-medium">Công nợ</th>
                  <th className="text-left px-4 py-3 font-medium">Ngày tạo</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-400">
                      <Truck size={40} className="mx-auto mb-2 opacity-30" />
                      Không tìm thấy nhà cung cấp
                    </td>
                  </tr>
                ) : (
                  filtered.map(s => (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <p className="font-mono text-xs text-slate-400">{s.code}</p>
                        <p className="font-medium text-slate-800">{s.name}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{s.phone}</td>
                      <td className="px-4 py-3 text-slate-600">{s.contact_person || '—'}</td>
                      <td className="px-4 py-3 text-slate-400 text-xs max-w-xs truncate">{s.address || '—'}</td>
                      <td className="px-4 py-3 text-right">
                        {s.debt > 0 ? (
                          <span className="text-red-600 font-medium">{formatVND(s.debt)}</span>
                        ) : (
                          <span className="text-green-600 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs">{formatDate(s.created_at)}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => openEdit(s)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded">
                          <Edit size={15} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editSupplier ? 'Sửa nhà cung cấp' : 'Thêm nhà cung cấp'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Mã NCC *</Label>
                <Input value={form.code} onChange={e => setForm(p => ({...p, code: e.target.value}))} placeholder="NCC001" required />
              </div>
              <div className="space-y-1.5">
                <Label>Tên công ty *</Label>
                <Input value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} placeholder="Công ty ABC" required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Điện thoại *</Label>
                <Input value={form.phone} onChange={e => setForm(p => ({...p, phone: e.target.value}))} placeholder="0901234567" required />
              </div>
              <div className="space-y-1.5">
                <Label>Người liên hệ</Label>
                <Input value={form.contact_person} onChange={e => setForm(p => ({...p, contact_person: e.target.value}))} placeholder="Anh Minh" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={e => setForm(p => ({...p, email: e.target.value}))} />
            </div>
            <div className="space-y-1.5">
              <Label>Địa chỉ</Label>
              <Input value={form.address} onChange={e => setForm(p => ({...p, address: e.target.value}))} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Huỷ</Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 size={14} className="animate-spin mr-1" />}
                {editSupplier ? 'Lưu' : 'Thêm'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
