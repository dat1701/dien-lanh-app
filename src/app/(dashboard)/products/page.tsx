import { createClient } from '@/lib/supabase/server'
import { ProductsClient } from './products-client'

export default async function ProductsPage() {
  const supabase = await createClient()
  const { data: products } = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false })

  return <ProductsClient initialProducts={products || []} />
}
