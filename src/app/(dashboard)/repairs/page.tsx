import { createClient } from '@/lib/supabase/server'
import { RepairsClient } from './repairs-client'

export default async function RepairsPage() {
  const supabase = await createClient()
  const [{ data: repairs }, { data: customers }] = await Promise.all([
    supabase.from('repair_requests').select('*, customer:customers(name,phone)').order('created_at', { ascending: false }).limit(100),
    supabase.from('customers').select('id, name, phone').eq('is_active', true).order('name').limit(500),
  ])
  return <RepairsClient initialRepairs={repairs || []} customers={customers || []} />
}
