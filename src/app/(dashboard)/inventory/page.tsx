import { createClient } from '@/lib/supabase/server'
import { InventoryClient } from './inventory-client'

export default async function InventoryPage() {
  const supabase = await createClient()

  const [{ data: transactions }, { data: products }, { data: suppliers }] = await Promise.all([
    supabase
      .from('stock_transactions')
      .select('*, product:products(name, code), supplier:suppliers(name)')
      .order('created_at', { ascending: false })
      .limit(100),
    supabase.from('products').select('id, code, name, stock_quantity, min_stock').eq('is_active', true).order('name'),
    supabase.from('suppliers').select('id, name').eq('is_active', true),
  ])

  return (
    <InventoryClient
      initialTransactions={transactions || []}
      products={products || []}
      suppliers={suppliers || []}
    />
  )
}
