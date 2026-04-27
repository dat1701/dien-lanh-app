'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, Wallet, Loader2, TrendingUp, TrendingDown, DollarSign } from 'lucide-react'
import { formatVND, formatDateTime } from '@/lib/format'
import { createClient } from '@/lib/supabase/client'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'

const CATEGORIES_THU = ['Tiền bán hàng', 'Thu công nợ khách hàng', 'Thu khác']
const CATEGORIES_CHI = ['Trả tiền nhà cung cấp', 'Chi phí vận hành', 'Chi phí nhân sự', 'Chi khác']
const FUND_TYPES = { tien_mat: 'Tiền mặt', ngan_hang: 'Ngân hàng', vi_dien_tu: 'Ví điện tử' }
const STATUS_COLORS = { da_thanh_toan: 'bg-green-100 text-green-700', da_huy: 'bg-red-100 text-red-700' }

export function CashFlowClient({ initialTransactions, totalThu, totalChi }: any) {
  const [transactions, setTransactions] = useState(initialTransactions)
  const [typeFilter, setTypeFilter] = useState('all')
  const [fundFilter, setFundFilter] = useState('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogType, setDialogType] = useState<'thu' | 'chi'>('thu')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const [form, setForm] = useState({
    fund_type: 'tien_mat', category: '', amount: '', payer_receiver: '', account_number: '', note: '',
  })

  const filtered = transactions.filter((t: any) => {
    const matchType = typeFilter === 'all' || t.type === typeFilter
    const matchFund = fundFilter === 'all' || t.fund_type === fundFilter
    return matchType && matchFund
  })

  const totalTonQuy = totalThu - totalChi

  function openDialog(type: 'thu' | 'chi') {
    setDialogType(type)
    setForm({ fund_type: 'tien_mat', category: type === 'thu' ? CATEGORIES_THU[0] : CATEGORIES_CHI[0], amount: '', payer_receiver: '', account_number: '', note: '' })
    setDialogOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const code = (dialogType === 'thu' ? 'PT' : 'PC') + Date.now().toString().slice(-8)

    const { data } = await supabase.from('cash_transactions').insert({
      code,
      type: dialogType,
      fund_type: form.fund_type,
      category: form.category,
      amount: Number(form.amount) || 0,
      payer_receiver: form.payer_receiver || null,
      account_number: form.account_number || null,
      note: form.note || null,
      status: 'da_thanh_toan',
    }).select().single()

    if (data) setTransactions((prev: any) => [data, ...prev])
    setDialogOpen(false)
    setLoading(false)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Sổ quỹ</h1>
          <p className="text-slate-500 text-sm mt-0.5">Tháng này</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="text-green-600 border-green-200 hover:bg-green-50" onClick={() => openDialog('thu')}>
            <Plus size={16} className="mr-1" /> Phiếu thu
          </Button>
          <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => openDialog('chi')}>
            <Plus size={16} className="mr-1" /> Phiếu chi
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="bg-green-50 p-3 rounded-xl"><TrendingUp size={22} className="text-green-600" /></div>
            <div>
              <p className="text-sm text-slate-500">Tổng thu</p>
              <p className="text-xl font-bold text-green-600">{formatVND(totalThu)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="bg-red-50 p-3 rounded-xl"><TrendingDown size={22} className="text-red-600" /></div>
            <div>
              <p className="text-sm text-slate-500">Tổng chi</p>
              <p className="text-xl font-bold text-red-600">{formatVND(totalChi)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="bg-blue-50 p-3 rounded-xl"><DollarSign size={22} className="text-blue-600" /></div>
            <div>
              <p className="text-sm text-slate-500">Tồn quỹ</p>
              <p className={`text-xl font-bold ${totalTonQuy >= 0 ? 'text-blue-600' : 'text-red-600'}`}>{formatVND(totalTonQuy)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex gap-2">
          {['all', 'thu', 'chi'].map(t => (
            <button key={t} onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${typeFilter === t ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border hover:bg-slate-50'}`}>
              {t === 'all' ? 'Tất cả' : t === 'thu' ? 'Phiếu thu' : 'Phiếu chi'}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {['all', 'tien_mat', 'ngan_hang', 'vi_dien_tu'].map(f => (
            <button key={f} onClick={() => setFundFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${fundFilter === f ? 'bg-slate-700 text-white' : 'bg-white text-slate-600 border hover:bg-slate-50'}`}>
              {f === 'all' ? 'Tất cả quỹ' : FUND_TYPES[f as keyof typeof FUND_TYPES]}
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
                  <th className="text-left px-4 py-3 font-medium">Thời gian</th>
                  <th className="text-left px-4 py-3 font-medium">Loại thu chi</th>
                  <th className="text-left px-4 py-3 font-medium">Quỹ</th>
                  <th className="text-left px-4 py-3 font-medium">Người nộp/nhận</th>
                  <th className="text-right px-4 py-3 font-medium">Giá trị</th>
                  <th className="text-center px-4 py-3 font-medium">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-12 text-slate-400"><Wallet size={40} className="mx-auto mb-2 opacity-30" />Chưa có giao dịch nào</td></tr>
                ) : filtered.map((t: any) => (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono font-medium text-blue-600">{t.code}</td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{formatDateTime(t.created_at)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium mr-2 ${t.type === 'thu' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {t.type === 'thu' ? 'Thu' : 'Chi'}
                      </span>
                      <span className="text-slate-600">{t.category}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{FUND_TYPES[t.fund_type as keyof typeof FUND_TYPES]}</td>
                    <td className="px-4 py-3 text-slate-600">{t.payer_receiver || '—'}</td>
                    <td className={`px-4 py-3 text-right font-bold ${t.type === 'thu' ? 'text-green-600' : 'text-red-600'}`}>
                      {t.type === 'thu' ? '+' : '-'}{formatVND(t.amount)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[t.status as keyof typeof STATUS_COLORS]}`}>
                        {t.status === 'da_thanh_toan' ? 'Đã thanh toán' : 'Đã hủy'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{dialogType === 'thu' ? 'Tạo phiếu thu' : 'Tạo phiếu chi'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Loại quỹ</Label>
                <select value={form.fund_type} onChange={e => setForm(p => ({ ...p, fund_type: e.target.value }))} className="w-full border rounded-md px-3 py-2 text-sm bg-white">
                  {Object.entries(FUND_TYPES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Loại {dialogType === 'thu' ? 'thu' : 'chi'}</Label>
                <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} className="w-full border rounded-md px-3 py-2 text-sm bg-white">
                  {(dialogType === 'thu' ? CATEGORIES_THU : CATEGORIES_CHI).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Giá trị (đ) *</Label>
              <Input type="number" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} placeholder="0" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>{dialogType === 'thu' ? 'Người nộp' : 'Người nhận'}</Label>
                <Input value={form.payer_receiver} onChange={e => setForm(p => ({ ...p, payer_receiver: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Số tài khoản</Label>
                <Input value={form.account_number} onChange={e => setForm(p => ({ ...p, account_number: e.target.value }))} />
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
                {dialogType === 'thu' ? 'Tạo phiếu thu' : 'Tạo phiếu chi'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
