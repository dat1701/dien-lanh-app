import { createClient } from '@/lib/supabase/server'
import { OrdersClient } from './orders-client'

const PAGE_SIZE = 50

export default async function OrdersPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const params = await searchParams
  const page = Math.max(1, Number(params.page) || 1)
  const q = params.q || ''
  const status = params.status || 'all'

  const supabase = await createClient()
  let query = supabase
    .from('orders')
    .select('*, customer:customers(name, phone)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)

  if (q) {
    query = query.or(`code.ilike.%${q}%,customer_name.ilike.%${q}%,customer_phone.ilike.%${q}%`)
  }
  if (status && status !== 'all') {
    query = query.eq('status', status)
  }

  const { data: orders, count } = await query
  const total = count || 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <OrdersClient
      initialOrders={orders || []}
      total={total}
      page={page}
      totalPages={totalPages}
      pageSize={PAGE_SIZE}
      initialSearch={q}
      initialStatus={status}
    />
  )
}
