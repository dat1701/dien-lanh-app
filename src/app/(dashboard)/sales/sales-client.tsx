'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import {
  Search, Plus, Minus, Trash2, ShoppingCart, CheckCircle, Loader2,
  X, Zap, Package, Truck, ChevronDown, User, MapPin
} from 'lucide-react'
import { formatVND, CATEGORY_LABELS } from '@/lib/format'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface CartItem {
  product_id: string
  product_code: string
  name: string
  sell_price: number
  quantity: number
  discount: number
  warranty_months: number
  serial_number: string
}

interface Product {
  id: string
  code: string
  name: string
  sell_price: number
  stock_quantity: number
  warranty_months: number
  category: string
  brand: string
}

interface Customer {
  id: string
  code: string
  name: string
  phone: string
}

type OrderMode = 'ban_nhanh' | 'ban_thuong' | 'ban_giao_hang'

interface TabState {
  id: string
  label: string
  mode: OrderMode
  cart: CartItem[]
  selectedCustomer: Customer | null
  customerName: string
  customerPhone: string
  customerAddress: string
  paymentMethod: string
  paid: string
  discount: string
  note: string
  success: boolean
  loading: boolean
}

const MODES: { value: OrderMode; label: string; icon: any; color: string }[] = [
  { value: 'ban_nhanh', label: 'Bán nhanh', icon: Zap, color: 'text-yellow-600' },
  { value: 'ban_thuong', label: 'Bán thường', icon: Package, color: 'text-blue-600' },
  { value: 'ban_giao_hang', label: 'Giao hàng', icon: Truck, color: 'text-green-600' },
]

let tabCounter = 1

function createTab(mode: OrderMode = 'ban_thuong'): TabState {
  return {
    id: `tab-${Date.now()}-${tabCounter++}`,
    label: `Đơn ${tabCounter - 1}`,
    mode,
    cart: [],
    selectedCustomer: null,
    customerName: '',
    customerPhone: '',
    customerAddress: '',
    paymentMethod: 'tien_mat',
    paid: '',
    discount: '0',
    note: '',
    success: false,
    loading: false,
  }
}

