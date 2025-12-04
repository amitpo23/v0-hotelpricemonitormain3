/**
 * Bright Data MCP (Model Context Protocol) Scraper
 * 
 * Uses Bright Data's official MCP integration for robust scraping
 * Based on: https://github.com/brightdata/brightdata-agent-showcase
 * 
 * Features:
 * - Web Unlocker for bypassing bot detection
 * - Scraping Browser for complex JavaScript sites
 * - Structured data extraction
 * - Search engine integration
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { BookingPriceResult } from './booking-scraper'

interface BrightDataMCPConfig {
  apiToken: string
  webUnlockerZone?: string
  browserZone?: string
}

interface MCPToolResult {
  content: Array<{
    type: string
    text: string
  }>
}

/**
 * Initialize Bright Data MCP Client
 */
async function createMCPClient(config: BrightDataMCPConfig): Promise<Client> {
  console.log('[BrightDataMCP] Initializing MCP client...')
  
  const transport = new StdioClientTransport({
    command: 'npx',
    args: ['@brightdata/mcp'],
    env: {
      ...process.env,
      API_TOKEN: config.apiToken,
      WEB_UNLOCKER_ZONE: config.webUnlockerZone || 'unblocker',
      BROWSER_ZONE: config.browserZone || 'scraping_browser',
    },
  })

  const client = new Client(
    {
      name: 'hotel-price-monitor-client',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  )

  await client.connect(transport)
  console.log('[BrightDataMCP] MCP client connected successfully')
  
  return client
}

/**
 * List available MCP tools
 */
async function listAvailableTools(client: Client): Promise<string[]> {
  try {
    const tools = await client.listTools()
    const toolNames = tools.tools.map((t: any) => t.name)
    console.log('[BrightDataMCP] Available tools:', toolNames)
    return toolNames
  } catch (error) {
    console.error('[BrightDataMCP] Error listing tools:', error)
    return []
  }
}

/**
 * Call an MCP tool
 */
async function callTool(
  client: Client,
  toolName: string,
  args: Record<string, any>
): Promise<MCPToolResult> {
  console.log(`[BrightDataMCP] Calling tool: ${toolName}`)
  console.log(`[BrightDataMCP] Args:`, JSON.stringify(args, null, 2))
  
  try {
    const result = await client.callTool({
      name: toolName,
      arguments: args,
    })
    
    console.log(`[BrightDataMCP] Tool ${toolName} completed successfully`)
    return result as MCPToolResult
  } catch (error) {
    console.error(`[BrightDataMCP] Error calling tool ${toolName}:`, error)
    throw error
  }
}

/**
 * Extract prices from HTML/Markdown content
 */
function extractPricesFromContent(content: string): number[] {
  const prices: number[] = []
  
  // Multiple patterns to catch prices
  const patterns = [
    // ₪1,234 or ₪1234
    /₪\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g,
    // 1,234 ₪ or 1234₪
    /(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*₪/g,
    // ILS 1234
    /ILS\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g,
    // $1,234
    /\$\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g,
    // JSON price patterns
    /"price":\s*(\d+(?:\.\d{2})?)/g,
    /"grossPrice".*?"value":\s*(\d+(?:\.\d{2})?)/g,
  ]

  for (const pattern of patterns) {
    let match
    while ((match = pattern.exec(content)) !== null) {
      const priceStr = match[1].replace(/,/g, '')
      const price = parseFloat(priceStr)
      
      // Valid price range for hotels
      if (price >= 100 && price <= 50000 && !prices.includes(price)) {
        prices.push(price)
      }
    }
  }

  return prices.sort((a, b) => a - b)
}

/**
 * Extract room information from content
 */
function extractRoomInfo(content: string): {
  roomType: string
  hasBreakfast: boolean
} {
  const lowerContent = content.toLowerCase()
  
  const hasBreakfast = 
    lowerContent.includes('breakfast') ||
    lowerContent.includes('ארוחת בוקר') ||
    lowerContent.includes('כולל ארוחה')
  
  let roomType = 'Standard Room'
  
  if (lowerContent.includes('deluxe') || lowerContent.includes('דלוקס')) {
    roomType = 'Deluxe Room'
  } else if (lowerContent.includes('suite') || lowerContent.includes('סוויטה')) {
    roomType = 'Suite'
  } else if (lowerContent.includes('superior') || lowerContent.includes('סופריור')) {
    roomType = 'Superior Room'
  }
  
  return { roomType, hasBreakfast }
}

/**
 * Scrape Booking.com using MCP search_engine tool
 */
export async function scrapeBookingWithMCPSearch(
  hotelName: string,
  city: string,
  checkIn: string,
  checkOut: string
): Promise<BookingPriceResult | null> {
  const config: BrightDataMCPConfig = {
    apiToken: process.env.BRIGHT_DATA_API_TOKEN || '',
    webUnlockerZone: process.env.WEB_UNLOCKER_ZONE || 'unblocker',
    browserZone: process.env.BROWSER_ZONE || 'scraping_browser',
  }

  if (!config.apiToken) {
    console.log('[BrightDataMCP] API token not configured')
    return null
  }

  let client: Client | null = null

  try {
    console.log(`[BrightDataMCP] Searching for ${hotelName} in ${city}`)
    console.log(`[BrightDataMCP] Dates: ${checkIn} to ${checkOut}`)
    
    client = await createMCPClient(config)
    await listAvailableTools(client)

    // Build search query
    const searchQuery = `${hotelName} ${city} booking.com check-in ${checkIn} check-out ${checkOut} price`
    
    // Use search_engine tool
    const searchResult = await callTool(client, 'search_engine', {
      query: searchQuery,
      engine: 'google',
      max_results: 5,
    })

    console.log('[BrightDataMCP] Search completed, analyzing results...')
    
    // Extract text from result
    const resultText = searchResult.content
      .filter(c => c.type === 'text')
      .map(c => c.text)
      .join('\n')

    // Find Booking.com URLs
    const bookingUrlMatch = resultText.match(/https:\/\/www\.booking\.com\/hotel\/[^\s"]+/)
    
    if (!bookingUrlMatch) {
      console.log('[BrightDataMCP] No Booking.com URL found in search results')
      return null
    }

    const hotelUrl = bookingUrlMatch[0]
    console.log(`[BrightDataMCP] Found hotel URL: ${hotelUrl}`)

    // Now scrape the actual page
    return await scrapeBookingWithMCPScraper(hotelUrl, checkIn, checkOut, client)

  } catch (error) {
    console.error('[BrightDataMCP] Search error:', error)
    return null
  } finally {
    if (client) {
      try {
        await client.close()
      } catch (e) {
        console.error('[BrightDataMCP] Error closing client:', e)
      }
    }
  }
}

/**
 * Scrape Booking.com hotel page using MCP scrape_as_markdown tool
 */
export async function scrapeBookingWithMCPScraper(
  hotelUrl: string,
  checkIn: string,
  checkOut: string,
  existingClient?: Client
): Promise<BookingPriceResult | null> {
  const config: BrightDataMCPConfig = {
    apiToken: process.env.BRIGHT_DATA_API_TOKEN || '',
    webUnlockerZone: process.env.WEB_UNLOCKER_ZONE || 'unblocker',
    browserZone: process.env.BROWSER_ZONE || 'scraping_browser',
  }

  if (!config.apiToken) {
    console.log('[BrightDataMCP] API token not configured')
    return null
  }

  let client = existingClient
  const shouldCloseClient = !existingClient

  try {
    if (!client) {
      client = await createMCPClient(config)
      await listAvailableTools(client)
    }

    // Build URL with dates
    const url = new URL(hotelUrl)
    url.searchParams.set('checkin', checkIn)
    url.searchParams.set('checkout', checkOut)
    url.searchParams.set('selected_currency', 'ILS')
    url.searchParams.set('group_adults', '2')
    url.searchParams.set('no_rooms', '1')

    console.log(`[BrightDataMCP] Scraping URL: ${url.toString()}`)

    // Scrape as markdown (bypasses bot detection!)
    const scrapeResult = await callTool(client, 'scrape_as_markdown', {
      url: url.toString(),
      max_length: 50000, // Limit response size
    })

    // Extract content
    const content = scrapeResult.content
      .filter(c => c.type === 'text')
      .map(c => c.text)
      .join('\n')

    console.log(`[BrightDataMCP] Scraped ${content.length} characters`)

    // Check if blocked
    if (
      content.includes('captcha') ||
      content.includes('Access Denied') ||
      content.length < 5000
    ) {
      console.log('[BrightDataMCP] Detected blocking or insufficient content')
      return null
    }

    // Extract prices
    const prices = extractPricesFromContent(content)
    console.log(`[BrightDataMCP] Found ${prices.length} prices:`, prices.slice(0, 5))

    if (prices.length === 0) {
      console.log('[BrightDataMCP] No prices found')
      return null
    }

    // Extract room info
    const { roomType, hasBreakfast } = extractRoomInfo(content)

    const result: BookingPriceResult = {
      price: prices[0], // Lowest price
      currency: 'ILS',
      roomType,
      available: true,
      hasBreakfast,
      source: 'brightdata_mcp',
    }

    console.log('[BrightDataMCP] ✅ SUCCESS:', result)
    return result

  } catch (error) {
    console.error('[BrightDataMCP] Scraping error:', error)
    return null
  } finally {
    if (client && shouldCloseClient) {
      try {
        await client.close()
      } catch (e) {
        console.error('[BrightDataMCP] Error closing client:', e)
      }
    }
  }
}

/**
 * Scrape Booking.com using direct URL
 */
export async function scrapeBookingUrlWithMCP(
  hotelUrl: string,
  checkIn: string,
  checkOut: string
): Promise<BookingPriceResult[]> {
  const result = await scrapeBookingWithMCPScraper(hotelUrl, checkIn, checkOut)
  return result ? [result] : []
}

/**
 * Main function to search and scrape
 */
export async function scrapeBookingWithMCP(
  hotelName: string,
  city: string,
  checkIn: string,
  checkOut: string
): Promise<BookingPriceResult | null> {
  console.log('[BrightDataMCP] Starting MCP-based scrape')
  return await scrapeBookingWithMCPSearch(hotelName, city, checkIn, checkOut)
}
