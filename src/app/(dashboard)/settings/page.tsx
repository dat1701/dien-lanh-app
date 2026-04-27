import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Package, ShoppingCart, FileText, Users, Building, History } from 'lucide-react'

const sections = [
  {
    title: 'Quản lý',
    items: [
      { icon: Package, label: 'Hàng hóa', desc: 'Nhóm hàng, đơn vị tính, thuộc tính sản phẩm' },
      { icon: ShoppingCart, label: 'Đơn hàng', desc: 'Phí dịch vụ, phí giao hàng, thu khác' },
      { icon: FileText, label: 'Mẫu in', desc: 'Cấu hình mẫu hóa đơn, phiếu giao hàng, tem mã' },
    ],
  },
  {
    title: 'Cửa hàng',
    items: [
      { icon: Users, label: 'Quản lý người dùng', desc: 'Phân quyền tài khoản, vai trò nhân viên' },
      { icon: Building, label: 'Quản lý chi nhánh', desc: 'Thêm, sửa thông tin chi nhánh' },
    ],
  },
  {
    title: 'Dữ liệu',
    items: [
      { icon: History, label: 'Lịch sử thao tác', desc: 'Audit log toàn bộ hành động của người dùng' },
    ],
  },
]

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Thiết lập</h1>
        <p className="text-slate-500 text-sm mt-0.5">Cấu hình hệ thống</p>
      </div>

      {sections.map(section => (
        <div key={section.title} className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">{section.title}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {section.items.map(({ icon: Icon, label, desc }) => (
              <Card key={label} className="cursor-pointer hover:border-blue-300 hover:shadow-sm transition-all">
                <CardContent className="p-5 flex items-start gap-4">
                  <div className="bg-slate-100 p-2.5 rounded-lg flex-shrink-0">
                    <Icon size={20} className="text-slate-600" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-800">{label}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
