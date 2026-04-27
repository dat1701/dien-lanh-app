import { createClient } from '@/lib/supabase/server'
import { PurchaseOrdersClient } from './purchase-orders-client'

export default async function PurchaseOrdersPage() {
  const supabase = await createClient()
  const [{ data: orders }, { data: suppliers }, { data: products }] = await Promise.all([
    supabase
      .from('purchase_orders')
      .select('*, supplier:suppliers(name)')
      .order('created_at', { ascending: false })
      .limit(100),
    supabase.from('suppliers').select('id, name, code').eq('is_active', true).order('name'),
    supabase.from('products').select('id, code, name, cost_price').eq('is_active', true).order('name'),
  ])
  return <PurchaseOrdersClient initialOrders={orders || []} suppliers={suppliers || []} products={products || []} />
}
