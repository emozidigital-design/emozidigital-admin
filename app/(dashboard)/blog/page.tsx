"use client"

import { useState, useMemo } from "react"
import useSWR from "swr"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { Edit2, Eye, Trash2, Globe, FileText, Search, Plus, Filter } from "lucide-react"

const fetcher = (url: string) => fetch(url).then(r => r.json())

type BlogPost = {
  id: string
  title: string
  slug: string
  category: string
  status: 'draft' | 'published' | 'archived'
  published_at: string | null
  views: number
  created_at: string
  client_id: string | null
}

const STATUS_COLOR: Record<string, string> = {
  draft: "bg-zinc-700/30 text-zinc-400 border-zinc-600/30",
  published: "bg-[#70BF4B]/15 text-[#70BF4B] border-[#70BF4B]/30",
  archived: "bg-red-500/15 text-red-400 border-red-500/30",
}

function Badge({ label, status }: { label: string; status: string }) {
  const cls = STATUS_COLOR[status] ?? "bg-zinc-700/30 text-zinc-400 border-zinc-600/30"
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium border capitalize ${cls}`}>
      {label}
    </span>
  )
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-white/5 ${className}`} />
}

export default function BlogPage() {
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [clientFilter, setClientFilter] = useState("all")

  const { data: clientsData } = useSWR<{ clients: { id: string; name: string }[] }>('/api/clients', fetcher)
  const clients = clientsData?.clients ?? []

  const { data, isLoading, mutate } = useSWR<{ posts: BlogPost[] }>(
    `/api/blog?status=${statusFilter}&search=${search}&clientId=${clientFilter}`,
    fetcher
  )

  const posts = data?.posts ?? []

  async function toggleStatus(post: BlogPost) {
    const newStatus = post.status === 'published' ? 'draft' : 'published';
    const published_at = newStatus === 'published' ? new Date().toISOString() : post.published_at;
    
    try {
      const res = await fetch('/api/blog', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: post.id, status: newStatus, published_at })
      });
      if (res.ok) mutate();
    } catch (err) {
      console.error("Failed to update status", err);
    }
  }

  async function deletePost(id: string) {
    if (!confirm("Are you sure you want to delete this post?")) return;
    try {
      const res = await fetch(`/api/blog?id=${id}`, { method: 'DELETE' });
      if (res.ok) mutate();
    } catch (err) {
      console.error("Failed to delete post", err);
    }
  }

  return (
    <div className="space-y-6 pb-20 lg:pb-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-white text-2xl font-bold tracking-tight">Blog Management</h1>
          <p className="text-zinc-500 text-sm mt-1">
            {isLoading ? "Loading posts..." : `Manage your content (${posts.length} posts)`}
          </p>
        </div>
        <button
          onClick={() => router.push('/blog/new')}
          className="flex items-center justify-center gap-2 bg-[#70BF4B] hover:bg-[#5faa3e] text-[#001a1a] font-bold text-sm px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-[#70BF4B]/10 active:scale-95"
        >
          <Plus className="w-4 h-4" />
          New Post
        </button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title..."
            className="w-full bg-[#001f1f] border border-[#003434] focus:border-[#70BF4B]/40 text-white text-sm rounded-xl pl-10 pr-4 py-2.5 outline-none transition-all placeholder-zinc-600"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
            className="bg-[#001f1f] border border-[#003434] text-zinc-300 text-sm rounded-xl px-4 py-2.5 outline-none focus:border-[#70BF4B]/40 transition-all appearance-none cursor-pointer min-w-[160px]"
          >
            <option value="all">All Clients</option>
            <option value="own">Emozi Digital (Own)</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#001f1f] border border-[#003434] text-zinc-300 text-sm rounded-xl px-4 py-2.5 outline-none focus:border-[#70BF4B]/40 transition-all appearance-none cursor-pointer min-w-[140px]"
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#001f1f] border border-[#003434] rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-[#003434] bg-[#001a1a]/50">
                <th className="text-left text-[11px] font-bold text-zinc-500 uppercase tracking-widest px-6 py-4">Title</th>
                <th className="text-left text-[11px] font-bold text-zinc-500 uppercase tracking-widest px-6 py-4">Category</th>
                <th className="text-left text-[11px] font-bold text-zinc-500 uppercase tracking-widest px-6 py-4">Status</th>
                <th className="text-left text-[11px] font-bold text-zinc-500 uppercase tracking-widest px-6 py-4">Published</th>
                <th className="text-left text-[11px] font-bold text-zinc-500 uppercase tracking-widest px-6 py-4 text-center">Views</th>
                <th className="text-right text-[11px] font-bold text-zinc-500 uppercase tracking-widest px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#003434]/50">
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    <td className="px-6 py-4"><Skeleton className="h-5 w-64" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-4 w-24" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-5 w-16 rounded-full" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-4 w-32" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-4 w-12 mx-auto" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-8 w-24 ml-auto rounded-lg" /></td>
                  </tr>
                ))
              ) : posts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center">
                    <FileText className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                    <p className="text-zinc-500 text-sm font-medium">No blog posts found.</p>
                    <button onClick={() => router.push('/blog/new')} className="text-[#70BF4B] text-sm mt-2 font-bold hover:underline">
                      Create your first post
                    </button>
                  </td>
                </tr>
              ) : (
                posts.map((post) => (
                  <tr key={post.id} className="hover:bg-[#003434]/20 transition-colors group">
                    <td className="px-6 py-5">
                      <div className="flex flex-col">
                        <span className="text-white font-semibold text-sm line-clamp-1 group-hover:text-[#70BF4B] transition-colors">
                          {post.title}
                        </span>
                        <span className="text-zinc-500 text-[11px] mt-0.5 font-mono">
                          /{post.slug}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className="text-zinc-300 text-xs px-2.5 py-1 rounded-md bg-zinc-800/50 border border-zinc-700/30">
                        {post.category || "Uncategorized"}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <Badge label={post.status} status={post.status} />
                    </td>
                    <td className="px-6 py-5 text-zinc-400 text-xs font-mono">
                      {post.published_at ? format(new Date(post.published_at), 'MMM d, yyyy') : '—'}
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className="text-zinc-300 text-xs font-mono">
                        {post.views?.toLocaleString() || 0}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => router.push(`/blog/${post.id}`)}
                          className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-all"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <a
                          href={`https://emozidigital.com/blog/${post.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-zinc-400 hover:text-[#70BF4B] hover:bg-[#70BF4B]/10 rounded-lg transition-all"
                          title="Preview"
                        >
                          <Eye className="w-4 h-4" />
                        </a>
                        <button
                          onClick={() => toggleStatus(post)}
                          className={`p-2 rounded-lg transition-all ${
                            post.status === 'published' 
                              ? 'text-zinc-400 hover:text-yellow-400 hover:bg-yellow-400/10' 
                              : 'text-zinc-400 hover:text-[#70BF4B] hover:bg-[#70BF4B]/10'
                          }`}
                          title={post.status === 'published' ? 'Unpublish' : 'Publish'}
                        >
                          <Globe className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deletePost(post.id)}
                          className="p-2 text-zinc-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
