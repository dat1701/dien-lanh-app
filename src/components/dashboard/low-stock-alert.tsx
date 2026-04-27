import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle } from 'lucide-react'
import Link from 'next/link'

interface Item {
  id: string
  name: string
  stock_quantity: number
  min_stock: number
}

export function LowStockAlert({ items }: { items: Item[] }) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle size={16} className="text-orange-500" />
          Sắp hết hàng
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-8">Tất cả hàng hoá đủ tồn kho</p>
        ) : (
          <div className="space-y-3">
            {items.map(item => (
              <div key={item.id} className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{item.name}</p>
                  <p className="text-xs text-slate-400">Tối thiểu: {item.min_stock}</p>
                </div>
                <span
                  className={`text-sm font-bold ml-2 ${
                    item.stock_quantity === 0
                      ? 'text-red-600'
                      : 'text-orange-500'
                  }`}
                >
                  {item.stock_quantity}
                </span>
              </div>
            ))}
            <Link
              href="/inventory"
              className="block text-center text-xs text-blue-600 hover:underline mt-2"
            >
              Xem tất cả →
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
