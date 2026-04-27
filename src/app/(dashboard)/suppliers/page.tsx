import { createClient } from '@/lib/supabase/server'
import { SuppliersClient } from './suppliers-client'

export default async function SuppliersPage() {
  const supabase = await createClient()
  const { data: suppliers } = await supabase
    .from('suppliers')
    .select('*')
    .order('created_at', { ascending: false })

  return <SuppliersClient initialSuppliers={suppliers || []} />
}
