import { supabase } from "@/lib/supabase"
import ClientsTable from "@/components/tables/ClientsTable"

export const dynamic = "force-dynamic"

export default async function ClientsPage() {
  const { data, error } = await supabase
    .from("clients")
    .select("id, legal_name, email, status, current_step, created_at")
    .order("created_at", { ascending: false })

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="bg-red-950/40 border border-red-800/50 rounded-xl p-6 max-w-md w-full">
          <div className="flex items-center gap-3 mb-2">
            <svg className="w-5 h-5 text-red-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-red-400 font-semibold">Failed to load clients</h2>
          </div>
          <p className="text-zinc-400 text-sm">{error.message}</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Page header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-white text-2xl font-bold">Clients</h1>
          <p className="text-zinc-400 text-sm mt-1">
            {data?.length ?? 0} client{data?.length !== 1 ? "s" : ""} registered
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 bg-purple-600/20 border border-purple-600/30 text-purple-400 text-xs font-medium px-3 py-1.5 rounded-full">
            <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-pulse" />
            Live
          </span>
        </div>
      </div>

      <ClientsTable clients={data ?? []} />
    </div>
  )
}
