'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface DayRevenue {
  day: string
  revenue: number
}

function formatM(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(0)}tr`
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}k`
  return String(value)
}

export function RevenueChart() {
  const [data, setData] = useState<DayRevenue[]>([])
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const end = new Date()
      const start = new Date()
      start.setDate(start.getDate() - 29)

      const { data: orders } = await supabase
        .from('orders')
        .select('total, created_at')
        .gte('created_at', start.toISOString())
        .eq('status', 'hoan_thanh')

      const map: Record<string, number> = {}
      for (let i = 0; i < 30; i++) {
        const d = new Date(start)
        d.setDate(d.getDate() + i)
        map[d.toISOString().split('T')[0]] = 0
      }

      for (const o of orders || []) {
        const day = o.created_at.split('T')[0]
        if (map[day] !== undefined) map[day] += o.total || 0
      }

      setData(
        Object.entries(map).map(([day, revenue]) => ({
          day: day.slice(5),
          revenue,
        }))
      )
    }
    load()
  }, [])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Doanh thu 30 ngày qua</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
            <XAxis
              dataKey="day"
              tick={{ fontSize: 11 }}
              tickLine={false}
              interval={4}
            />
            <YAxis tickFormatter={formatM} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            <Tooltip
              formatter={(v) => [`${Number(v).toLocaleString('vi-VN')} đ`, 'Doanh thu']}
              labelStyle={{ fontSize: 12 }}
            />
            <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
