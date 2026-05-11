"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import useSWR from "swr"
import { format } from "date-fns"
import {
  ChevronLeft,
  Save,
  Globe,
  Image as ImageIcon,
  Clock,
  Tag,
  Layout,
  User,
  Calendar,
  Eye,
  ExternalLink,
  Send,
  Trash2,
} from "lucide-react"
import toast from "react-hot-toast"
import { FAQBuilder } from "./FAQBuilder"
import { GooglePreview } from "./GooglePreview"

// Dynamically import MD editor to avoid SSR issues
const MDEditor = dynamic(
  () => import("@uiw/react-md-editor").then((mod) => mod.default),
  { ssr: false }
)

// Import styles for the editor
import "@uiw/react-md-editor/markdown-editor.css"
import "@uiw/react-markdown-preview/markdown.css"

interface BlogPost {
  id?: string
  title: string
  slug: string
  content: string
  excerpt: string
  category: string
  status: 'draft' | 'published'
  published_at: string | null
  tags: string[]
  author: string
  cover_image_url: string
  cover_image_width: number
  cover_image_height: number
  read_time: number
  schema_faq: any[]
  focus_keyword: string
  seo_title: string
  seo_description: string
  client_id: string | null
}

interface BlogEditorProps {
  initialData?: BlogPost
  isNew?: boolean
}

const CATEGORIES = [
  "AI Automation",
  "SEO & Content",
  "Lead Generation",
  "CRM & Workflow",
  "Chatbots",
  "Performance Marketing"
]

// Each entry represents an external blog site the admin can publish to.
// Add more sites here as new client blogs are set up.
const EXTERNAL_BLOG_SITES = [
  {
    id: "agentbazar",
    name: "Agent Bazar Blog",
    siteUrl: "https://blog.agentbazar.in",
    apiPath: "/api/blog/agentbazar",
    categories: [
      "Aviation", "Visa Updates", "Travel Tips", "Industry News",
      "Industry Trends", "Travel Tools", "Cruise", "Top Sectors",
      "New Launches", "Events & Expo",
    ],
  },
]

type ExtSiteStatus = "unknown" | "published" | "not-published"

const fetcher = (url: string) => fetch(url).then(r => r.json())

