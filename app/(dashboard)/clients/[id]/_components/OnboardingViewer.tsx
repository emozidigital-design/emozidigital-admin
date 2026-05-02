/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import {
  SectionCard, EField, ESelect, ETextarea, EMultiSelect, ESlider, EUrlPreview,
} from "./EditFields"
import PlatformModuleCard from "./PlatformModuleCard"
import {
  // Section A
  INDUSTRIES, BUSINESS_MODELS, BUSINESS_TYPES, TEAM_SIZES, GEOGRAPHIES, TIMEZONES,
  // Section B
  FOUNDER_ROLES, COMM_CHANNELS, BEST_TIMES, LANGUAGES,
  // Section C
  TONES,
  // Section D
  PLATFORMS_OPTS, CONTENT_FORMATS, POST_FREQUENCIES, PLATFORM_LABELS,
  // Section E
  WEBSITE_PLATFORMS, ANALYTICS_PLATFORMS, CRM_PLATFORMS, EMAIL_PLATFORMS,
  SCHEDULERS, AD_PLATFORMS_OPTS, ACCESS_OPTIONS, TAG_MANAGER_OPTS,
  // Section F
  PRIMARY_GOALS, SECONDARY_GOAL_OPTS, TIMEFRAMES, KPI_OPTS, BUDGET_OPTIONS,
  GROWTH_STAGES, COMMON_PAIN_POINTS_OPTS, SECTOR_PAIN_POINTS_OPTS,
  // Section G
  AGE_OPTS, GENDERS, INCOME_LEVELS, EDUCATION_LEVELS,
  // Section H
  MARKET_POSITIONS,
  // Section I
  REGULATION_OPTS, REGULATED_OPTS, TRADEMARK_OPTS, DISCLAIMER_OPTS,
  // Section J
  CALENDAR_LEADS, APPROVAL_TIMEFRAMES, POST_TONES, MEDIA_OPTIONS, REVISION_OPTIONS,
  APPROVAL_REQ_OPTS, STOCK_OPTS,
  // Section K
  REPORT_FREQS, REPORT_FORMATS, MEETING_FREQS, MEETING_FORMATS, METRICS_OPTS,
  DASHBOARD_OPTS,
} from "./onboarding-options"

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

