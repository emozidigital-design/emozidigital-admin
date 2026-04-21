// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyPage = any

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function findProp(page: AnyPage, name: string): any {
  const props = page?.properties ?? {}
  if (props[name] !== undefined) return props[name]
  const key = Object.keys(props).find(
    k => k.toLowerCase().replace(/[\s_-]/g, '') === name.toLowerCase().replace(/[\s_-]/g, '')
  )
  return key ? props[key] : null
}

export function extractText(page: AnyPage, name: string): string {
  const p = findProp(page, name)
  if (!p) return ''
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (p.type === 'title') return (p.title ?? []).map((t: any) => t.plain_text).join('')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (p.type === 'rich_text') return (p.rich_text ?? []).map((t: any) => t.plain_text).join('')
  if (p.type === 'email') return p.email ?? ''
  if (p.type === 'phone_number') return p.phone_number ?? ''
  if (p.type === 'url') return p.url ?? ''
  return ''
}

export function extractSelect(page: AnyPage, name: string): string {
  const p = findProp(page, name)
  return p?.select?.name ?? p?.status?.name ?? ''
}

export function extractMultiSelect(page: AnyPage, name: string): string[] {
  const p = findProp(page, name)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return p?.multi_select?.map((s: any) => s.name) ?? []
}

export function extractNumber(page: AnyPage, name: string): number | null {
  const p = findProp(page, name)
  return typeof p?.number === 'number' ? p.number : null
}

export function extractDate(page: AnyPage, name: string): string | null {
  const p = findProp(page, name)
  return p?.date?.start ?? null
}

export function extractCheckbox(page: AnyPage, name: string): boolean {
  const p = findProp(page, name)
  return p?.checkbox ?? false
}

export function extractFiles(page: AnyPage, name: string): { name: string; url: string }[] {
  const p = findProp(page, name)
  if (!p?.files) return []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return p.files.map((f: any) => ({
    name: f.name ?? '',
    url: f.file?.url ?? f.external?.url ?? '',
  }))
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractRawValue(p: any): string {
  if (!p) return ''
  switch (p.type) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    case 'title': return (p.title ?? []).map((t: any) => t.plain_text).join('')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    case 'rich_text': return (p.rich_text ?? []).map((t: any) => t.plain_text).join('')
    case 'select': return p.select?.name ?? ''
    case 'status': return p.status?.name ?? ''
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    case 'multi_select': return (p.multi_select ?? []).map((s: any) => s.name).join(', ')
    case 'number': return p.number?.toString() ?? ''
    case 'email': return p.email ?? ''
    case 'phone_number': return p.phone_number ?? ''
    case 'url': return p.url ?? ''
    case 'date': return p.date?.start ?? ''
    case 'checkbox': return p.checkbox ? 'Yes' : 'No'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    case 'files': return (p.files ?? []).map((f: any) => f.name).join(', ')
    default: return ''
  }
}

export function extractAllProperties(page: AnyPage): Record<string, string> {
  const result: Record<string, string> = {}
  for (const [key, val] of Object.entries(page?.properties ?? {})) {
    const v = extractRawValue(val)
    if (v) result[key] = v
  }
  return result
}

// ─── Notion update payload builders ─────────────────────────────────────────

export const FIELD_TYPES: Record<string, string> = {
  'Legal Name': 'title',
  'Name':       'title',
  'Email':      'email',
  'WhatsApp':   'phone_number',
  'Status':     'select',
  'Package':    'select',
  'Tier':       'select',
  'Risk Profile':    'select',
  'Payment Status':  'select',
  'Disclaimer Status': 'select',
  'NDA Status':  'select',
  'Brand Tone':  'select',
  'MRR':        'number',
  'Start Date':  'date',
  'Notes':           'rich_text',
  'Internal Notes':  'rich_text',
  'Risk Notes':      'rich_text',
  'Brand Colors':    'rich_text',
  'Brand Fonts':     'rich_text',
  'Brand Story':     'rich_text',
  'Disallowed Topics': 'rich_text',
}

export function buildPropertyUpdate(
  field: string,
  value: string,
  typeHint?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Record<string, any> {
  const t = typeHint ?? FIELD_TYPES[field] ?? 'rich_text'
  switch (t) {
    case 'title':        return { title:    [{ text: { content: value } }] }
    case 'email':        return { email:    value }
    case 'phone_number': return { phone_number: value }
    case 'select':       return { select:   { name: value } }
    case 'number':       return { number:   parseFloat(value) || 0 }
    case 'date':         return { date:     { start: value } }
    case 'checkbox':     return { checkbox: value === 'true' || value === 'Yes' }
    default:             return { rich_text: [{ text: { content: value } }] }
  }
}