export default function BlogEditor({ initialData, isNew = false }: BlogEditorProps) {
  const router = useRouter()
  const [post, setPost] = useState<BlogPost>(initialData || {
    title: "",
    slug: "",
    content: "",
    excerpt: "",
    category: CATEGORIES[0],
    status: "draft",
    published_at: null,
    tags: [],
    author: "Emozi Digital",
    cover_image_url: "",
    cover_image_width: 1200,
    cover_image_height: 630,
    read_time: 0,
    schema_faq: [],
    focus_keyword: "",
    seo_title: "",
    seo_description: "",
    client_id: null,
  })

  const { data: clientsData } = useSWR<{ clients: { id: string; name: string }[] }>('/api/clients', fetcher)
  const clients = clientsData?.clients ?? []

  const [isSaving, setIsSaving] = useState(false)
  const [isSlugEdited, setIsSlugEdited] = useState(false)
  const lastSavedPostStr = useRef(JSON.stringify(post))
  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null)

  // External blog publishing state (keyed by site id)
  const [extStatus, setExtStatus] = useState<Record<string, ExtSiteStatus>>(
    Object.fromEntries(EXTERNAL_BLOG_SITES.map(s => [s.id, "unknown"]))
  )
  const [extCategory, setExtCategory] = useState<Record<string, string>>(
    Object.fromEntries(EXTERNAL_BLOG_SITES.map(s => [s.id, s.categories[0]]))
  )
  const [publishingTo, setPublishingTo] = useState<string | null>(null)

  // Auto-generate slug from title
  useEffect(() => {
    if (isNew && post.title && !isSlugEdited) {
      const generatedSlug = post.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      setPost(prev => ({ ...prev, slug: generatedSlug }));
    }
  }, [post.title, isNew, isSlugEdited])

  // Auto-estimate read time
  useEffect(() => {
    const wordCount = post.content.split(/\s+/).filter(Boolean).length;
    const estimatedTime = Math.ceil(wordCount / 200);
    if (estimatedTime !== post.read_time) {
      setPost(prev => ({ ...prev, read_time: estimatedTime }));
    }
  }, [post.content, post.read_time])

  // Explicit Save
  const handleSave = async (options: { publish?: boolean, silent?: boolean } = {}) => {
    setIsSaving(true)
    
    const dataToSave = {
      ...post,
      status: options.publish ? 'published' : post.status,
      published_at: options.publish ? new Date().toISOString() : post.published_at,
      client_id: post.client_id || null,
    }

    try {
      const res = await fetch('/api/blog', {
        method: isNew && !post.id ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSave)
      })

      if (!res.ok) {
        const contentType = res.headers.get("content-type")
        if (contentType && contentType.includes("application/json")) {
          const errorData = await res.json()
          throw errorData
        } else {
          const textError = await res.text()
          throw new Error(`Server Error: ${res.status} - ${textError.substring(0, 100)}...`)
        }
      }
      
      const result = await res.json()
      const savedPost = result.post
      
      if (isNew && !post.id) {
        // Update URL to edit mode with the new ID
        router.replace(`/blog/${savedPost.id}`)
      }

      setPost(prev => ({ ...prev, id: savedPost.id }));
      lastSavedPostStr.current = JSON.stringify(savedPost)
      
      if (!options.silent) {
        toast.success(options.publish ? "Post published successfully!" : "Draft saved successfully")
      }
    } catch (err: any) {
      console.error('Save Error:', err)
      const errorMsg = err.error || err.message || "Error saving post"
      const details = err.details ? ` (${err.details})` : ""
      const hint = err.hint ? `\nHint: ${err.hint}` : ""
      
      if (!options.silent) {
        toast.error(`Error: ${errorMsg}${details}${hint}`, {
          duration: 6000,
          style: { maxWidth: '400px' }
        })
      }
    } finally {
      setIsSaving(false)
    }
  }

  // Check all external sites for this slug whenever it changes
  useEffect(() => {
    if (!post.slug) return
    EXTERNAL_BLOG_SITES.forEach(async (site) => {
      try {
        const res = await fetch(`${site.apiPath}?slug=${encodeURIComponent(post.slug)}`)
        const data = await res.json()
        setExtStatus(prev => ({ ...prev, [site.id]: data.exists ? "published" : "not-published" }))
      } catch {
        setExtStatus(prev => ({ ...prev, [site.id]: "not-published" }))
      }
    })
  }, [post.slug])

  const publishToSite = async (site: typeof EXTERNAL_BLOG_SITES[number]) => {
    if (!post.title || !post.slug) return
    setPublishingTo(site.id)
    try {
      const res = await fetch(site.apiPath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...post, externalCategory: extCategory[site.id] }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      setExtStatus(prev => ({ ...prev, [site.id]: "published" }))
      toast.success(`Published to ${site.name}!`)
    } catch (err: any) {
      toast.error(`Failed: ${err.message}`)
    } finally {
      setPublishingTo(null)
    }
  }

  const unpublishFromSite = async (site: typeof EXTERNAL_BLOG_SITES[number]) => {
    if (!confirm(`Remove this post from ${site.name}?`)) return
    try {
      const res = await fetch(`${site.apiPath}?slug=${encodeURIComponent(post.slug)}`, { method: "DELETE" })
      if (!res.ok) throw new Error((await res.json()).error)
      setExtStatus(prev => ({ ...prev, [site.id]: "not-published" }))
      toast.success(`Removed from ${site.name}`)
    } catch (err: any) {
      toast.error(`Failed: ${err.message}`)
    }
  }

  // Auto-save logic (every 30s)
  useEffect(() => {
    autoSaveTimer.current = setInterval(() => {
      const currentPostStr = JSON.stringify(post)
      if (currentPostStr !== lastSavedPostStr.current && post.title) {
        handleSave({ silent: true })
      }
    }, 30000)

    return () => {
      if (autoSaveTimer.current) clearInterval(autoSaveTimer.current)
    }
  }, [post])

  const updatePost = (updates: Partial<BlogPost>) => {
    setPost(prev => ({ ...prev, ...updates }))
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append('file', file)

    const uploadToast = toast.loading("Uploading image...")
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })
      const data = await res.json()
      if (data.url) {
        updatePost({ cover_image_url: data.url })
        
        // Auto-detect dimensions
        const img = new Image()
        img.onload = () => {
          updatePost({ 
            cover_image_url: data.url, 
            cover_image_width: img.width, 
            cover_image_height: img.height 
          })
        }
        img.src = data.url
        
        toast.success("Image uploaded", { id: uploadToast })
      } else {
        throw new Error(data.error || "Upload failed")
      }
    } catch (err) {
      toast.error("Upload failed: " + (err instanceof Error ? err.message : String(err)), { id: uploadToast })
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#001a1a]">
      {/* Top Header */}
      <div className="sticky top-0 z-50 bg-[#001f1f]/80 backdrop-blur-md border-b border-[#003434] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.push('/blog')}
            className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-white/5 transition-all"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-white font-bold text-sm leading-tight">
              {isNew ? "Creating New Post" : "Editing Post"}
            </h1>
            <p className="text-zinc-500 text-[10px] uppercase tracking-widest font-bold mt-0.5">
              {post.status === 'published' ? '🟢 Published' : '⚪ Draft'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => handleSave()}
            disabled={isSaving || !post.title}
            className="flex items-center gap-2 text-zinc-300 hover:text-white text-xs font-bold px-4 py-2.5 rounded-xl border border-[#003434] bg-[#001a1a] transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            Save Draft
          </button>
          <button
            onClick={() => handleSave({ publish: true })}
            disabled={isSaving || !post.title}
            className="flex items-center gap-2 bg-[#70BF4B] hover:bg-[#5faa3e] text-[#001a1a] font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-[#70BF4B]/10 active:scale-95 disabled:opacity-50"
          >
            <Globe className="w-4 h-4" />
            {post.status === 'published' ? 'Update Post' : 'Publish Now'}
          </button>
          
          {post.status === 'published' && (
            <a
              href={`https://emozidigital.com/blog/${post.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-[#70BF4B] hover:text-[#5faa3e] text-xs font-bold px-4 py-2.5 rounded-xl border border-[#70BF4B]/20 bg-[#70BF4B]/5 transition-all"
            >
              <Eye className="w-4 h-4" />
              View Live
            </a>
          )}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
        {/* Left Panel: Editor */}
        <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-10 custom-scrollbar">
          {/* Title Section */}
          <div className="space-y-4">
            <input
              type="text"
              value={post.title}
              onChange={(e) => updatePost({ title: e.target.value })}
              placeholder="Enter post title..."
              className="w-full bg-transparent border-none focus:ring-0 text-white text-4xl md:text-5xl font-black placeholder-zinc-800 outline-none"
            />
            
            <div className="flex items-center gap-2 group">
              <span className="text-zinc-600 text-sm font-mono">/blog/</span>
              <input
                type="text"
                value={post.slug}
                onChange={(e) => {
                  setIsSlugEdited(true);
                  updatePost({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-') });
                }}
                placeholder="slug-url"
                className="bg-transparent border-none focus:ring-0 text-[#70BF4B] text-sm font-mono p-0 outline-none w-full"
              />
            </div>
          </div>

          {/* Content Editor */}
          <div className="space-y-4" data-color-mode="dark">
            <div className="flex items-center justify-between">
               <h3 className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                 <Layout className="w-4 h-4" /> Content Body
               </h3>
               <span className="text-zinc-600 text-[10px] font-mono">
                 {post.content.split(/\s+/).filter(Boolean).length} words
               </span>
            </div>
            <MDEditor
              value={post.content}
              onChange={(val) => updatePost({ content: val || "" })}
              preview="edit"
              height={500}
              className="border border-[#003434] rounded-2xl overflow-hidden"
              style={{ backgroundColor: '#001f1f' }}
            />
          </div>

          {/* Excerpt Section */}
          <div className="space-y-4">
             <div className="flex items-center justify-between">
                <h3 className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">Excerpt / Summary</h3>
                <span className={`text-[10px] font-mono ${post.excerpt.length > 155 ? 'text-red-400' : 'text-zinc-600'}`}>
                  {post.excerpt.length} / 155
                </span>
             </div>
             <textarea
               value={post.excerpt}
               onChange={(e) => updatePost({ excerpt: e.target.value.substring(0, 160) })}
               placeholder="Briefly describe what this post is about (SEO snippet)..."
               rows={3}
               className="w-full bg-[#001f1f] border border-[#003434] focus:border-[#70BF4B]/40 text-zinc-300 text-sm rounded-xl px-4 py-3 outline-none transition-all resize-none"
             />
          </div>

          {/* FAQ Builder */}
          <FAQBuilder 
            items={post.schema_faq} 
            onChange={(items) => updatePost({ schema_faq: items })} 
          />
        </div>

        {/* Right Panel: Meta */}
        <div className="w-full lg:w-96 bg-[#001f1f] border-l border-[#003434] overflow-y-auto p-6 space-y-8 custom-scrollbar">
          {/* Status & Date */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-zinc-400">
              <Calendar className="w-4 h-4" />
              <h4 className="text-[10px] font-bold uppercase tracking-widest">Publish Settings</h4>
            </div>
            
            <div className="bg-[#001a1a] border border-[#003434] rounded-xl p-4 space-y-4">
              <div>
                <label className="block text-[10px] text-zinc-600 font-bold uppercase mb-2">Post For</label>
                <select
                  value={post.client_id ?? ""}
                  onChange={(e) => updatePost({ client_id: e.target.value || null })}
                  className="w-full bg-[#001f1f] border border-[#003434] text-white text-sm rounded-lg px-3 py-2 outline-none focus:border-[#70BF4B]/40"
                >
                  <option value="">Emozi Digital (Own)</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-zinc-600 font-bold uppercase mb-2">Category</label>
                <select
                  value={post.category}
                  onChange={(e) => updatePost({ category: e.target.value })}
                  className="w-full bg-[#001f1f] border border-[#003434] text-white text-sm rounded-lg px-3 py-2 outline-none focus:border-[#70BF4B]/40"
                >
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-zinc-600 font-bold uppercase mb-2">Published Date</label>
                <input
                  type="datetime-local"
                  value={post.published_at ? format(new Date(post.published_at), "yyyy-MM-dd'T'HH:mm") : ""}
                  onChange={(e) => updatePost({ published_at: e.target.value ? new Date(e.target.value).toISOString() : null })}
                  className="w-full bg-[#001f1f] border border-[#003434] text-white text-sm rounded-lg px-3 py-2 outline-none focus:border-[#70BF4B]/40"
                />
              </div>

              <div>
                <label className="block text-[10px] text-zinc-600 font-bold uppercase mb-2">Author</label>
                <div className="flex items-center gap-2 bg-[#001f1f] border border-[#003434] rounded-lg px-3 py-2">
                  <User className="w-4 h-4 text-zinc-500" />
                  <input
                    type="text"
                    value={post.author}
                    onChange={(e) => updatePost({ author: e.target.value })}
                    className="bg-transparent border-none p-0 focus:ring-0 text-white text-sm w-full outline-none"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Tags */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-zinc-400">
              <Tag className="w-4 h-4" />
              <h4 className="text-[10px] font-bold uppercase tracking-widest">Tags</h4>
            </div>
            <div className="bg-[#001a1a] border border-[#003434] rounded-xl p-4">
              <textarea
                value={post.tags.join(", ")}
                onChange={(e) => updatePost({ tags: e.target.value.split(",").map(t => t.trim()).filter(Boolean) })}
                placeholder="SEO, Automation, Growth..."
                rows={2}
                className="w-full bg-[#001f1f] border border-[#003434] text-white text-sm rounded-lg px-3 py-2 outline-none focus:border-[#70BF4B]/40 resize-none"
              />
              <p className="text-[9px] text-zinc-600 mt-2 italic">Comma-separated tags</p>
            </div>
          </section>

          {/* Cover Image */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-zinc-400">
              <ImageIcon className="w-4 h-4" />
              <h4 className="text-[10px] font-bold uppercase tracking-widest">Cover Image</h4>
            </div>
            <div className="bg-[#001a1a] border border-[#003434] rounded-xl p-4 space-y-4">
              {post.cover_image_url ? (
                <div className="relative aspect-video rounded-lg overflow-hidden border border-[#003434]">
                   {/* eslint-disable-next-line @next/next/no-img-element */}
                   <img src={post.cover_image_url} alt="Cover Preview" className="w-full h-full object-cover" />
                   <button 
                     onClick={() => updatePost({ cover_image_url: "" })}
                     className="absolute top-2 right-2 bg-black/60 p-1.5 rounded-lg hover:bg-red-500/80 transition-all"
                   >
                     <ChevronLeft className="w-3 h-3 text-white rotate-45" />
                   </button>
                </div>
              ) : (
                <div className="aspect-video rounded-lg border-2 border-dashed border-[#003434] flex flex-col items-center justify-center text-zinc-700 bg-[#001f1f]">
                   <ImageIcon className="w-8 h-8 mb-2 opacity-50" />
                   <span className="text-[10px] font-bold uppercase tracking-widest opacity-50">No Image</span>
                </div>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={post.cover_image_url}
                  onChange={(e) => updatePost({ cover_image_url: e.target.value })}
                  placeholder="https://image-url.com/asset.jpg"
                  className="flex-1 bg-[#001f1f] border border-[#003434] text-[#70BF4B] text-[11px] rounded-lg px-3 py-2 outline-none focus:border-[#70BF4B]/40 font-mono"
                />
                <label className="cursor-pointer bg-[#003434] hover:bg-[#004a4a] text-zinc-300 p-2 rounded-lg transition-all flex items-center justify-center shrink-0">
                   <Save className="w-4 h-4 rotate-180" />
                   <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                </label>
              </div>

              {/* Image Size Controls */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-[9px] text-zinc-600 font-bold uppercase mb-1">Width (px)</label>
                  <input
                    type="number"
                    value={post.cover_image_width || 0}
                    onChange={(e) => updatePost({ cover_image_width: parseInt(e.target.value) || 0 })}
                    className="w-full bg-[#001f1f] border border-[#003434] text-white text-xs rounded-lg px-2 py-1.5 outline-none focus:border-[#70BF4B]/40"
                  />
                </div>
                <div>
                  <label className="block text-[9px] text-zinc-600 font-bold uppercase mb-1">Height (px)</label>
                  <input
                    type="number"
                    value={post.cover_image_height || 0}
                    onChange={(e) => updatePost({ cover_image_height: parseInt(e.target.value) || 0 })}
                    className="w-full bg-[#001f1f] border border-[#003434] text-white text-xs rounded-lg px-2 py-1.5 outline-none focus:border-[#70BF4B]/40"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Stats */}
          <section className="bg-white/5 rounded-2xl p-5 border border-white/5 space-y-4">
             <div className="flex items-center justify-between">
                <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">Est. Read Time</span>
                <div className="flex items-center gap-2 text-[#70BF4B] font-bold text-sm">
                   <Clock className="w-4 h-4" />
                   {post.read_time} min
                </div>
             </div>
          </section>

          {/* SEO SECTION */}
          <section className="space-y-4 border-t border-[#003434] pt-8">
            <h4 className="text-white text-xs font-bold uppercase tracking-[0.2em] mb-4">SEO Optimization</h4>
            
            <div className="space-y-5">
               <div>
                  <label className="block text-[10px] text-zinc-600 font-bold uppercase mb-2">Focus Keyword</label>
                  <input
                    type="text"
                    value={post.focus_keyword}
                    onChange={(e) => updatePost({ focus_keyword: e.target.value })}
                    className="w-full bg-[#001a1a] border border-[#003434] text-white text-sm rounded-lg px-3 py-2 outline-none focus:border-[#70BF4B]/40"
                    placeholder="e.g. AI Automation for Sales"
                  />
               </div>

               <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-[10px] text-zinc-600 font-bold uppercase">SEO Title</label>
                    <span className={`text-[9px] font-mono ${post.seo_title.length > 60 ? 'text-red-400' : 'text-[#70BF4B]'}`}>
                      {post.seo_title.length}/60
                    </span>
                  </div>
                  <input
                    type="text"
                    value={post.seo_title}
                    onChange={(e) => updatePost({ seo_title: e.target.value })}
                    className={`w-full bg-[#001a1a] border ${post.seo_title.length > 60 ? 'border-red-500/40' : 'border-[#003434]'} text-white text-sm rounded-lg px-3 py-2 outline-none focus:border-[#70BF4B]/40`}
                    placeholder="Meta Title..."
                  />
               </div>

               <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-[10px] text-zinc-600 font-bold uppercase">SEO Description</label>
                    <span className={`text-[9px] font-mono ${post.seo_description.length > 155 ? 'text-red-400' : 'text-[#70BF4B]'}`}>
                      {post.seo_description.length}/155
                    </span>
                  </div>
                  <textarea
                    value={post.seo_description}
                    onChange={(e) => updatePost({ seo_description: e.target.value })}
                    className={`w-full bg-[#001a1a] border ${post.seo_description.length > 155 ? 'border-red-500/40' : 'border-[#003434]'} text-white text-sm rounded-lg px-3 py-2 outline-none focus:border-[#70BF4B]/40 resize-none`}
                    placeholder="Meta description for search results..."
                    rows={3}
                  />
               </div>

               <GooglePreview
                 title={post.seo_title || post.title}
                 description={post.seo_description || post.excerpt}
                 slug={post.slug}
               />
            </div>
          </section>

          {/* External Blog Publishing */}
          <section className="space-y-4 border-t border-[#003434] pt-8">
            <div className="flex items-center gap-2 text-zinc-400">
              <Send className="w-4 h-4" />
              <h4 className="text-[10px] font-bold uppercase tracking-widest">Publish to External Sites</h4>
            </div>

            <div className="space-y-3">
              {EXTERNAL_BLOG_SITES.map(site => {
                const status = extStatus[site.id] ?? "unknown"
                const isPublishing = publishingTo === site.id
                return (
                  <div key={site.id} className="bg-[#001a1a] border border-[#003434] rounded-xl p-4 space-y-3">
                    {/* Site header */}
                    <div className="flex items-center justify-between">
                      <span className="text-white text-xs font-bold">{site.name}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        status === "published"
                          ? "bg-emerald-500/15 text-emerald-400"
                          : status === "not-published"
                          ? "bg-zinc-800 text-zinc-500"
                          : "bg-zinc-800/50 text-zinc-600"
                      }`}>
                        {status === "published" ? "Live" : status === "not-published" ? "Not published" : "Checking…"}
                      </span>
                    </div>

                    {/* Category for this site */}
                    <div>
                      <label className="block text-[9px] text-zinc-600 font-bold uppercase mb-1.5">Category on this site</label>
                      <select
                        value={extCategory[site.id]}
                        onChange={e => setExtCategory(prev => ({ ...prev, [site.id]: e.target.value }))}
                        className="w-full bg-[#001f1f] border border-[#003434] text-white text-xs rounded-lg px-3 py-2 outline-none focus:border-[#70BF4B]/40"
                      >
                        {site.categories.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2 pt-1">
                      <button
                        onClick={() => publishToSite(site)}
                        disabled={isPublishing || !post.title || !post.slug}
                        className="w-full flex items-center justify-center gap-2 bg-[#003434] hover:bg-[#004d4d] text-[#70BF4B] font-bold text-xs px-4 py-2.5 rounded-xl transition-all disabled:opacity-40"
                      >
                        <Globe className="w-3.5 h-3.5" />
                        {isPublishing ? "Publishing…" : status === "published" ? "Update on Site" : "Publish to Site"}
                      </button>

                      {status === "published" && (
                        <div className="flex gap-2">
                          <a
                            href={`${site.siteUrl}/${post.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 flex items-center justify-center gap-1.5 text-zinc-400 hover:text-white text-[11px] font-bold px-3 py-2 rounded-xl border border-[#003434] transition-all"
                          >
                            <ExternalLink className="w-3 h-3" />
                            View Live
                          </a>
                          <button
                            onClick={() => unpublishFromSite(site)}
                            className="flex items-center justify-center gap-1.5 text-zinc-600 hover:text-red-400 text-[11px] px-3 py-2 rounded-xl border border-[#003434] hover:border-red-400/30 transition-all"
                            title="Remove from site"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
