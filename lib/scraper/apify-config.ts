/**
 * Apify Actor Configuration
 * 
 * This file centralizes the Actor ID used for Booking.com scraping.
 * You can change the Actor here instead of editing multiple files.
 */

export const APIFY_CONFIG = {
  /**
   * Current Actor in use
   * 
   * Options:
   * - "voyager/booking-scraper" - ✅ Recommended (best date support)
   * - "dtrungtin/booking-scraper" - Good alternative
   * - "oeiQgfg5fsmIJB7Cn" - Free tier fallback
   */
  ACTOR_ID: "voyager/booking-scraper",

  /**
   * Default scraping parameters
   */
  DEFAULT_PARAMS: {
    currency: "ILS",
    language: "he",
    adults: 2,
    rooms: 1,
    children: 0,
    maxItems: 50,
  },

  /**
   * Actor-specific settings
   */
  ACTORS: {
    "voyager/booking-scraper": {
      name: "Voyager Booking Scraper",
      pros: ["Best date support", "Reliable", "Fast"],
      cons: ["Higher cost"],
      avgCostPerRun: "$0.10-0.30",
      memory: 2048,
    },
    "dtrungtin/booking-scraper": {
      name: "Dtrungtin Booking Scraper",
      pros: ["Good price/performance", "Stable"],
      cons: ["Slower than Voyager"],
      avgCostPerRun: "$0.05-0.15",
      memory: 1024,
    },
    "oeiQgfg5fsmIJB7Cn": {
      name: "Community Booking Scraper",
      pros: ["Sometimes free", "Simple"],
      cons: ["Limited date support", "Unreliable"],
      avgCostPerRun: "$0.01-0.05",
      memory: 512,
    },
  },
}

/**
 * Get current Actor info
 */
export function getCurrentActorInfo() {
  const actorId = APIFY_CONFIG.ACTOR_ID
  const info = APIFY_CONFIG.ACTORS[actorId as keyof typeof APIFY_CONFIG.ACTORS]
  
  if (!info) {
    console.warn(`[Apify Config] Unknown Actor: ${actorId}`)
    return null
  }
  
  return {
    id: actorId,
    ...info,
  }
}

/**
 * Print current configuration
 */
export function printConfig() {
  const info = getCurrentActorInfo()
  
  if (!info) {
    console.log("⚠️ Actor not configured properly")
    return
  }
  
  console.log("\n🤖 Apify Actor Configuration")
  console.log("=".repeat(50))
  console.log(`Current Actor: ${info.name}`)
  console.log(`ID: ${info.id}`)
  console.log(`Avg Cost: ${info.avgCostPerRun}`)
  console.log(`Memory: ${info.memory}MB`)
  console.log("\n✅ Pros:")
  info.pros.forEach((pro: string) => console.log(`  - ${pro}`))
  console.log("\n⚠️ Cons:")
  info.cons.forEach((con: string) => console.log(`  - ${con}`))
  console.log("=".repeat(50) + "\n")
}

// Usage example:
if (import.meta.url === `file://${process.argv[1]}`) {
  printConfig()
}
