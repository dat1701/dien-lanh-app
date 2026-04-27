import { createClient } from '@/lib/supabase/server'
import { CashFlowClient } from './cash-flow-client'

export default async function CashFlowPage() {
  const supabase = await createClient()
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const { data: transactions } = await supabase
    .from('cash_transactions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200)

  const { data: monthStats } = await supabase
    .from('cash_transactions')
    .select('type, amount')
    .gte('created_at', monthStart)
    .eq('status', 'da_thanh_toan')

  const totalThu = monthStats?.filter(t => t.type === 'thu').reduce((s, t) => s + t.amount, 0) || 0
  const totalChi = monthStats?.filter(t => t.type === 'chi').reduce((s, t) => s + t.amount, 0) || 0

  return <CashFlowClient initialTransactions={transactions || []} totalThu={totalThu} totalChi={totalChi} />
}
