// Real Expedia scraper
export interface ExpediaScrapedPrice {
  hotelName: string
  price: number
  currency: string
  roomType: string
  availability: boolean
  checkIn: string
  checkOut: string
  source: "Expedia"
}

export async function scrapeExpediaPrice(
  hotelName: string,
  city: string,
  checkIn: string,
  checkOut: string,
): Promise<ExpediaScrapedPrice | null> {
  try {
    // Expedia search API
    const searchUrl = "https://www.expedia.com/api/graphql"

    const payload = {
      operationName: "LodgingPwaPropertySearch",
      variables: {
        context: {
          siteId: 1,
          locale: "en_US",
          currency: "USD",
        },
        criteria: {
          primary: {
            dateRange: {
              checkInDate: {
                day: Number.parseInt(checkIn.split("-")[2]),
                month: Number.parseInt(checkIn.split("-")[1]),
                year: Number.parseInt(checkIn.split("-")[0]),
              },
              checkOutDate: {
                day: Number.parseInt(checkOut.split("-")[2]),
                month: Number.parseInt(checkOut.split("-")[1]),
                year: Number.parseInt(checkOut.split("-")[0]),
              },
            },
            destination: {
              searchString: `${hotelName}, ${city}`,
            },
            rooms: [{ adults: 2 }],
          },
        },
      },
      query: `query LodgingPwaPropertySearch($context: Context!, $criteria: PropertySearchCriteriaInput!) {
        propertySearch(context: $context, criteria: $criteria) {
          properties {
            name
            price {
              lead {
                amount
                currencyInfo {
                  code
                }
              }
            }
            offerBadge {
              primary {
                text
              }
            }
          }
        }
      }`,
    }

    const response = await fetch(searchUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "application/json",
        "Accept-Language": "en-US,en;q=0.9",
        Origin: "https://www.expedia.com",
        Referer: "https://www.expedia.com/",
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      console.error("[Expedia Scraper] HTTP error:", response.status)
      return null
    }

    const data = await response.json()
    const properties = data?.data?.propertySearch?.properties

    if (!properties || properties.length === 0) {
      return null
    }

    // Find matching hotel
    const hotel = properties.find((p: any) => p.name?.toLowerCase().includes(hotelName.toLowerCase())) || properties[0]

    if (!hotel?.price?.lead?.amount) {
      return null
    }

    return {
      hotelName: hotel.name || hotelName,
      price: hotel.price.lead.amount,
      currency: hotel.price.lead.currencyInfo?.code || "USD",
      roomType: "Standard Room",
      availability: true,
      checkIn,
      checkOut,
      source: "Expedia",
    }
  } catch (error) {
    console.error("[Expedia Scraper] Error:", error)
    return null
  }
}

// Alternative: Scrape via HTML
export async function scrapeExpediaViaHtml(
  expediaUrl: string,
  checkIn: string,
  checkOut: string,
): Promise<ExpediaScrapedPrice[]> {
  try {
    const url = new URL(expediaUrl)
    url.searchParams.set("chkin", checkIn)
    url.searchParams.set("chkout", checkOut)
    url.searchParams.set("rm1", "a2")

    const response = await fetch(url.toString(), {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
    })

    if (!response.ok) {
      return []
    }

    const html = await response.text()
    const prices: ExpediaScrapedPrice[] = []

    // Extract prices
    const pricePatterns = [
      /"price":\s*"?\$?(\d+(?:,\d{3})*(?:\.\d{2})?)"/g,
      /\$(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:per|\/)\s*night/gi,
      /data-stid="[^"]*price[^"]*"[^>]*>\$?(\d+)/gi,
    ]

    const foundPrices = new Set<number>()
    for (const pattern of pricePatterns) {
      const matches = html.matchAll(pattern)
      for (const match of matches) {
        const price = Number.parseFloat(match[1].replace(",", ""))
        if (price > 30 && price < 5000) {
          foundPrices.add(price)
        }
      }
    }

    // Extract hotel name
    const hotelNameMatch = html.match(/<h1[^>]*>([^<]+)</i)
    const hotelName = hotelNameMatch ? hotelNameMatch[1].trim() : "Unknown Hotel"

    const priceArray = Array.from(foundPrices).sort((a, b) => a - b)
    priceArray.slice(0, 3).forEach((price) => {
      prices.push({
        hotelName,
        price,
        currency: "USD",
        roomType: "Standard Room",
        availability: true,
        checkIn,
        checkOut,
        source: "Expedia",
      })
    })

    return prices
  } catch (error) {
    console.error("[Expedia HTML Scraper] Error:", error)
    return []
  }
}
