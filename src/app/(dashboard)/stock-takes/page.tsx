import { createClient } from '@/lib/supabase/server'
import { StockTakesClient } from './stock-takes-client'

export default async function StockTakesPage() {
  const supabase = await createClient()
  const [{ data: takes }, { data: products }] = await Promise.all([
    supabase.from('stock_takes').select('*').order('created_at', { ascending: false }).limit(50),
    supabase.from('products').select('id, code, name, stock_quantity').eq('is_active', true).order('name'),
  ])
  return <StockTakesClient initialTakes={takes || []} products={products || []} />
}