export function SalesClient({ products, customers }: { products: Product[]; customers: Customer[] }) {
  const supabase = createClient()
  const router = useRouter()

  const [tabs, setTabs] = useState<TabState[]>([createTab()])
  const [activeTabId, setActiveTabId] = useState(tabs[0].id)
  const [productSearch, setProductSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [customerSearch, setCustomerSearch] = useState('')
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)

  const activeTab = tabs.find(t => t.id === activeTabId)!

  function updateTab(id: string, patch: Partial<TabState>) {
    setTabs(prev => prev.map(t => t.id === id ? { ...t, ...patch } : t))
  }

  function addTab() {
    const newTab = createTab()
    setTabs(prev => [...prev, newTab])
    setActiveTabId(newTab.id)
    setCustomerSearch('')
  }

  function closeTab(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    setTabs(prev => {
      const next = prev.filter(t => t.id !== id)
      if (next.length === 0) {
        const fresh = createTab()
        setActiveTabId(fresh.id)
        return [fresh]
      }
      if (activeTabId === id) {
        setActiveTabId(next[next.length - 1].id)
      }
      return next
    })
  }

  function addToCart(product: Product) {
    const newCart = [...activeTab.cart]
    const idx = newCart.findIndex(i => i.product_id === product.id)
    if (idx >= 0) {
      newCart[idx] = { ...newCart[idx], quantity: newCart[idx].quantity + 1 }
    } else {
      newCart.push({
        product_id: product.id,
        product_code: product.code,
        name: product.name,
        sell_price: product.sell_price,
        quantity: 1,
        discount: 0,
        warranty_months: product.warranty_months,
        serial_number: '',
      })
    }
    updateTab(activeTab.id, { cart: newCart })
  }

  function updateQty(product_id: string, delta: number) {
    updateTab(activeTab.id, {
      cart: activeTab.cart
        .map(i => i.product_id === product_id ? { ...i, quantity: i.quantity + delta } : i)
        .filter(i => i.quantity > 0),
    })
  }

  function removeItem(product_id: string) {
    updateTab(activeTab.id, { cart: activeTab.cart.filter(i => i.product_id !== product_id) })
  }

  function updateItemField(product_id: string, field: keyof CartItem, value: string | number) {
    updateTab(activeTab.id, {
      cart: activeTab.cart.map(i => i.product_id === product_id ? { ...i, [field]: value } : i),
    })
  }

  const subtotal = activeTab.cart.reduce((s, i) => s + i.sell_price * i.quantity - i.discount, 0)
  const totalDiscount = Number(activeTab.discount) || 0
  const total = subtotal - totalDiscount
  const paidAmount = Number(activeTab.paid) || 0
  const debt = total - paidAmount

  const filteredProducts = products.filter(p => {
    const matchSearch = !productSearch ||
      p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.code.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.brand.toLowerCase().includes(productSearch.toLowerCase())
    const matchCat = categoryFilter === 'all' || p.category === categoryFilter
    return matchSearch && matchCat
  })

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.phone.includes(customerSearch)
  )

  const categories = ['all', ...Array.from(new Set(products.map(p => p.category)))]

  async function handleCheckout() {
    if (activeTab.cart.length === 0) return
    updateTab(activeTab.id, { loading: true })

    const code = 'DH' + Date.now().toString().slice(-8)
    const { data: order, error } = await supabase
      .from('orders')
      .insert({
        code,
        customer_id: activeTab.selectedCustomer?.id || null,
        customer_name: activeTab.selectedCustomer?.name || activeTab.customerName || 'Khách lẻ',
        customer_phone: activeTab.selectedCustomer?.phone || activeTab.customerPhone || '',
        status: 'hoan_thanh',
        payment_method: activeTab.paymentMethod,
        subtotal,
        discount: totalDiscount,
        total,
        paid: paidAmount,
        debt: Math.max(0, debt),
        note: activeTab.note || null,
      })
      .select()
      .single()

    if (error || !order) { updateTab(activeTab.id, { loading: false }); return }

    await supabase.from('order_items').insert(
      activeTab.cart.map(i => ({
        order_id: order.id,
        product_id: i.product_id,
        product_code: i.product_code,
        product_name: i.name,
        quantity: i.quantity,
        sell_price: i.sell_price,
        discount: i.discount,
        serial_number: i.serial_number || null,
        warranty_months: i.warranty_months,
      }))
    )

    for (const item of activeTab.cart) {
      await supabase.from('stock_transactions').insert({
        product_id: item.product_id,
        type: 'xuat',
        quantity: item.quantity,
        price: item.sell_price,
        order_id: order.id,
        note: `Bán hàng đơn ${code}`,
      })
    }

    if (activeTab.selectedCustomer) {
      await supabase.rpc('update_customer_stats', {
        p_customer_id: activeTab.selectedCustomer.id,
        p_amount: total,
        p_debt: Math.max(0, debt),
      }).maybeSingle()
    }

    updateTab(activeTab.id, { success: true, loading: false })
    setTimeout(() => {
      updateTab(activeTab.id, {
        cart: [], selectedCustomer: null, customerName: '', customerPhone: '',
        customerAddress: '', paid: '', discount: '0', note: '', success: false,
        label: `Đơn ${tabCounter}`,
      })
      router.refresh()
    }, 1800)
  }

  if (activeTab.success) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <CheckCircle size={64} className="text-green-500" />
        <h2 className="text-2xl font-bold text-slate-800">Thanh toán thành công!</h2>
        <p className="text-slate-500">Đơn hàng đã được tạo</p>
      </div>
    )
  }

  const modeInfo = MODES.find(m => m.value === activeTab.mode)!

  return (
    <div className="flex flex-col h-full space-y-0">
      {/* Tab bar */}
      <div className="flex items-center border-b bg-white overflow-x-auto">
        <div className="flex items-center min-w-0">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTabId(tab.id); setCustomerSearch(tab.selectedCustomer?.name || '') }}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-r whitespace-nowrap transition-colors ${tab.id === activeTabId ? 'bg-blue-50 text-blue-700 border-b-2 border-b-blue-500' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}
            >
              <ShoppingCart size={13} />
              <span>{tab.label}</span>
              {tab.cart.length > 0 && (
                <span className="bg-blue-100 text-blue-700 text-xs rounded-full w-4 h-4 flex items-center justify-center leading-none">
                  {tab.cart.length}
                </span>
              )}
              {tabs.length > 1 && (
                <X size={12} className="text-slate-400 hover:text-red-500 ml-0.5" onClick={e => closeTab(tab.id, e)} />
              )}
            </button>
          ))}
        </div>
        <button
          onClick={addTab}
          className="px-3 py-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors flex-shrink-0"
          title="Thêm đơn mới"
        >
          <Plus size={16} />
        </button>
      </div>

      {/* Mode selector */}
      <div className="flex items-center gap-1 px-4 py-2 bg-white border-b">
        <span className="text-xs text-slate-400 mr-2">Chế độ:</span>
        {MODES.map(m => {
          const Icon = m.icon
          return (
            <button key={m.value}
              onClick={() => updateTab(activeTab.id, { mode: m.value })}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${activeTab.mode === m.value ? 'bg-blue-100 text-blue-700' : 'text-slate-500 hover:bg-slate-100'}`}>
              <Icon size={13} className={activeTab.mode === m.value ? m.color : ''} />
              {m.label}
            </button>
          )
        })}
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-0 flex-1">
        {/* LEFT: Product search + grid */}
        <div className="lg:col-span-3 border-r flex flex-col bg-white">
          <div className="p-4 space-y-3 border-b">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Tìm sản phẩm (tên, mã, hãng)..."
                value={productSearch}
                onChange={e => setProductSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            {/* Category filter pills */}
            <div className="flex gap-1.5 overflow-x-auto pb-0.5">
              {categories.map(cat => (
                <button key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${categoryFilter === cat ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                  {cat === 'all' ? 'Tất cả' : CATEGORY_LABELS[cat] || cat}
                </button>
              ))}
            </div>
          </div>

          {/* Product grid */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {filteredProducts.map(p => (
                <button
                  key={p.id}
                  onClick={() => addToCart(p)}
                  disabled={p.stock_quantity === 0}
                  className={`text-left p-3 border rounded-xl transition-all relative ${p.stock_quantity === 0 ? 'opacity-40 cursor-not-allowed bg-slate-50' : 'bg-white hover:border-blue-400 hover:shadow-sm active:scale-[0.98]'}`}
                >
                  {activeTab.cart.find(i => i.product_id === p.id) && (
                    <span className="absolute top-1.5 right-1.5 bg-blue-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center leading-none font-bold">
                      {activeTab.cart.find(i => i.product_id === p.id)?.quantity}
                    </span>
                  )}
                  <p className="font-mono text-xs text-slate-400 truncate">{p.code}</p>
                  <p className="font-medium text-slate-800 text-sm leading-tight mt-0.5 line-clamp-2">{p.name}</p>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-blue-600 font-bold text-sm">{formatVND(p.sell_price)}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${p.stock_quantity <= 2 ? 'bg-orange-50 text-orange-600' : 'bg-green-50 text-green-600'}`}>
                      {p.stock_quantity}
                    </span>
                  </div>
                </button>
              ))}
              {filteredProducts.length === 0 && (
                <div className="col-span-3 py-12 text-center text-slate-400">
                  <Package size={32} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Không tìm thấy sản phẩm</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT: Cart + customer + payment */}
        <div className="lg:col-span-2 flex flex-col bg-slate-50">
          {/* Customer section */}
          <div className="bg-white border-b p-3 space-y-2">
            <div className="flex items-center gap-2">
              <User size={14} className="text-slate-400" />
              <span className="text-xs font-medium text-slate-600 uppercase tracking-wide">Khách hàng</span>
            </div>
            <div className="relative">
              <Input
                placeholder="Tìm khách hàng..."
                value={customerSearch}
                onChange={e => { setCustomerSearch(e.target.value); updateTab(activeTab.id, { selectedCustomer: null }); setShowCustomerDropdown(true) }}
                onFocus={() => setShowCustomerDropdown(true)}
                className="h-8 text-sm"
              />
              {showCustomerDropdown && customerSearch && !activeTab.selectedCustomer && (
                <div className="absolute top-full left-0 right-0 bg-white border rounded-lg shadow-lg z-20 max-h-36 overflow-y-auto">
                  {filteredCustomers.slice(0, 8).map(c => (
                    <button key={c.id} type="button"
                      onClick={() => { updateTab(activeTab.id, { selectedCustomer: c, customerPhone: c.phone }); setCustomerSearch(c.name); setShowCustomerDropdown(false) }}
                      className="w-full text-left px-3 py-2 hover:bg-slate-50 text-sm flex justify-between">
                      <span className="font-medium">{c.name}</span>
                      <span className="text-slate-400 text-xs">{c.phone}</span>
                    </button>
                  ))}
                  {filteredCustomers.length === 0 && (
                    <div className="px-3 py-2 text-xs text-slate-400">Không tìm thấy khách hàng</div>
                  )}
                </div>
              )}
            </div>

            {/* If no customer selected, show inline fields */}
            {!activeTab.selectedCustomer && (
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Tên khách lẻ" value={activeTab.customerName}
                  onChange={e => updateTab(activeTab.id, { customerName: e.target.value })}
                  className="h-7 text-xs" />
                <Input placeholder="SĐT" value={activeTab.customerPhone}
                  onChange={e => updateTab(activeTab.id, { customerPhone: e.target.value })}
                  className="h-7 text-xs" />
              </div>
            )}

            {/* Delivery address for giao hang mode */}
            {activeTab.mode === 'ban_giao_hang' && (
              <div className="flex items-center gap-1.5">
                <MapPin size={13} className="text-slate-400 flex-shrink-0" />
                <Input placeholder="Địa chỉ giao hàng..." value={activeTab.customerAddress}
                  onChange={e => updateTab(activeTab.id, { customerAddress: e.target.value })}
                  className="h-7 text-xs flex-1" />
              </div>
            )}
          </div>

          {/* Cart items */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
            {activeTab.cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2 py-12">
                <ShoppingCart size={32} className="opacity-30" />
                <p className="text-sm">Chọn sản phẩm để thêm vào đơn</p>
              </div>
            ) : activeTab.cart.map(item => (
              <div key={item.product_id} className="bg-white border rounded-lg p-2.5">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-xs text-slate-400">{item.product_code}</p>
                    <p className="text-sm font-medium text-slate-800 leading-tight">{item.name}</p>
                  </div>
                  <button onClick={() => removeItem(item.product_id)} className="text-slate-300 hover:text-red-500 flex-shrink-0 mt-0.5">
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center border rounded overflow-hidden">
                    <button className="px-2 py-1 hover:bg-slate-100 text-slate-600" onClick={() => updateQty(item.product_id, -1)}>
                      <Minus size={11} />
                    </button>
                    <span className="px-2.5 text-sm font-medium">{item.quantity}</span>
                    <button className="px-2 py-1 hover:bg-slate-100 text-slate-600" onClick={() => updateQty(item.product_id, 1)}>
                      <Plus size={11} />
                    </button>
                  </div>
                  <Input
                    type="number"
                    value={item.sell_price}
                    onChange={e => updateItemField(item.product_id, 'sell_price', Number(e.target.value))}
                    className="w-28 h-7 text-xs text-right font-medium text-blue-600"
                  />
                  <span className="text-sm font-bold text-slate-700 flex-1 text-right">
                    {formatVND(item.sell_price * item.quantity)}
                  </span>
                </div>
                {activeTab.mode !== 'ban_nhanh' && (
                  <Input
                    placeholder="Số serial..."
                    value={item.serial_number}
                    onChange={e => updateItemField(item.product_id, 'serial_number', e.target.value)}
                    className="h-6 text-xs mt-1.5 border-dashed"
                  />
                )}
              </div>
            ))}
          </div>

          {/* Payment section */}
          <div className="bg-white border-t p-3 space-y-2.5">
            {/* Subtotals */}
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-slate-500">
                <span>Tổng tiền hàng ({activeTab.cart.reduce((s, i) => s + i.quantity, 0)} SP)</span>
                <span>{formatVND(subtotal)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-500 flex-1">Chiết khấu (đ)</span>
                <Input type="number" value={activeTab.discount}
                  onChange={e => updateTab(activeTab.id, { discount: e.target.value })}
                  className="w-28 h-7 text-xs text-right" />
              </div>
              <div className="flex justify-between font-bold text-base border-t pt-1.5">
                <span>Thành tiền</span>
                <span className="text-blue-600">{formatVND(total)}</span>
              </div>
            </div>

            {/* Payment method */}
            <div className="grid grid-cols-4 gap-1">
              {[
                { v: 'tien_mat', l: 'Tiền mặt' },
                { v: 'chuyen_khoan', l: 'CK' },
                { v: 'the', l: 'Thẻ' },
                { v: 'cong_no', l: 'Nợ' },
              ].map(({ v, l }) => (
                <button key={v}
                  onClick={() => updateTab(activeTab.id, { paymentMethod: v })}
                  className={`py-1.5 rounded-lg text-xs font-medium transition-colors border ${activeTab.paymentMethod === v ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'}`}>
                  {l}
                </button>
              ))}
            </div>

            {/* Paid + debt */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500 flex-shrink-0">Khách trả</span>
              <Input type="number" value={activeTab.paid}
                onChange={e => updateTab(activeTab.id, { paid: e.target.value })}
                placeholder={String(total)}
                className="flex-1 h-8 text-sm text-right font-medium" />
            </div>

            {paidAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">{debt > 0 ? 'Còn nợ' : 'Tiền thừa'}</span>
                <span className={`font-semibold ${debt > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {formatVND(Math.abs(debt))}
                </span>
              </div>
            )}

            {/* Note */}
            {activeTab.mode !== 'ban_nhanh' && (
              <Input placeholder="Ghi chú đơn hàng..." value={activeTab.note}
                onChange={e => updateTab(activeTab.id, { note: e.target.value })}
                className="h-7 text-xs" />
            )}

            {/* Checkout button */}
            <Button
              className="w-full h-10 font-semibold"
              onClick={handleCheckout}
              disabled={activeTab.loading || activeTab.cart.length === 0}
            >
              {activeTab.loading ? (
                <><Loader2 size={16} className="animate-spin mr-2" /> Đang xử lý...</>
              ) : (
                <>Thanh toán {activeTab.cart.length > 0 ? formatVND(total) : ''}</>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
