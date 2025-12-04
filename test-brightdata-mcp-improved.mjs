import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load .env.local
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env.local') });

const BRIGHT_DATA_API_TOKEN = process.env.BRIGHT_DATA_API_TOKEN;

console.log('🔍 Bright Data MCP Connection Test\n');
console.log('=' .repeat(60));

if (!BRIGHT_DATA_API_TOKEN) {
  console.error('❌ ERROR: BRIGHT_DATA_API_TOKEN not found in .env.local');
  console.log('\n📝 Please follow these steps:');
  console.log('1. Go to: https://brightdata.com/cp/dashboard');
  console.log('2. Navigate to: Settings → API Tokens');
  console.log('3. Create new token with these permissions:');
  console.log('   - Web Unlocker (READ & WRITE)');
  console.log('   - Scraping Browser (READ & WRITE)');
  console.log('4. Add to .env.local: BRIGHT_DATA_API_TOKEN=your_token_here');
  console.log('\n📖 For detailed instructions, see: BRIGHT_DATA_TOKEN_SETUP.md');
  process.exit(1);
}

console.log(`✅ Token found: ${BRIGHT_DATA_API_TOKEN.substring(0, 10)}...${BRIGHT_DATA_API_TOKEN.slice(-10)}`);
console.log(`📏 Token length: ${BRIGHT_DATA_API_TOKEN.length} characters`);

const MCP_URL = `https://mcp.brightdata.com/sse?token=${BRIGHT_DATA_API_TOKEN}`;

