/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { SectionCard, EField, ESelect, ETextarea, ETagList, EMultiSelect } from "./EditFields"

// --- Constants from Onboarding Steps ---
const INDUSTRIES = ["Technology", "Healthcare", "E-commerce", "Real Estate", "Education", "Finance", "Food & Beverage", "Fashion", "Marketing", "Travel", "Other"]
const BUSINESS_TYPES = ["B2B", "B2C", "SaaS", "Service-based", "Product-based", "Agency", "Local Business"]
const TEAM_SIZES = ["1-5", "6-20", "21-50", "51-200", "201+"]
const CMS_PLATFORMS = ["WordPress", "Shopify", "Webflow", "Wix", "Squarespace", "Custom", "None"]
const HOSTING_PROVIDERS = ["AWS", "Google Cloud", "Hostinger", "Bluehost", "GoDaddy", "Vercel", "Netlify", "Other"]
const GOALS = ["Brand Awareness", "Lead Generation", "Sales/Conversions", "Customer Retention", "Community Building", "Thought Leadership", "Market Research", "Talent Acquisition"]
const PAIN_POINTS = ["Low Engagement", "High Ad Costs", "Brand Inconsistency", "No Content Strategy", "Technical Debt", "Poor Lead Quality", "Manual Processes"]
const AUDIENCE_DEMOGRAPHICS = ["Gen Z (18-24)", "Millennials (25-40)", "Gen X (41-55)", "Boomers (56+)", "High Net Worth", "Small Biz Owners", "Corporate Execs"]
const TONES = ["Professional", "Friendly", "Bold", "Minimal", "Premium", "Witty", "Educational", "Inspirational"]

type SupabaseClient = {
  id: string
  email: string
  legal_name: string
  section_a: any
  section_b: any
  section_c: any
  section_d: any
  section_e: any
  section_f: any
  section_g: any
  section_h: any
  section_i: any
  section_j: any
  section_k: any
}

