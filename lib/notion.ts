import { Client } from '@notionhq/client'

const notion = new Client({ auth: process.env.NOTION_API_KEY })

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function queryDB(data_source_id: string): Promise<any[]> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await (notion as any).dataSources.query({ data_source_id })
    return res.results ?? []
  } catch (e) {
    console.error(`[Notion] queryDB(${data_source_id}):`, e)
    return []
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getPage(page_id: string): Promise<any | null> {
  try {
    return await notion.pages.retrieve({ page_id })
  } catch {
    return null
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function updatePage(page_id: string, properties: Record<string, any>): Promise<void> {
  await notion.pages.update({ page_id, properties })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function createClientPage(properties: Record<string, any>): Promise<any> {
  return notion.pages.create({
    parent: { database_id: process.env.NOTION_CLIENTS_DB! },
    properties,
  })
}

export const getClients        = () => queryDB(process.env.NOTION_CLIENTS_DB!)
export const getSocialAccounts = () => queryDB(process.env.NOTION_SOCIAL_ACCOUNTS_DB!)
export const getBrandAssets    = () => queryDB(process.env.NOTION_BRAND_ASSETS_DB!)
export const getOnboarding     = () => queryDB(process.env.NOTION_ONBOARDING_DB!)
export const getContentCalendar = () => queryDB(process.env.NOTION_CONTENT_CALENDAR_DB!)
