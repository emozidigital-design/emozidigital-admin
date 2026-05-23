import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import Header from "@/components/layout/Header"
import Sidebar from "@/components/layout/Sidebar"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/login")
  }

  return (
    <div className="h-screen bg-white flex overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header email={session.user?.email ?? ""} />
        <main className="flex-1 p-6 lg:p-8 bg-zinc-50/50 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
