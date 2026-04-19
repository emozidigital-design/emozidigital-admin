import { Client } from '@notionhq/client'

const notion = new Client({ auth: process.env.NOTION_API_KEY })

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function queryDB(data_source_id: string): Promise<any[]> {
  const response = await notion.dataSources.query({ data_source_id })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (response as any).results ?? []
}

export const getClients        = () => queryDB(process.env.NOTION_CLIENTS_DB!)
export const getSocialAccounts = () => queryDB(process.env.NOTION_SOCIAL_ACCOUNTS_DB!)
export const getBrandAssets    = () => queryDB(process.env.NOTION_BRAND_ASSETS_DB!)
export const getOnboarding     = () => queryDB(process.env.NOTION_ONBOARDING_DB!)
export const getContentCalendar= () => queryDB(process.env.NOTION_CONTENT_CALENDAR_DB!)