async function testMCPConnection() {
  let client = null;
  
  try {
    console.log('\n' + '='.repeat(60));
    console.log('📡 Step 1: Connecting to Bright Data MCP...');
    console.log('='.repeat(60));
    
    const transport = new SSEClientTransport(new URL(MCP_URL));
    client = new Client({
      name: 'hotel-price-monitor-test',
      version: '1.0.0'
    }, {
      capabilities: {}
    });

    await client.connect(transport);
    console.log('✅ Connected successfully!\n');

    console.log('='.repeat(60));
    console.log('📋 Step 2: Listing available tools...');
    console.log('='.repeat(60));
    
    const tools = await client.listTools();
    console.log(`✅ Found ${tools.tools.length} tools:\n`);
    tools.tools.forEach((tool, index) => {
      console.log(`   ${index + 1}. ${tool.name}`);
      if (tool.description) {
        console.log(`      📝 ${tool.description.substring(0, 60)}${tool.description.length > 60 ? '...' : ''}`);
      }
    });

    console.log('\n' + '='.repeat(60));
    console.log('🧪 Step 3: Testing scrape_as_markdown tool...');
    console.log('='.repeat(60));
    
    // Test on a simple, fast-loading page first
    const testUrl = 'https://www.booking.com/hotel/il/david-intercontinental.html?checkin=2025-01-15&checkout=2025-01-16&selected_currency=ILS&group_adults=2';
    
    console.log(`\n🎯 Target: ${testUrl.substring(0, 70)}...`);
    console.log('⏳ Scraping... (this may take 5-10 seconds)\n');
    
    const scrapeResult = await client.callTool({
      name: 'scrape_as_markdown',
      arguments: {
        url: testUrl,
        max_length: 30000
      }
    });

    // Check for errors
    if (scrapeResult.isError) {
      console.error('❌ SCRAPE FAILED:');
      console.error('   ', scrapeResult.content[0]?.text || 'Unknown error');
      
      if (scrapeResult.content[0]?.text.includes('401') || scrapeResult.content[0]?.text.includes('Invalid token')) {
        console.log('\n💡 Token Error Detected!');
        console.log('   Your token is invalid or expired.');
        console.log('   Please create a new token:');
        console.log('   1. Visit: https://brightdata.com/cp/dashboard');
        console.log('   2. Go to: Settings → API Tokens');
        console.log('   3. Create new token with Admin permissions');
        console.log('   4. Update .env.local with new token');
      }
      
      return false;
    }

    if (!scrapeResult.content || scrapeResult.content.length === 0) {
      console.error('❌ No content returned from scraper');
      return false;
    }
    
    const markdown = scrapeResult.content[0].text;
    console.log('='.repeat(60));
    console.log('📊 Scrape Results:');
    console.log('='.repeat(60));
    console.log(`✅ Scraped ${markdown.length} characters`);
    
    // Preview first 300 chars
    console.log('\n📄 Content Preview:');
    console.log('-'.repeat(60));
    console.log(markdown.substring(0, 300).replace(/\n+/g, '\n'));
    console.log('...');
    console.log('-'.repeat(60));
    
    // Check for price information
    const pricePatterns = [
      /₪\s*\d+/i,
      /ILS\s*\d+/i,
      /price.*\d+/i,
      /\d+\s*per night/i
    ];
    
    let foundPrices = false;
    for (const pattern of pricePatterns) {
      if (pattern.test(markdown)) {
        foundPrices = true;
        break;
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('🔍 Content Analysis:');
    console.log('='.repeat(60));
    console.log(`   Price info detected: ${foundPrices ? '✅ YES' : '⚠️  NO'}`);
    console.log(`   Contains "hotel": ${markdown.toLowerCase().includes('hotel') ? '✅ YES' : '❌ NO'}`);
    console.log(`   Contains "room": ${markdown.toLowerCase().includes('room') ? '✅ YES' : '❌ NO'}`);
    console.log(`   Min content length: ${markdown.length >= 5000 ? '✅ YES' : '⚠️  NO (too short)'}`);
    
    if (foundPrices) {
      console.log('\n' + '='.repeat(60));
      console.log('🎉 SUCCESS! Scraper is working correctly!');
      console.log('='.repeat(60));
      console.log('✅ MCP connection: OK');
      console.log('✅ Tool execution: OK');
      console.log('✅ Price extraction: OK');
      console.log('\n💡 Your Bright Data MCP is ready to use!');
      console.log('   Run: npm run dev');
      console.log('   Then visit: http://localhost:3000');
      return true;
    } else {
      console.log('\n' + '='.repeat(60));
      console.log('⚠️  PARTIAL SUCCESS');
      console.log('='.repeat(60));
      console.log('✅ MCP connection: OK');
      console.log('✅ Tool execution: OK');
      console.log('⚠️  Price extraction: Content retrieved but no prices found');
      console.log('\n💡 This may happen if:');
      console.log('   - Booking.com changed their page structure');
      console.log('   - The hotel has no availability for these dates');
      console.log('   - The page is in a different format');
      console.log('\n   The system will use fallback methods automatically.');
      return true;
    }

  } catch (error) {
    console.error('\n' + '='.repeat(60));
    console.error('❌ MCP Test Failed');
    console.error('='.repeat(60));
    console.error(`Error: ${error.message}`);
    
    if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
      console.log('\n💡 Network Error:');
      console.log('   - Check your internet connection');
      console.log('   - Verify MCP URL: https://mcp.brightdata.com');
    } else if (error.message.includes('401') || error.message.includes('Invalid token')) {
      console.log('\n💡 Authentication Error:');
      console.log('   Your token is invalid or expired');
      console.log('   Follow the guide in: BRIGHT_DATA_TOKEN_SETUP.md');
    } else {
      console.log('\n💡 Unexpected Error:');
      console.log('   Check the error details above');
      console.log('   See: BRIGHT_DATA_TOKEN_SETUP.md for troubleshooting');
    }
    
    console.log('\n📖 Detailed setup guide: BRIGHT_DATA_TOKEN_SETUP.md');
    return false;
  } finally {
    if (client) {
      try {
        await client.close();
        console.log('\n🔌 Connection closed');
      } catch (e) {
        // Ignore close errors
      }
    }
  }
}

console.log('');
testMCPConnection()
  .then(success => {
    console.log('\n' + '='.repeat(60));
    if (success) {
      console.log('✅ Test completed successfully!');
      console.log('='.repeat(60));
      process.exit(0);
    } else {
      console.log('❌ Test failed');
      console.log('='.repeat(60));
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