export default function OnboardingViewer({ client }: { client: SupabaseClient }) {
  const sA = client.section_a || {}
  const sB = client.section_b || {}
  const sC = client.section_c || {}
  const sD = client.section_d || {}
  const sE = client.section_e || {}
  const sF = client.section_f || {}
  const sG = client.section_g || {}
  const sH = client.section_h || {}
  const sI = client.section_i || {}
  const sJ = client.section_j || {}
  const sK = client.section_k || {}

  const SECTIONS = [
    { key: "section_a", data: sA },
    { key: "section_b", data: sB },
    { key: "section_c", data: sC },
    { key: "section_d", data: sD },
    { key: "section_e", data: sE },
    { key: "section_f", data: sF },
    { key: "section_g", data: sG },
    { key: "section_h", data: sH },
    { key: "section_i", data: sI },
    { key: "section_j", data: sJ },
    { key: "section_k", data: sK },
  ]

  const completed = SECTIONS.filter(s => s.data && Object.keys(s.data).length > 0).length
  const total = SECTIONS.length
  const pct = Math.round((completed / total) * 100)

  const isDone = (data: any) => data && Object.keys(data).length > 0

  return (
    <div className="space-y-6">
      {/* Progress Bar */}
      <div className="bg-[#001f1f] border border-[#003434] rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-white font-semibold text-sm">{completed} of {total} sections populated</p>
            <p className="text-zinc-500 text-xs mt-0.5">{pct}% overall progress</p>
          </div>
        </div>
        <div className="w-full bg-[#003434] rounded-full h-2">
          <div
            className="bg-gradient-to-r from-[#70BF4B] to-[#D0F255] h-2 rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Step A & B: Business Foundation */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <SectionCard title="Step A: Business Identity" accent="#70BF4B" isDone={isDone(sA)}>
          <EField clientId={client.id} label="Legal Business Name" section="section_a" field="legal_name" value={sA.legal_name || client.legal_name || ""} />
          <ESelect clientId={client.id} label="Industry" section="section_a" field="industry" value={sA.industry || ""} options={INDUSTRIES} />
          <ESelect clientId={client.id} label="Business Type" section="section_a" field="business_type" value={sA.business_type || ""} options={BUSINESS_TYPES} />
          <ESelect clientId={client.id} label="Team Size" section="section_a" field="team_size" value={sA.team_size || ""} options={TEAM_SIZES} />
          <EField clientId={client.id} label="Website URL" section="section_a" field="website" value={sA.website || ""} inputType="url" />
        </SectionCard>

        <SectionCard title="Step B: Services & Location" accent="#D0F255" isDone={isDone(sB)}>
          <ETextarea clientId={client.id} label="Core Services" section="section_b" field="core_services" value={sB.core_services || ""} />
          <EField clientId={client.id} label="Primary Headquarters" section="section_b" field="hq_location" value={sB.hq_location || ""} />
          <EField clientId={client.id} label="Operational Regions" section="section_b" field="regions" value={sB.regions || ""} />
        </SectionCard>
      </div>

      {/* Step C: Brand Identity */}
      <SectionCard title="Step C: Brand Essence" accent="#70BF4B" isDone={isDone(sC)}>
        <ESelect clientId={client.id} label="Brand Tone" section="section_c" field="tone" value={sC.tone || ""} options={TONES} />
        <ETextarea clientId={client.id} label="Mission Statement" section="section_c" field="mission" value={sC.mission || ""} />
        <EField clientId={client.id} label="Primary Color" section="section_c" field="primary_color" value={sC.colors?.primary || ""} inputType="color" />
      </SectionCard>

      {/* Step E: Technical Setup */}
      <SectionCard title="Step E: Technical Ecosystem" accent="#D0F255" isDone={isDone(sE)}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
          <ESelect clientId={client.id} label="Current CMS" section="section_e" field="cms" value={sE.cms || ""} options={CMS_PLATFORMS} />
          <ESelect clientId={client.id} label="Hosting Provider" section="section_e" field="hosting" value={sE.hosting || ""} options={HOSTING_PROVIDERS} />
          <EField clientId={client.id} label="Domain Registrar" section="section_e" field="registrar" value={sE.registrar || ""} />
          <EField clientId={client.id} label="Google Analytics ID" section="section_e" field="ga_id" value={sE.ga_id || ""} />
        </div>
      </SectionCard>

      {/* Step F & G: Strategy & Audience */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <SectionCard title="Step F: Growth Goals" accent="#70BF4B" isDone={isDone(sF)}>
          <EMultiSelect clientId={client.id} label="Primary Goals" section="section_f" field="primary_goals" value={sF.primary_goals || []} options={GOALS} />
          <EMultiSelect clientId={client.id} label="Core Pain Points" section="section_f" field="pain_points" value={sF.pain_points || []} options={PAIN_POINTS} />
          <ETextarea clientId={client.id} label="Revenue Targets" section="section_f" field="revenue_targets" value={sF.revenue_targets || ""} />
        </SectionCard>

        <SectionCard title="Step G: Target Audience" accent="#D0F255" isDone={isDone(sG)}>
          <ETextarea clientId={client.id} label="Ideal Customer Profile" section="section_g" field="icp_description" value={sG.icp_description || ""} />
          <EMultiSelect clientId={client.id} label="Target Demographics" section="section_g" field="age_groups" value={sG.age_groups || []} options={AUDIENCE_DEMOGRAPHICS} />
          <EField clientId={client.id} label="Primary Geo-Target" section="section_g" field="geo_target" value={sG.geo_target || ""} />
        </SectionCard>
      </div>

      {/* Step H: Competitors */}
      <SectionCard title="Step H: Competitive Landscape" accent="#70BF4B" isDone={isDone(sH)}>
        <ETextarea clientId={client.id} label="Top Competitors" section="section_h" field="top_competitors" value={sH.top_competitors || ""} placeholder="List top competitors and their strengths/weaknesses..." />
        <ETextarea clientId={client.id} label="Unique Selling Prop (USP)" section="section_h" field="usp" value={sH.usp || ""} />
      </SectionCard>

      {/* Step I & J: Content & Compliance */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <SectionCard title="Step I: Compliance & Regulatory" accent="#D0F255" isDone={isDone(sI)}>
          <EField clientId={client.id} label="Regulated Industry?" section="section_i" field="is_regulated" value={String(sI.is_regulated || "false")} inputType="checkbox" />
          <ETextarea clientId={client.id} label="Regulatory Bodies" section="section_i" field="regulatory_bodies" value={sI.regulatory_bodies || ""} />
          <ETextarea clientId={client.id} label="Disallowed Topics" section="section_i" field="disallowed_topics" value={sI.disallowed_topics || ""} />
        </SectionCard>

        <SectionCard title="Step J: Content Preferences" accent="#70BF4B" isDone={isDone(sJ)}>
          <ESelect clientId={client.id} label="Content Frequency" section="section_j" field="frequency" value={sJ.frequency || ""} options={["Daily", "3x Week", "Weekly", "Bi-weekly"]} />
          <ETextarea clientId={client.id} label="Key Content Pillars" section="section_j" field="pillars" value={sJ.pillars || ""} />
          <EField clientId={client.id} label="Auto-Post Enabled?" section="section_j" field="auto_post" value={String(sJ.auto_post || "false")} inputType="checkbox" />
        </SectionCard>
      </div>

      {/* Step K: Reporting & Success */}
      <SectionCard title="Step K: Reporting Preferences" accent="#D0F255" isDone={isDone(sK)}>
        <ESelect clientId={client.id} label="Reporting Cycle" section="section_k" field="reporting_cycle" value={sK.reporting_cycle || ""} options={["Weekly", "Monthly", "Quarterly"]} />
        <ETextarea clientId={client.id} label="Preferred Reporting Metrics" section="section_k" field="metrics" value={sK.metrics || ""} />
        <EField clientId={client.id} label="Client Portal Access" section="section_k" field="portal_access" value={String(sK.portal_access || "false")} inputType="checkbox" />
      </SectionCard>
    </div>
  )
}
