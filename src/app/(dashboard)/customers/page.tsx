import { createClient } from '@/lib/supabase/server'
import { CustomersClient } from './customers-client'

const PAGE_SIZE = 50

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>
}) {
  const { page: pageStr, q = '' } = await searchParams
  const page = Math.max(1, Number(pageStr) || 1)
  const from = (page - 1) * PAGE_SIZE
  const supabase = await createClient()

  let query = supabase
    .from('customers')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, from + PAGE_SIZE - 1)

  if (q) {
    query = query.or(`name.ilike.%${q}%,phone.ilike.%${q}%,code.ilike.%${q}%`)
  }

  const { data: customers, count } = await query

  const totalPages = Math.ceil((count || 0) / PAGE_SIZE)

  return (
    <CustomersClient
      initialCustomers={customers || []}
      total={count || 0}
      page={page}
      totalPages={totalPages}
      pageSize={PAGE_SIZE}
      initialSearch={q}
    />
  )
}
