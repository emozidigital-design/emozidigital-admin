export type ChecklistItem = {
  phase: number
  key: string
  label: string
  owner: 'Client' | 'Team' | 'AI'
  priority: 'High' | 'Medium' | 'Low'
}

export const PHASE_TITLES: Record<number, string> = {
  0: 'Legal & Finance',
  1: 'Internal Resource Allocation',
  2: 'Form Completion Tracking',
  3: 'Brand Kit Generation',
  4: 'Social Media Account Audit & Creation',
  5: 'Technical Setup & Tracking',
  6: 'Profile Population & Brand Setup',
  7: 'AI System Setup',
  8: 'Content Readiness & Automation Setup',
  9: 'Kickoff Call & Final Handoff',
}

export const CHECKLIST_ITEMS: ChecklistItem[] = [
  // PHASE 0: Legal & Finance
  { phase: 0, key: 'p0_1',  label: 'Signed service agreement / contract received', owner: 'Client', priority: 'High' },
  { phase: 0, key: 'p0_2',  label: 'Invoice raised and sent',                       owner: 'Team',   priority: 'High' },
  { phase: 0, key: 'p0_3',  label: 'Advance payment received',                       owner: 'Client', priority: 'High' },
  { phase: 0, key: 'p0_4',  label: 'NDA signed (if required)',                        owner: 'Client', priority: 'Medium' },
  { phase: 0, key: 'p0_5',  label: 'GST invoice issued',                              owner: 'Team',   priority: 'Medium' },
  { phase: 0, key: 'p0_6',  label: 'Client added to CRM (HubSpot)',                   owner: 'Team',   priority: 'High' },
  { phase: 0, key: 'p0_7',  label: 'Deal stage updated in HubSpot',                   owner: 'Team',   priority: 'Medium' },
  { phase: 0, key: 'p0_8',  label: 'Internal project budget allocated',               owner: 'Team',   priority: 'Low' },

  // PHASE 1: Internal Resource Allocation
  { phase: 1, key: 'p1_1',  label: 'Account Manager assigned',                        owner: 'Team',   priority: 'High' },
  { phase: 1, key: 'p1_2',  label: 'Content Executive assigned',                      owner: 'Team',   priority: 'High' },
  { phase: 1, key: 'p1_3',  label: 'Developer assigned (if needed)',                  owner: 'Team',   priority: 'Medium' },
  { phase: 1, key: 'p1_4',  label: 'Notion client workspace created',                 owner: 'Team',   priority: 'High' },
  { phase: 1, key: 'p1_5',  label: 'Internal Slack channel created',                  owner: 'Team',   priority: 'Medium' },
  { phase: 1, key: 'p1_6',  label: 'Project timeline set',                            owner: 'Team',   priority: 'High' },
  { phase: 1, key: 'p1_7',  label: 'Kickoff call scheduled',                          owner: 'Team',   priority: 'High' },

  // PHASE 2: Form Completion Tracking
  { phase: 2, key: 'p2_1',  label: 'Onboarding form link sent to client',             owner: 'Team',   priority: 'High' },
  { phase: 2, key: 'p2_2',  label: 'Section A: Business Info — completed',            owner: 'Client', priority: 'High' },
  { phase: 2, key: 'p2_3',  label: 'Section B: Contacts — completed',                 owner: 'Client', priority: 'High' },
  { phase: 2, key: 'p2_4',  label: 'Section C: Branding — completed',                 owner: 'Client', priority: 'High' },
  { phase: 2, key: 'p2_5',  label: 'Section D: Social Media — completed',             owner: 'Client', priority: 'High' },
  { phase: 2, key: 'p2_6',  label: 'Section E: Technical Setup — completed',          owner: 'Client', priority: 'Medium' },
  { phase: 2, key: 'p2_7',  label: 'Section F: Business Goals — completed',           owner: 'Client', priority: 'High' },
  { phase: 2, key: 'p2_8',  label: 'Section G: Target Audience — completed',          owner: 'Client', priority: 'High' },
  { phase: 2, key: 'p2_9',  label: 'Section H: Competitor Intel — completed',         owner: 'Client', priority: 'Medium' },
  { phase: 2, key: 'p2_10', label: 'Section I: Legal & Compliance — completed',       owner: 'Client', priority: 'Medium' },
  { phase: 2, key: 'p2_11', label: 'Section J: Content Preferences — completed',      owner: 'Client', priority: 'Medium' },
  { phase: 2, key: 'p2_12', label: 'Section K: Reporting — completed',                owner: 'Client', priority: 'Medium' },
  { phase: 2, key: 'p2_13', label: 'All required fields validated by AM',             owner: 'Team',   priority: 'High' },
  { phase: 2, key: 'p2_14', label: 'Missing info follow-up sent (if any)',            owner: 'Team',   priority: 'Medium' },
  { phase: 2, key: 'p2_15', label: 'Logo files received in correct formats',          owner: 'Client', priority: 'High' },
  { phase: 2, key: 'p2_16', label: 'Brand assets zipped and stored',                  owner: 'Team',   priority: 'Medium' },

  // PHASE 3: Brand Kit Generation
  { phase: 3, key: 'p3_1',  label: 'Brand color palette confirmed',                   owner: 'Team',   priority: 'High' },
  { phase: 3, key: 'p3_2',  label: 'Typography set selected',                         owner: 'Team',   priority: 'Medium' },
  { phase: 3, key: 'p3_3',  label: 'Brand tone document created',                     owner: 'Team',   priority: 'High' },
  { phase: 3, key: 'p3_4',  label: 'Social media image templates created (Canva)',    owner: 'Team',   priority: 'High' },
  { phase: 3, key: 'p3_5',  label: 'Profile picture variants created',                owner: 'Team',   priority: 'High' },
  { phase: 3, key: 'p3_6',  label: 'Cover image variants created',                    owner: 'Team',   priority: 'High' },
  { phase: 3, key: 'p3_7',  label: 'Story/Reel template created',                     owner: 'Team',   priority: 'Medium' },
  { phase: 3, key: 'p3_8',  label: 'Brand kit shared with client for approval',       owner: 'Team',   priority: 'High' },
  { phase: 3, key: 'p3_9',  label: 'Client brand kit approval received',              owner: 'Client', priority: 'High' },
  { phase: 3, key: 'p3_10', label: 'Final brand kit stored in Drive/Notion',          owner: 'Team',   priority: 'Medium' },
  { phase: 3, key: 'p3_11', label: 'Brand vault created in admin panel',              owner: 'Team',   priority: 'Medium' },

  // PHASE 4: Social Media Account Audit & Creation
  { phase: 4, key: 'p4_1',  label: 'Instagram — audit or create account',             owner: 'Team',   priority: 'High' },
  { phase: 4, key: 'p4_2',  label: 'Facebook Page — audit or create',                 owner: 'Team',   priority: 'High' },
  { phase: 4, key: 'p4_3',  label: 'LinkedIn Company Page — audit or create',         owner: 'Team',   priority: 'High' },
  { phase: 4, key: 'p4_4',  label: 'LinkedIn Personal — access confirmed',            owner: 'Client', priority: 'Medium' },
  { phase: 4, key: 'p4_5',  label: 'Twitter/X — audit or create',                    owner: 'Team',   priority: 'Medium' },
  { phase: 4, key: 'p4_6',  label: 'YouTube channel — audit or create',               owner: 'Team',   priority: 'Medium' },
  { phase: 4, key: 'p4_7',  label: 'Google Business Profile — audit or create',       owner: 'Team',   priority: 'High' },
  { phase: 4, key: 'p4_8',  label: 'WhatsApp Business — setup or access',             owner: 'Team',   priority: 'High' },
  { phase: 4, key: 'p4_9',  label: 'Pinterest — audit or create',                    owner: 'Team',   priority: 'Low' },
  { phase: 4, key: 'p4_10', label: 'Meta Business Manager — client added',            owner: 'Team',   priority: 'High' },
  { phase: 4, key: 'p4_11', label: 'All credentials stored in Section L',             owner: 'Team',   priority: 'High' },
  { phase: 4, key: 'p4_12', label: 'Access shared with team members',                 owner: 'Team',   priority: 'Medium' },
  { phase: 4, key: 'p4_13', label: '2FA set up on all accounts',                      owner: 'Team',   priority: 'High' },

  // PHASE 5: Technical Setup & Tracking
  { phase: 5, key: 'p5_1',  label: 'GA4 property created and code installed',         owner: 'Team',   priority: 'High' },
  { phase: 5, key: 'p5_2',  label: 'Google Search Console verified',                  owner: 'Team',   priority: 'High' },
  { phase: 5, key: 'p5_3',  label: 'GTM container installed',                         owner: 'Team',   priority: 'Medium' },
  { phase: 5, key: 'p5_4',  label: 'Meta Pixel installed',                            owner: 'Team',   priority: 'High' },
  { phase: 5, key: 'p5_5',  label: 'LinkedIn Insight Tag installed',                  owner: 'Team',   priority: 'Medium' },
  { phase: 5, key: 'p5_6',  label: 'CRM (HubSpot) connected to website',              owner: 'Team',   priority: 'High' },
  { phase: 5, key: 'p5_7',  label: 'Contact forms tested end-to-end',                 owner: 'Team',   priority: 'High' },
  { phase: 5, key: 'p5_8',  label: 'WhatsApp API or widget live',                     owner: 'Team',   priority: 'Medium' },
  { phase: 5, key: 'p5_9',  label: 'Domain email configured (SPF/DKIM/DMARC)',        owner: 'Team',   priority: 'High' },

  // PHASE 6: Profile Population & Brand Setup
  { phase: 6, key: 'p6_1',  label: 'Instagram bio, DP, highlights set up',            owner: 'Team',   priority: 'High' },
  { phase: 6, key: 'p6_2',  label: 'Facebook Page fully populated',                   owner: 'Team',   priority: 'High' },
  { phase: 6, key: 'p6_3',  label: 'LinkedIn Company Page populated',                 owner: 'Team',   priority: 'High' },
  { phase: 6, key: 'p6_4',  label: 'Twitter/X profile populated',                    owner: 'Team',   priority: 'Medium' },
  { phase: 6, key: 'p6_5',  label: 'YouTube channel art + about set',                 owner: 'Team',   priority: 'Medium' },
  { phase: 6, key: 'p6_6',  label: 'Google Business Profile fully filled',            owner: 'Team',   priority: 'High' },
  { phase: 6, key: 'p6_7',  label: 'WhatsApp Business profile set up',                owner: 'Team',   priority: 'High' },
  { phase: 6, key: 'p6_8',  label: 'Pinterest profile populated',                    owner: 'Team',   priority: 'Low' },
  { phase: 6, key: 'p6_9',  label: 'All profile screenshots taken + stored',          owner: 'Team',   priority: 'Low' },

  // PHASE 7: AI System Setup
  { phase: 7, key: 'p7_1',  label: 'AI prompt set created for client voice',          owner: 'Team',   priority: 'High' },
  { phase: 7, key: 'p7_2',  label: 'Content generation workflow configured',          owner: 'Team',   priority: 'High' },
  { phase: 7, key: 'p7_3',  label: 'Chatbot flow built (if in scope)',                owner: 'Team',   priority: 'Medium' },
  { phase: 7, key: 'p7_4',  label: 'Lead automation workflow live (n8n)',        owner: 'Team',   priority: 'High' },
  { phase: 7, key: 'p7_5',  label: 'WhatsApp automation tested',                     owner: 'Team',   priority: 'Medium' },
  { phase: 7, key: 'p7_6',  label: 'Email sequence configured (Brevo)',               owner: 'Team',   priority: 'Medium' },
  { phase: 7, key: 'p7_7',  label: 'AI system tested with sample inputs',             owner: 'Team',   priority: 'High' },

  // PHASE 8: Content Readiness & Automation Setup
  { phase: 8, key: 'p8_1',  label: 'First 30-day content calendar created',           owner: 'Team',   priority: 'High' },
  { phase: 8, key: 'p8_2',  label: 'First 9 posts designed and ready',                owner: 'Team',   priority: 'High' },
  { phase: 8, key: 'p8_3',  label: 'Captions written and approved',                   owner: 'Team',   priority: 'High' },
  { phase: 8, key: 'p8_4',  label: 'Hashtag sets created per platform',               owner: 'Team',   priority: 'Medium' },
  { phase: 8, key: 'p8_5',  label: 'Content calendar shared with client',             owner: 'Team',   priority: 'High' },
  { phase: 8, key: 'p8_6',  label: 'Client content approval received',                owner: 'Client', priority: 'High' },
  { phase: 8, key: 'p8_7',  label: 'Scheduling tool configured',                     owner: 'Team',   priority: 'Medium' },
  { phase: 8, key: 'p8_8',  label: 'First posts scheduled',                           owner: 'Team',   priority: 'High' },
  { phase: 8, key: 'p8_9',  label: 'Reporting dashboard set up (GA4/Meta)',           owner: 'Team',   priority: 'Medium' },
  { phase: 8, key: 'p8_10', label: 'Monthly report template created',                 owner: 'Team',   priority: 'Low' },
  { phase: 8, key: 'p8_11', label: 'n8n workflows all active + tested',          owner: 'Team',   priority: 'High' },

  // PHASE 9: Kickoff Call & Final Handoff
  { phase: 9, key: 'p9_1',  label: 'Kickoff call completed',                          owner: 'Team',   priority: 'High' },
  { phase: 9, key: 'p9_2',  label: 'Client walkthrough of all deliverables done',     owner: 'Team',   priority: 'High' },
  { phase: 9, key: 'p9_3',  label: 'Client training on tools completed',              owner: 'Team',   priority: 'Medium' },
  { phase: 9, key: 'p9_4',  label: 'Approval flow explained to client',               owner: 'Team',   priority: 'Medium' },
  { phase: 9, key: 'p9_5',  label: 'Reporting schedule confirmed',                    owner: 'Team',   priority: 'Medium' },
  { phase: 9, key: 'p9_6',  label: 'Emergency contact process shared',                owner: 'Team',   priority: 'Low' },
  { phase: 9, key: 'p9_7',  label: 'Sales-to-service handoff checkbox ticked',        owner: 'Team',   priority: 'High' },
  { phase: 9, key: 'p9_8',  label: 'Client status updated to Active in CRM',          owner: 'Team',   priority: 'High' },
  { phase: 9, key: 'p9_9',  label: 'First invoice for Month 2 scheduled',             owner: 'Team',   priority: 'High' },
  { phase: 9, key: 'p9_10', label: 'Onboarding marked Complete in admin panel',       owner: 'Team',   priority: 'High' },
  { phase: 9, key: 'p9_11', label: 'Testimonial / case study request sent',           owner: 'Team',   priority: 'Low' },
]
