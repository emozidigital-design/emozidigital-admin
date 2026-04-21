"use client"

import { Globe } from "lucide-react"

interface GooglePreviewProps {
  title: string
  description: string
  slug: string
}

export function GooglePreview({ title, description, slug }: GooglePreviewProps) {
  const displayTitle = title || "Post Title Preview"
  const displayDesc = description || "This is a preview of the meta description. It should be concise and engaging to encourage clicks from search results."
  const displaySlug = slug || "your-slug-here"

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Globe className="w-4 h-4 text-zinc-500" />
        <h3 className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest">Google Snippet Preview</h3>
      </div>
      
      <div className="bg-white rounded-xl p-6 border border-zinc-200">
        <div className="flex flex-col gap-1">
          <div className="text-[#1a0dab] text-xl font-medium hover:underline cursor-pointer line-clamp-1 leading-tight">
            {displayTitle.length > 60 ? `${displayTitle.substring(0, 60)}...` : displayTitle}
          </div>
          <div className="flex items-center gap-1 text-[#006621] text-sm py-0.5">
            <span className="font-medium">emozidigital.com</span>
            <span>› blog › {displaySlug}</span>
          </div>
          <div className="text-[#4d5156] text-sm line-clamp-2 leading-snug">
            {displayDesc.length > 155 ? `${displayDesc.substring(0, 155)}...` : displayDesc}
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-4 text-[10px] text-zinc-500 font-medium">
        <div className="flex items-center gap-1.5">
          <div className={`w-2 h-2 rounded-full ${displayTitle.length >= 40 && displayTitle.length <= 60 ? 'bg-[#70BF4B]' : 'bg-red-400'}`} />
          Title: {displayTitle.length} / 60
        </div>
        <div className="flex items-center gap-1.5">
          <div className={`w-2 h-2 rounded-full ${displayDesc.length >= 120 && displayDesc.length <= 155 ? 'bg-[#70BF4B]' : 'bg-red-400'}`} />
          Desc: {displayDesc.length} / 155
        </div>
      </div>
    </div>
  )
}
