export type EligibleContact = {
  id: string
  email: string
  name: string | null
  user_name: string | null
  agent_name: string | null
  agent_id: string | null
}

type RawContact = EligibleContact & {
  subscribed: boolean
  bounced: boolean
  complained: boolean
}

/** Deduplicate and filter contacts to those eligible for sending (subscribed, not bounced, not complained). */
export function filterEligibleContacts(
  rows: Array<{ email_contacts: unknown }>,
): EligibleContact[] {
  const seen = new Set<string>()
  return rows
    .map(r => r.email_contacts as unknown as RawContact)
    .filter(c => {
      if (!c || !c.subscribed || c.bounced || c.complained) return false
      if (seen.has(c.id)) return false
      seen.add(c.id)
      return true
    })
}
