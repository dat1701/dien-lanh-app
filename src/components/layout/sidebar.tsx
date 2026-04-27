'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Package, ShoppingCart, Users, Truck,
  BarChart3, Shield, Warehouse, Snowflake, LogOut, Menu, X,
  ChevronDown, ChevronRight, RotateCcw, ClipboardList,
  AlertTriangle, ArrowLeftRight, Wrench, Wallet, Settings,
  FileText,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface NavItem {
  href: string
  label: string
  icon: any
}

interface NavGroup {
  label: string
  icon: any
  items: NavItem[]
}

const navGroups: (NavItem | NavGroup)[] = [
  { href: '/dashboard', label: 'Tổng quan', icon: LayoutDashboard },
  {
    label: 'Đơn hàng',
    icon: ShoppingCart,
    items: [
      { href: '/sales', label: 'Bán hàng', icon: ShoppingCart },
      { href: '/orders', label: 'Hóa đơn', icon: FileText },
      { href: '/returns', label: 'Trả hàng', icon: RotateCcw },
      { href: '/repairs', label: 'Yêu cầu sửa chữa', icon: Wrench },
    ],
  },
  {
    label: 'Hàng hóa',
    icon: Package,
    items: [
      { href: '/products', label: 'Danh sách hàng hóa', icon: Package },
      { href: '/warranty', label: 'Bảo hành, bảo trì', icon: Shield },
    ],
  },
  {
    label: 'Kho hàng',
    icon: Warehouse,
    items: [
      { href: '/inventory', label: 'Nhập / Xuất kho', icon: Warehouse },
      { href: '/stock-takes', label: 'Kiểm kho', icon: ClipboardList },
      { href: '/damage-exports', label: 'Xuất hủy', icon: AlertTriangle },
    ],
  },
  {
    label: 'Mua hàng',
    icon: Truck,
    items: [
      { href: '/purchase-orders', label: 'Nhập hàng', icon: ArrowLeftRight },
      { href: '/suppliers', label: 'Nhà cung cấp', icon: Truck },
    ],
  },
  { href: '/customers', label: 'Khách hàng', icon: Users },
  { href: '/cash-flow', label: 'Sổ quỹ', icon: Wallet },
  { href: '/reports', label: 'Báo cáo', icon: BarChart3 },
  { href: '/settings', label: 'Thiết lập', icon: Settings },
]

function isGroup(item: any): item is NavGroup {
  return 'items' in item
}

function NavGroupItem({ group, pathname, onNavigate }: {
  group: NavGroup
  pathname: string
  onNavigate: () => void
}) {
  const isActive = group.items.some(i => pathname.startsWith(i.href))
  const [open, setOpen] = useState(isActive)
  const Icon = group.icon

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium w-full transition-colors',
          isActive ? 'text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
        )}
      >
        <Icon size={18} />
        <span className="flex-1 text-left">{group.label}</span>
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      </button>
      {open && (
        <div className="ml-4 mt-0.5 space-y-0.5 border-l border-slate-700 pl-3">
          {group.items.map(({ href, label, icon: SubIcon }) => (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              className={cn(
                'flex items-center gap-2.5 px-2 py-2 rounded-lg text-xs font-medium transition-colors',
                pathname.startsWith(href)
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              )}
            >
              <SubIcon size={15} />
              {label}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

export function Sidebar() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <>
      <button
        className="fixed top-4 left-4 z-50 md:hidden bg-blue-600 text-white p-2 rounded-lg"
        onClick={() => setOpen(!open)}
      >
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setOpen(false)} />
      )}

      <aside className={cn(
        'fixed left-0 top-0 h-full w-64 bg-slate-900 text-white z-40 flex flex-col transition-transform duration-300',
        'md:translate-x-0',
        open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      )}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-700">
          <div className="bg-blue-500 p-2 rounded-lg">
            <Snowflake size={22} />
          </div>
          <div>
            <p className="font-bold text-sm leading-tight">Quản lý kho</p>
            <p className="text-xs text-slate-400">Điện lạnh</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navGroups.map((item, i) =>
            isGroup(item) ? (
              <NavGroupItem
                key={i}
                group={item}
                pathname={pathname}
                onNavigate={() => setOpen(false)}
              />
            ) : (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  pathname.startsWith(item.href)
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                )}
              >
                <item.icon size={18} />
                {item.label}
              </Link>
            )
          )}
        </nav>

        {/* Logout */}
        <div className="px-3 py-4 border-t border-slate-700">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white w-full"
          >
            <LogOut size={18} />
            Đăng xuất
          </button>
        </div>
      </aside>
    </>
  )
}
