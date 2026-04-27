import { createClient } from '@/lib/supabase/server'
import { DamageExportsClient } from './damage-exports-client'

export default async function DamageExportsPage() {
  const supabase = await createClient()
  const [{ data: exports_ }, { data: products }] = await Promise.all([
    supabase.from('damage_exports').select('*').order('created_at', { ascending: false }).limit(100),
    supabase.from('products').select('id, code, name, cost_price').eq('is_active', true).order('name'),
  ])
  return <DamageExportsClient initialExports={exports_ || []} products={products || []} />
}
