import { supabaseAdmin } from "@/lib/supabase-server"

export const dynamic = "force-dynamic"

export default async function ClientsPage() {
  const { data: clients, error } = await supabaseAdmin
    .from("clients")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching clients:", error)
  }

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Clients Dashboard</h1>
          <p className="text-gray-400 mt-2">Manage and view all registered clients.</p>
        </div>

        <div className="bg-[#1a1a1a] rounded-xl border border-white/10 shadow-xl overflow-hidden text-sm">
          {error && (
            <div className="p-6 text-red-400">Failed to load clients from database.</div>
          )}

          {!error && (!clients || clients.length === 0) ? (
            <div className="p-12 text-center text-gray-500 text-base">
              No clients yet
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-white/5 border-b border-white/10 text-gray-300">
                  <tr>
                    <th scope="col" className="px-6 py-4 font-medium">Name</th>
                    <th scope="col" className="px-6 py-4 font-medium">Email</th>
                    <th scope="col" className="px-6 py-4 font-medium">Industry</th>
                    <th scope="col" className="px-6 py-4 font-medium">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {clients?.map((client) => (
                    <tr key={client.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 font-medium text-white">{client.name}</td>
                      <td className="px-6 py-4 text-gray-300">{client.email}</td>
                      <td className="px-6 py-4 text-gray-400">
                        {client.industry ?? (
                          <span className="text-gray-600 italic">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-400 whitespace-nowrap">
                        {new Date(client.created_at).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
