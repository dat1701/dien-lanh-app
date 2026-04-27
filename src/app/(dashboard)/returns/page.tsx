import { createClient } from '@/lib/supabase/server'
import { ReturnsClient } from './returns-client'

export default async function ReturnsPage() {
  const supabase = await createClient()
  const [{ data: returns_ }, { data: orders }, { data: products }] = await Promise.all([
    supabase.from('return_orders').select('*, customer:customers(name,phone)').order('created_at', { ascending: false }).limit(100),
    supabase.from('orders').select('id, code, customer_name, customer_phone, customer_id').order('created_at', { ascending: false }).limit(500),
    supabase.from('products').select('id, code, name, sell_price').eq('is_active', true).order('name'),
  ])
  return <ReturnsClient initialReturns={returns_ || []} orders={orders || []} products={products || []} />
}
