import { createClient } from "@/lib/supabase/server"
import { DashboardClient } from "@/components/dashboard/dashboard-client"

export const dynamic = 'force-dynamic'

async function getHistorial() {
  const supabase = await createClient()
  const { data } = await supabase.from('notificaciones_historial').select('*').order('created_at', { ascending: false }).limit(10)
  return data || []
}

export default async function Dashboard() {
  const historial = await getHistorial()

  return (
    <DashboardClient initialHistorial={historial} />
  )
}
