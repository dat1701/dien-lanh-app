import { createClient } from '@/lib/supabase/server'
import { SalesClient } from './sales-client'

export default async function SalesPage() {
  const supabase = await createClient()

  const [{ data: products }, { data: customers }] = await Promise.all([
    supabase
      .from('products')
      .select('id, code, name, sell_price, stock_quantity, warranty_months, category, brand')
      .eq('is_active', true)
      .gt('stock_quantity', 0)
      .order('name'),
    supabase
      .from('customers')
      .select('id, code, name, phone')
      .eq('is_active', true)
      .order('name'),
  ])

  return <SalesClient products={products || []} customers={customers || []} />
}
