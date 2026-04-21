import { supabase } from "@/lib/supabase"
import BlogEditor from "@/components/blog/BlogEditor"
import { notFound } from "next/navigation"

interface PostPageProps {
  params: {
    id: string
  }
}

export const dynamic = 'force-dynamic'

async function getPost(id: string) {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) return null
  return data
}

export default async function EditPostPage({ params }: PostPageProps) {
  const post = await getPost(params.id)

  if (!post) {
    notFound()
  }

  // Ensure tags is always an array
  const formattedPost = {
    ...post,
    tags: Array.isArray(post.tags) ? post.tags : (post.tags ? String(post.tags).split(',').map((t: string) => t.trim()) : []),
    schema_faq: Array.isArray(post.schema_faq) ? post.schema_faq : []
  }

  return <BlogEditor initialData={formattedPost} />
}