const ALL_PLATFORM_KEYS = PLATFORMS_OPTS.map(p => p.value)

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

  const SECTIONS = [sA, sB, sC, sD, sE, sF, sG, sH, sI, sJ, sK]
  const completed = SECTIONS.filter(s => s && Object.keys(s).length > 0).length
  const total = SECTIONS.length
  const pct = Math.round((completed / total) * 100)
  const isDone = (data: any) => data && Object.keys(data).length > 0
  const id = client.id

  const selectedPlatforms: string[] = Array.isArray(sD.platforms) ? sD.platforms : []
  const platformKeysToRender = selectedPlatforms.length > 0
    ? Array.from(new Set([...selectedPlatforms, ...ALL_PLATFORM_KEYS]))
    : ALL_PLATFORM_KEYS

  const hasLegacyB = sB.core_services || sB.hq_location || sB.regions

  return (
    <div className="space-y-6">
      {/* Progress Bar */}
      <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-zinc-900 font-semibold text-sm">{completed} of {total} sections populated</p>
            <p className="text-zinc-500 text-xs mt-0.5">{pct}% overall progress</p>
          </div>
        </div>
        <div className="w-full bg-zinc-100 rounded-full h-2 overflow-hidden">
          <div
            className="bg-gradient-to-r from-emerald-500 to-[#70BF4B] h-2 rounded-full transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* ── Section A — Business Identity ─────────────────────────────── */}
      <SectionCard title="Step A: Business Identity" accent="#70BF4B" isDone={isDone(sA)}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
          <EField clientId={id} section="section_a" field="legal_name" label="Legal Business Name"
                  value={sA.legal_name || client.legal_name || ""} />
          <EField clientId={id} section="section_a" field="brand_name" label="Brand / Trading Name"
                  value={sA.brand_name || ""} />
          <ESelect clientId={id} section="section_a" field="industry" label="Industry"
                   value={sA.industry || ""} options={INDUSTRIES} />
          <EField clientId={id} section="section_a" field="sub_niche" label="Sub-niche / Specialty"
                  value={sA.sub_niche || ""} />
          <ESelect clientId={id} section="section_a" field="business_model" label="Business Model"
                   value={sA.business_model || ""} options={BUSINESS_MODELS} />
          <ESelect clientId={id} section="section_a" field="business_type" label="Business Type"
                   value={sA.business_type || ""} options={BUSINESS_TYPES} />
          <EField clientId={id} section="section_a" field="year_est" label="Year Established"
                  value={sA.year_est || ""} inputType="number" />
          <ESelect clientId={id} section="section_a" field="team_size" label="Team Size"
                   value={sA.team_size || ""} options={TEAM_SIZES} />
          <EField clientId={id} section="section_a" field="website_url" label="Website URL"
                  value={sA.website_url || sA.website || ""} inputType="url" />
          <EField clientId={id} section="section_a" field="city" label="City / HQ"
                  value={sA.city || ""} />
          <ESelect clientId={id} section="section_a" field="geography" label="Geographic Focus"
                   value={sA.geography || ""} options={GEOGRAPHIES} />
          <ESelect clientId={id} section="section_a" field="timezone" label="Timezone"
                   value={sA.timezone || ""} options={TIMEZONES} />
          <EField clientId={id} section="section_a" field="gst_number" label="GST Number"
                  value={sA.gst_number || ""} />
        </div>
        <ETextarea clientId={id} section="section_a" field="mission" label="Mission Statement"
                   value={sA.mission || ""} />
        <ETextarea clientId={id} section="section_a" field="biz_summary" label="Business Summary"
                   value={sA.biz_summary || ""} />
        <ETextarea clientId={id} section="section_a" field="additional_notes" label="Additional Notes"
                   value={sA.additional_notes || ""} />
      </SectionCard>

      {/* ── Section B — Contacts & Communication ───────────────────────── */}
      <SectionCard title="Step B: Contacts & Communication" accent="#D0F255" isDone={isDone(sB)}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
          <EField clientId={id} section="section_b" field="founder_name" label="Founder / Owner Name"
                  value={sB.founder_name || ""} />
          <ESelect clientId={id} section="section_b" field="founder_role" label="Role / Title"
                   value={sB.founder_role || ""} options={FOUNDER_ROLES} />
          <EField clientId={id} section="section_b" field="email" label="Business Email"
                  value={sB.email || ""} inputType="email" />
          <EField clientId={id} section="section_b" field="whatsapp" label="WhatsApp Number"
                  value={sB.whatsapp || ""} />
          <EField clientId={id} section="section_b" field="contact2_name" label="Secondary Name"
                  value={sB.contact2_name || ""} />
          <EField clientId={id} section="section_b" field="contact2_role" label="Secondary Role"
                  value={sB.contact2_role || ""} />
          <EField clientId={id} section="section_b" field="contact2_email" label="Secondary Email"
                  value={sB.contact2_email || ""} inputType="email" />
          <EField clientId={id} section="section_b" field="contact2_phone" label="Secondary Phone"
                  value={sB.contact2_phone || ""} />
          <EField clientId={id} section="section_b" field="ap_name" label="Approving Person (AP)"
                  value={sB.ap_name || ""} />
          <EField clientId={id} section="section_b" field="ap_email" label="AP Email"
                  value={sB.ap_email || ""} inputType="email" />
          <ESelect clientId={id} section="section_b" field="comm_channel" label="Preferred Channel"
                   value={sB.comm_channel || ""} options={COMM_CHANNELS} />
          <ESelect clientId={id} section="section_b" field="best_time" label="Best Time to Reach"
                   value={sB.best_time || ""} options={BEST_TIMES} />
          <ESelect clientId={id} section="section_b" field="language" label="Preferred Language"
                   value={sB.language || ""} options={LANGUAGES} />
          <EField clientId={id} section="section_b" field="response_sla" label="Response SLA"
                  value={sB.response_sla || ""} />
        </div>
        <ETextarea clientId={id} section="section_b" field="additional_notes" label="Additional Notes"
                   value={sB.additional_notes || ""} />

        {hasLegacyB && (
          <div className="mt-4 pt-4 border-t border-zinc-100">
            <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-2">Legacy Fields (admin-only)</p>
            <ETextarea clientId={id} section="section_b" field="core_services" label="Core Services"
                       value={sB.core_services || ""} />
            <EField clientId={id} section="section_b" field="hq_location" label="HQ Location"
                    value={sB.hq_location || ""} />
            <EField clientId={id} section="section_b" field="regions" label="Operational Regions"
                    value={sB.regions || ""} />
          </div>
        )}
      </SectionCard>

      {/* ── Section C — Branding & Visual Identity ─────────────────────── */}
      <SectionCard title="Step C: Branding & Visual Identity" accent="#70BF4B" isDone={isDone(sC)}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
          <EUrlPreview clientId={id} section="section_c" field="logo_primary_url" label="Primary Logo"
                       value={sC.logo_primary_url || ""} />
          <EUrlPreview clientId={id} section="section_c" field="logo_dark_url" label="Logo (Dark BG)"
                       value={sC.logo_dark_url || ""} />
          <EUrlPreview clientId={id} section="section_c" field="logo_icon_url" label="Logo Icon / Favicon"
                       value={sC.logo_icon_url || ""} />

          <EField clientId={id} section="section_c" field="color_primary" label="Primary Colour"
                  value={sC.color_primary || sC.colors?.primary || ""} inputType="color" />
          <EField clientId={id} section="section_c" field="color_secondary" label="Secondary Colour"
                  value={sC.color_secondary || ""} inputType="color" />
          <EField clientId={id} section="section_c" field="color_accent" label="Accent Colour"
                  value={sC.color_accent || ""} inputType="color" />
          <EField clientId={id} section="section_c" field="color_4" label="Colour 4"
                  value={sC.color_4 || ""} inputType="color" />
          <EField clientId={id} section="section_c" field="color_5" label="Colour 5"
                  value={sC.color_5 || ""} inputType="color" />
          <EField clientId={id} section="section_c" field="color_6" label="Colour 6"
                  value={sC.color_6 || ""} inputType="color" />

          <EField clientId={id} section="section_c" field="font_primary" label="Primary Font"
                  value={sC.font_primary || ""} />
          <EField clientId={id} section="section_c" field="font_secondary" label="Secondary Font"
                  value={sC.font_secondary || ""} />

          <EField clientId={id} section="section_c" field="tagline" label="Tagline / Slogan"
                  value={sC.tagline || ""} />
          <ESelect clientId={id} section="section_c" field="tone" label="Overall Tone"
                   value={sC.tone || ""} options={TONES} />
        </div>

        <ETextarea clientId={id} section="section_c" field="brand_mission" label="Brand Mission"
                   value={sC.brand_mission || sC.mission || ""} />
        <ETextarea clientId={id} section="section_c" field="brand_story" label="Brand Story"
                   value={sC.brand_story || ""} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
          <ESlider clientId={id} section="section_c" field="tone_slider_1" label="Formal ↔ Casual"
                   value={sC.tone_slider_1 ?? 5} leftLabel="Very Formal" rightLabel="Very Casual" />
          <ESlider clientId={id} section="section_c" field="tone_slider_2" label="Serious ↔ Playful"
                   value={sC.tone_slider_2 ?? 5} leftLabel="Very Serious" rightLabel="Very Playful" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
          <ETextarea clientId={id} section="section_c" field="voice_positive" label="Voice DO's"
                     value={sC.voice_positive || ""} />
          <ETextarea clientId={id} section="section_c" field="voice_negative" label="Voice DON'Ts"
                     value={sC.voice_negative || ""} />
          <ETextarea clientId={id} section="section_c" field="words_use" label="Words to Use"
                     value={sC.words_use || ""} />
          <ETextarea clientId={id} section="section_c" field="words_avoid" label="Words to Avoid"
                     value={sC.words_avoid || ""} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
          <EUrlPreview clientId={id} section="section_c" field="style_refs" label="Style Reference URL"
                       value={sC.style_refs || ""} />
          <EUrlPreview clientId={id} section="section_c" field="guidelines_url" label="Brand Guidelines URL"
                       value={sC.guidelines_url || ""} />
          <EUrlPreview clientId={id} section="section_c" field="asset_library" label="Asset Library Link"
                       value={sC.asset_library || ""} />
          <EUrlPreview clientId={id} section="section_c" field="brand_zip_url" label="Brand Asset ZIP"
                       value={sC.brand_zip_url || ""} />
        </div>

        <ETextarea clientId={id} section="section_c" field="best_content" label="Best Existing Content"
                   value={sC.best_content || ""} />
        <ETextarea clientId={id} section="section_c" field="additional_notes" label="Additional Notes"
                   value={sC.additional_notes || ""} />
      </SectionCard>

      {/* ── Section D — Social Media ──────────────────────────────────── */}
      <SectionCard title="Step D: Social Media" accent="#D0F255" isDone={isDone(sD)}>
        <EMultiSelect clientId={id} section="section_d" field="platforms" label="Active / Target Platforms"
                      value={sD.platforms || []} options={PLATFORMS_OPTS} />
        <EMultiSelect clientId={id} section="section_d" field="content_formats" label="Content Formats"
                      value={sD.content_formats || []} options={CONTENT_FORMATS} />
        <ESelect clientId={id} section="section_d" field="post_frequency" label="Target Posting Frequency"
                 value={sD.post_frequency || ""} options={POST_FREQUENCIES} />
        <ETextarea clientId={id} section="section_d" field="social_history" label="Social Media History"
                   value={sD.social_history || ""} />
        <ETextarea clientId={id} section="section_d" field="social_risks" label="Known Risks / Sensitivities"
                   value={sD.social_risks || ""} />

        <div className="mt-4 pt-4 border-t border-zinc-100 space-y-3">
          <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-2">Per-Platform Modules</p>
          <div className="grid grid-cols-1 gap-3">
            {platformKeysToRender.map(key => (
              <PlatformModuleCard
                key={key}
                clientId={id}
                platformKey={key}
                platformData={sD[key] || {}}
              />
            ))}
          </div>
        </div>
      </SectionCard>

      {/* ── Section E — Technical Setup ────────────────────────────────── */}
      <SectionCard title="Step E: Technical Setup" accent="#70BF4B" isDone={isDone(sE)}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
          <ESelect clientId={id} section="section_e" field="website_platform" label="Website Platform / CMS"
                   value={sE.website_platform || sE.cms || ""} options={WEBSITE_PLATFORMS} />
          <ESelect clientId={id} section="section_e" field="cms_access" label="CMS / Website Access"
                   value={sE.cms_access || ""} options={ACCESS_OPTIONS} />
          <ESelect clientId={id} section="section_e" field="analytics_platform" label="Analytics Platform"
                   value={sE.analytics_platform || ""} options={ANALYTICS_PLATFORMS} />
          <ESelect clientId={id} section="section_e" field="analytics_access" label="Analytics Access"
                   value={sE.analytics_access || ""} options={ACCESS_OPTIONS} />
          <ESelect clientId={id} section="section_e" field="tag_manager" label="Google Tag Manager?"
                   value={sE.tag_manager || ""} options={TAG_MANAGER_OPTS} />
          <ESelect clientId={id} section="section_e" field="tag_manager_access" label="GTM Access"
                   value={sE.tag_manager_access || ""} options={ACCESS_OPTIONS} />
          <ESelect clientId={id} section="section_e" field="ad_accounts_access" label="Ad Account Access"
                   value={sE.ad_accounts_access || ""} options={ACCESS_OPTIONS} />
          <ESelect clientId={id} section="section_e" field="crm_platform" label="CRM Platform"
                   value={sE.crm_platform || ""} options={CRM_PLATFORMS} />
          <ESelect clientId={id} section="section_e" field="crm_access" label="CRM Access"
                   value={sE.crm_access || ""} options={ACCESS_OPTIONS} />
          <ESelect clientId={id} section="section_e" field="email_platform" label="Email Marketing Platform"
                   value={sE.email_platform || ""} options={EMAIL_PLATFORMS} />
          <ESelect clientId={id} section="section_e" field="email_access" label="Email Platform Access"
                   value={sE.email_access || ""} options={ACCESS_OPTIONS} />
          <ESelect clientId={id} section="section_e" field="social_scheduler" label="Social Media Scheduler"
                   value={sE.social_scheduler || ""} options={SCHEDULERS} />
          <EField clientId={id} section="section_e" field="hosting_provider" label="Hosting Provider"
                  value={sE.hosting_provider || sE.hosting || ""} />
          <EField clientId={id} section="section_e" field="domain_registrar" label="Domain Registrar"
                  value={sE.domain_registrar || sE.registrar || ""} />
          <EField clientId={id} section="section_e" field="ga_id" label="Google Analytics ID"
                  value={sE.ga_id || ""} />
        </div>
        <EMultiSelect clientId={id} section="section_e" field="ad_platforms" label="Active Ad Platforms"
                      value={sE.ad_platforms || []} options={AD_PLATFORMS_OPTS} />
        <ETextarea clientId={id} section="section_e" field="api_access_notes" label="API / Integration Notes"
                   value={sE.api_access_notes || ""} />
        <ETextarea clientId={id} section="section_e" field="additional_notes" label="Additional Notes"
                   value={sE.additional_notes || ""} />
      </SectionCard>

      {/* ── Section F — Goals & Strategy ───────────────────────────────── */}
      <SectionCard title="Step F: Goals & Strategy" accent="#D0F255" isDone={isDone(sF)}>
        <ESelect clientId={id} section="section_f" field="primary_goal" label="Primary Business Goal"
                 value={sF.primary_goal || ""} options={PRIMARY_GOALS} />
        <EMultiSelect clientId={id} section="section_f" field="secondary_goals" label="Secondary Goals"
                      value={sF.secondary_goals || []} options={SECONDARY_GOAL_OPTS} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
          <EField clientId={id} section="section_f" field="revenue_target" label="Revenue Target"
                  value={sF.revenue_target || ""} />
          <EField clientId={id} section="section_f" field="lead_target" label="Lead / Sales Target"
                  value={sF.lead_target || ""} />
          <EField clientId={id} section="section_f" field="current_monthly_revenue" label="Current Monthly Revenue"
                  value={sF.current_monthly_revenue || ""} />
          <EField clientId={id} section="section_f" field="target_monthly_revenue" label="Target Monthly Revenue"
                  value={sF.target_monthly_revenue || ""} />
          <ESelect clientId={id} section="section_f" field="timeframe" label="Timeframe"
                   value={sF.timeframe || ""} options={TIMEFRAMES} />
          <ESelect clientId={id} section="section_f" field="budget_monthly" label="Monthly Marketing Budget"
                   value={sF.budget_monthly || ""} options={BUDGET_OPTIONS} />
          <ESelect clientId={id} section="section_f" field="growth_stage" label="Growth Stage"
                   value={sF.growth_stage || ""} options={GROWTH_STAGES} />
        </div>

        <EMultiSelect clientId={id} section="section_f" field="kpis" label="KPIs to Track"
                      value={sF.kpis || []} options={KPI_OPTS} />
        <EMultiSelect clientId={id} section="section_f" field="common_pain_points" label="Common Pain Points"
                      value={sF.common_pain_points || sF.pain_points || []} options={COMMON_PAIN_POINTS_OPTS} />
        <EMultiSelect clientId={id} section="section_f" field="sector_pain_points" label="Sector Pain Points"
                      value={sF.sector_pain_points || []} options={SECTOR_PAIN_POINTS_OPTS} />

        <ETextarea clientId={id} section="section_f" field="pain_points_detail" label="Pain Points Detail"
                   value={sF.pain_points_detail || ""} />
        <ETextarea clientId={id} section="section_f" field="biggest_challenge" label="Biggest Current Challenge"
                   value={sF.biggest_challenge || ""} />
        <ETextarea clientId={id} section="section_f" field="previous_strategy" label="Previous Strategy"
                   value={sF.previous_strategy || ""} />
        <ETextarea clientId={id} section="section_f" field="usp" label="Unique Value Proposition (USP)"
                   value={sF.usp || ""} />
        <ETextarea clientId={id} section="section_f" field="revenue_targets" label="Revenue Targets (legacy)"
                   value={sF.revenue_targets || ""} />
        <ETextarea clientId={id} section="section_f" field="additional_notes" label="Additional Notes"
                   value={sF.additional_notes || ""} />
      </SectionCard>

      {/* ── Section G — Target Audience ────────────────────────────────── */}
      <SectionCard title="Step G: Target Audience" accent="#70BF4B" isDone={isDone(sG)}>
        <ETextarea clientId={id} section="section_g" field="primary_audience" label="Primary Audience Description"
                   value={sG.primary_audience || sG.icp_description || ""} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
          <ESelect clientId={id} section="section_g" field="gender" label="Gender Focus"
                   value={sG.gender || ""} options={GENDERS} />
          <ESelect clientId={id} section="section_g" field="income_level" label="Income Level"
                   value={sG.income_level || ""} options={INCOME_LEVELS} />
          <ESelect clientId={id} section="section_g" field="education" label="Education Level"
                   value={sG.education || ""} options={EDUCATION_LEVELS} />
          <EField clientId={id} section="section_g" field="location_targeting" label="Location Targeting"
                  value={sG.location_targeting || sG.geo_target || ""} />
        </div>

        <EMultiSelect clientId={id} section="section_g" field="age_range" label="Age Range(s)"
                      value={sG.age_range || sG.age_groups || []} options={AGE_OPTS} />

        <ETextarea clientId={id} section="section_g" field="interests" label="Interests & Lifestyle"
                   value={sG.interests || ""} />
        <ETextarea clientId={id} section="section_g" field="pain_points" label="Core Pain Points"
                   value={sG.pain_points || ""} />
        <ETextarea clientId={id} section="section_g" field="buying_triggers" label="Buying Triggers"
                   value={sG.buying_triggers || ""} />
        <ETextarea clientId={id} section="section_g" field="customer_journey" label="Customer Journey"
                   value={sG.customer_journey || ""} />
        <ETextarea clientId={id} section="section_g" field="existing_customers_desc" label="Existing Customers"
                   value={sG.existing_customers_desc || ""} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
          <EField clientId={id} section="section_g" field="persona_name" label="Persona Name"
                  value={sG.persona_name || ""} />
          <EField clientId={id} section="section_g" field="persona_details" label="Persona Details"
                  value={sG.persona_details || ""} />
        </div>

        <ETextarea clientId={id} section="section_g" field="additional_notes" label="Additional Notes"
                   value={sG.additional_notes || ""} />
      </SectionCard>

      {/* ── Section H — Competitive Landscape ──────────────────────────── */}
      <SectionCard title="Step H: Competitive Landscape" accent="#D0F255" isDone={isDone(sH)}>
        {[1, 2, 3].map(n => (
          <div key={n} className="bg-zinc-50 rounded-xl p-4 mb-3 border border-zinc-100">
            <p className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold mb-2">Competitor {n}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
              <EField clientId={id} section="section_h" field={`competitor_${n}_name`} label="Name"
                      value={sH[`competitor_${n}_name`] || ""} />
              <EField clientId={id} section="section_h" field={`competitor_${n}_url`} label="Website"
                      value={sH[`competitor_${n}_url`] || ""} inputType="url" />
            </div>
            <ETextarea clientId={id} section="section_h" field={`competitor_${n}_strength`} label="What they do well"
                       value={sH[`competitor_${n}_strength`] || ""} />
            <ETextarea clientId={id} section="section_h" field={`competitor_${n}_weakness`} label="Where they fall short"
                       value={sH[`competitor_${n}_weakness`] || ""} />
          </div>
        ))}

        <ESelect clientId={id} section="section_h" field="market_position" label="Current Market Position"
                 value={sH.market_position || ""} options={MARKET_POSITIONS} />
        <ETextarea clientId={id} section="section_h" field="differentiator" label="Key Differentiator"
                   value={sH.differentiator || ""} />
        <ETextarea clientId={id} section="section_h" field="industry_trends" label="Industry Trends"
                   value={sH.industry_trends || ""} />
        <ETextarea clientId={id} section="section_h" field="top_competitors" label="Top Competitors (legacy)"
                   value={sH.top_competitors || ""} />
        <ETextarea clientId={id} section="section_h" field="usp" label="USP (legacy)"
                   value={sH.usp || ""} />
        <ETextarea clientId={id} section="section_h" field="additional_notes" label="Additional Notes"
                   value={sH.additional_notes || ""} />
      </SectionCard>

      {/* ── Section I — Legal & Compliance ─────────────────────────────── */}
      <SectionCard title="Step I: Legal & Compliance" accent="#70BF4B" isDone={isDone(sI)}>
        <ESelect clientId={id} section="section_i" field="industry_regulated" label="Regulated Industry?"
                 value={sI.industry_regulated || (sI.is_regulated ? "yes" : "")} options={REGULATED_OPTS} />
        <EMultiSelect clientId={id} section="section_i" field="regulation_type" label="Applicable Regulations"
                      value={sI.regulation_type || []} options={REGULATION_OPTS} />
        <ETextarea clientId={id} section="section_i" field="legal_restrictions" label="Legal Restrictions"
                   value={sI.legal_restrictions || ""} />
        <ETextarea clientId={id} section="section_i" field="content_restrictions" label="Content Restrictions"
                   value={sI.content_restrictions || ""} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
          <ESelect clientId={id} section="section_i" field="trademark_names" label="Registered Trademarks?"
                   value={sI.trademark_names || ""} options={TRADEMARK_OPTS} />
          <EField clientId={id} section="section_i" field="trademark_details" label="Trademark Details"
                  value={sI.trademark_details || ""} />
          <ESelect clientId={id} section="section_i" field="disclaimers_required" label="Disclaimers Required?"
                   value={sI.disclaimers_required || ""} options={DISCLAIMER_OPTS} />
          <ETextarea clientId={id} section="section_i" field="disclaimer_text" label="Disclaimer Text"
                     value={sI.disclaimer_text || ""} />
          <EUrlPreview clientId={id} section="section_i" field="privacy_policy_url" label="Privacy Policy URL"
                       value={sI.privacy_policy_url || ""} />
          <EUrlPreview clientId={id} section="section_i" field="terms_url" label="Terms of Service URL"
                       value={sI.terms_url || ""} />
        </div>

        <EField clientId={id} section="section_i" field="data_handling_consent" label="Data Consent (yes/no)"
                value={sI.data_handling_consent || ""} />
        <ETextarea clientId={id} section="section_i" field="regulatory_bodies" label="Regulatory Bodies (legacy)"
                   value={sI.regulatory_bodies || ""} />
        <ETextarea clientId={id} section="section_i" field="disallowed_topics" label="Disallowed Topics (legacy)"
                   value={sI.disallowed_topics || ""} />
        <ETextarea clientId={id} section="section_i" field="additional_notes" label="Additional Notes"
                   value={sI.additional_notes || ""} />
      </SectionCard>

      {/* ── Section J — Content & Approval ─────────────────────────────── */}
      <SectionCard title="Step J: Content & Approval" accent="#D0F255" isDone={isDone(sJ)}>
        <ESelect clientId={id} section="section_j" field="content_calendar_lead" label="Who leads the calendar?"
                 value={sJ.content_calendar_lead || ""} options={CALENDAR_LEADS} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
          <EField clientId={id} section="section_j" field="content_pillar_1" label="Pillar 1"
                  value={sJ.content_pillar_1 || ""} />
          <EField clientId={id} section="section_j" field="content_pillar_2" label="Pillar 2"
                  value={sJ.content_pillar_2 || ""} />
          <EField clientId={id} section="section_j" field="content_pillar_3" label="Pillar 3"
                  value={sJ.content_pillar_3 || ""} />
          <EField clientId={id} section="section_j" field="content_pillar_4" label="Pillar 4"
                  value={sJ.content_pillar_4 || ""} />
          <EField clientId={id} section="section_j" field="content_pillar_5" label="Pillar 5"
                  value={sJ.content_pillar_5 || ""} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
          <ESelect clientId={id} section="section_j" field="approval_required" label="Approval Required?"
                   value={sJ.approval_required || ""} options={APPROVAL_REQ_OPTS} />
          <ESelect clientId={id} section="section_j" field="approval_timeframe" label="Approval Timeframe"
                   value={sJ.approval_timeframe || ""} options={APPROVAL_TIMEFRAMES} />
          <EField clientId={id} section="section_j" field="approver_name" label="Approver Name"
                  value={sJ.approver_name || ""} />
          <EField clientId={id} section="section_j" field="approver_email" label="Approver Email"
                  value={sJ.approver_email || ""} inputType="email" />
          <ESelect clientId={id} section="section_j" field="post_tone" label="Post Tone / Style"
                   value={sJ.post_tone || ""} options={POST_TONES} />
          <ESelect clientId={id} section="section_j" field="media_provided_by" label="Media Provided By"
                   value={sJ.media_provided_by || ""} options={MEDIA_OPTIONS} />
          <ESelect clientId={id} section="section_j" field="stock_approved" label="Stock Approved?"
                   value={sJ.stock_approved || ""} options={STOCK_OPTS} />
          <ESelect clientId={id} section="section_j" field="revision_rounds" label="Revision Rounds"
                   value={sJ.revision_rounds || ""} options={REVISION_OPTIONS} />
        </div>

        <ETextarea clientId={id} section="section_j" field="content_dos" label="Content DO's"
                   value={sJ.content_dos || ""} />
        <ETextarea clientId={id} section="section_j" field="content_donts" label="Content DON'Ts"
                   value={sJ.content_donts || ""} />
        <ETextarea clientId={id} section="section_j" field="emergency_protocol" label="Emergency Protocol"
                   value={sJ.emergency_protocol || ""} />
        <ETextarea clientId={id} section="section_j" field="pillars" label="Key Content Pillars (legacy)"
                   value={sJ.pillars || ""} />
        <ETextarea clientId={id} section="section_j" field="additional_notes" label="Additional Notes"
                   value={sJ.additional_notes || ""} />
      </SectionCard>

      {/* ── Section K — Reporting ──────────────────────────────────────── */}
      <SectionCard title="Step K: Reporting" accent="#70BF4B" isDone={isDone(sK)}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
          <ESelect clientId={id} section="section_k" field="report_frequency" label="Report Frequency"
                   value={sK.report_frequency || sK.reporting_cycle || ""} options={REPORT_FREQS} />
          <ESelect clientId={id} section="section_k" field="report_format" label="Report Format"
                   value={sK.report_format || ""} options={REPORT_FORMATS} />
          <EField clientId={id} section="section_k" field="report_recipients" label="Report Recipients"
                  value={sK.report_recipients || ""} />
          <ESelect clientId={id} section="section_k" field="meeting_frequency" label="Meeting Frequency"
                   value={sK.meeting_frequency || ""} options={MEETING_FREQS} />
          <ESelect clientId={id} section="section_k" field="meeting_format" label="Meeting Format"
                   value={sK.meeting_format || ""} options={MEETING_FORMATS} />
          <ESelect clientId={id} section="section_k" field="dashboard_access" label="Live Dashboard Access?"
                   value={sK.dashboard_access || ""} options={DASHBOARD_OPTS} />
          <EField clientId={id} section="section_k" field="escalation_contact" label="Escalation Contact"
                  value={sK.escalation_contact || ""} />
        </div>

        <EMultiSelect clientId={id} section="section_k" field="metrics_priority" label="Priority Metrics"
                      value={sK.metrics_priority || []} options={METRICS_OPTS} />
        <ETextarea clientId={id} section="section_k" field="metrics" label="Reporting Metrics (legacy)"
                   value={sK.metrics || ""} />
        <EField clientId={id} section="section_k" field="portal_access" label="Client Portal Access (legacy)"
                value={String(sK.portal_access ?? "false")} inputType="checkbox" />
        <ETextarea clientId={id} section="section_k" field="additional_notes" label="Additional Notes"
                   value={sK.additional_notes || ""} />
      </SectionCard>
    </div>
  )
}
