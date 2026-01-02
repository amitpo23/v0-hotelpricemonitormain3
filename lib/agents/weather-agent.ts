/**
 * Weather Agent
 * Fetches weather forecast data that impacts hotel demand
 * Uses OpenWeather API for reliable weather data
 */

interface WeatherData {
  date: string
  location: string
  
  // Temperature
  tempMax: number // Celsius
  tempMin: number // Celsius
  tempAvg: number // Celsius
  feelsLike: number // Feels like temperature
  
  // Conditions
  condition: string // 'clear' | 'rain' | 'clouds' | 'storm' | 'snow'
  description: string // Detailed description
  humidity: number // %
  windSpeed: number // m/s
  precipitation: number // mm
  
  // Hotel demand impact
  weatherScore: number // 0-100 (higher = better for tourism)
  demandImpact: number // Multiplier (0.85-1.15)
  confidence: number // 0-1
  
  source: 'openweather' | 'weatherapi' | 'estimated'
}

interface WeatherForecast {
  location: string
  forecastDays: WeatherData[]
  summary: {
    avgTemperature: number
    goodWeatherDays: number
    badWeatherDays: number
    overallScore: number
    trend: 'improving' | 'stable' | 'worsening'
  }
}

/**
 * Fetch weather from OpenWeather API
 */
async function fetchOpenWeather(
  lat: number,
  lon: number,
  days: number = 7
): Promise<any> {
  const apiKey = process.env.OPENWEATHER_API_KEY

  if (!apiKey) {
    console.warn('[WeatherAgent] OPENWEATHER_API_KEY not set')
    return null
  }

  try {
    // Use OneCall API 3.0 for forecast
    const url = `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lon}&exclude=minutely,hourly,alerts&units=metric&appid=${apiKey}`
    
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 8000)

    try {
      const response = await fetch(url, {
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        console.warn(`[WeatherAgent] OpenWeather returned status ${response.status}`)
        return null
      }

      const data = await response.json()
      return data
    } catch (error) {
      clearTimeout(timeoutId)
      if (error instanceof Error && error.name === 'AbortError') {
        console.warn('[WeatherAgent] OpenWeather request timeout')
      } else {
        console.warn('[WeatherAgent] OpenWeather error:', error)
      }
      return null
    }
  } catch (error) {
    console.error('[WeatherAgent] Error fetching weather:', error)
    return null
  }
}

/**
 * Parse OpenWeather response
 */
function parseOpenWeatherData(data: any, location: string): WeatherData[] {
  if (!data?.daily) {
    return []
  }

  return data.daily.map((day: any) => {
    const date = new Date(day.dt * 1000).toISOString().split('T')[0]
    const tempMax = day.temp.max
    const tempMin = day.temp.min
    const tempAvg = (tempMax + tempMin) / 2
    const condition = mapWeatherCondition(day.weather[0]?.main || 'Clear')
    
    const weatherScore = calculateWeatherScore(
      tempAvg,
      condition,
      day.humidity,
      day.wind_speed,
      day.pop || 0
    )
    
    return {
      date,
      location,
      tempMax,
      tempMin,
      tempAvg,
      feelsLike: day.feels_like.day,
      condition,
      description: day.weather[0]?.description || '',
      humidity: day.humidity,
      windSpeed: day.wind_speed,
      precipitation: (day.rain || 0) + (day.snow || 0),
      weatherScore,
      demandImpact: calculateDemandImpact(weatherScore),
      confidence: 0.85,
      source: 'openweather'
    }
  })
}

/**
 * Map weather condition to simplified category
 */
function mapWeatherCondition(main: string): WeatherData['condition'] {
  const conditionMap: Record<string, WeatherData['condition']> = {
    'Clear': 'clear',
    'Clouds': 'clouds',
    'Rain': 'rain',
    'Drizzle': 'rain',
    'Thunderstorm': 'storm',
    'Snow': 'snow',
    'Mist': 'clouds',
    'Fog': 'clouds'
  }
  
  return conditionMap[main] || 'clear'
}

/**
 * Calculate weather score (0-100)
 * Higher = better for tourism
 */
function calculateWeatherScore(
  temp: number,
  condition: WeatherData['condition'],
  humidity: number,
  windSpeed: number,
  precipitationProb: number
): number {
  let score = 50 // Start neutral
  
  // Temperature score (optimal 20-28°C)
  if (temp >= 20 && temp <= 28) {
    score += 30 // Perfect temperature
  } else if (temp >= 15 && temp <= 32) {
    score += 15 // Good temperature
  } else if (temp < 10 || temp > 35) {
    score -= 20 // Poor temperature
  }
  
  // Condition score
  const conditionScores: Record<string, number> = {
    'clear': 25,
    'clouds': 10,
    'rain': -20,
    'storm': -30,
    'snow': -15
  }
  score += conditionScores[condition] || 0
  
  // Humidity penalty (over 80% uncomfortable)
  if (humidity > 80) {
    score -= 10
  }
  
  // Wind penalty (over 10 m/s uncomfortable)
  if (windSpeed > 10) {
    score -= 10
  }
  
  // Precipitation probability penalty
  score -= precipitationProb * 20
  
  return Math.max(0, Math.min(100, score))
}

/**
 * Calculate demand impact multiplier
 */
function calculateDemandImpact(weatherScore: number): number {
  // Score 80-100: +10-15% demand
  // Score 60-80: +0-10% demand
  // Score 40-60: No impact
  // Score 20-40: -5-10% demand
  // Score 0-20: -10-15% demand
  
  if (weatherScore >= 80) {
    return 1.10 + (weatherScore - 80) * 0.0025 // 1.10 - 1.15
  } else if (weatherScore >= 60) {
    return 1.00 + (weatherScore - 60) * 0.005 // 1.00 - 1.10
  } else if (weatherScore >= 40) {
    return 1.00 // Neutral
  } else if (weatherScore >= 20) {
    return 0.95 - (40 - weatherScore) * 0.0025 // 0.90 - 0.95
  } else {
    return 0.85 + weatherScore * 0.0025 // 0.85 - 0.90
  }
}

/**
 * Generate estimated weather for fallback
 */
function generateEstimatedWeather(
  date: string,
  location: string
): WeatherData {
  const d = new Date(date)
  const month = d.getMonth()
  
  // Seasonal temperature averages for Tel Aviv
  const seasonalTemps: Record<number, { avg: number; variation: number }> = {
    0: { avg: 14, variation: 3 },  // January
    1: { avg: 15, variation: 3 },  // February
    2: { avg: 17, variation: 3 },  // March
    3: { avg: 20, variation: 3 },  // April
    4: { avg: 23, variation: 3 },  // May
    5: { avg: 26, variation: 2 },  // June
    6: { avg: 28, variation: 2 },  // July
    7: { avg: 29, variation: 2 },  // August
    8: { avg: 28, variation: 2 },  // September
    9: { avg: 26, variation: 2 },  // October
    10: { avg: 22, variation: 3 }, // November
    11: { avg: 17, variation: 3 }  // December
  }
  
  const { avg, variation } = seasonalTemps[month] || { avg: 22, variation: 3 }
  const tempAvg = avg + (Math.random() * variation * 2 - variation)
  const tempMax = tempAvg + 4
  const tempMin = tempAvg - 4
  
  // Random condition (weighted by season)
  const rainProb = [0.4, 0.4, 0.3, 0.2, 0.05, 0, 0, 0, 0.05, 0.2, 0.3, 0.4][month]
  const isRain = Math.random() < rainProb
  const condition: WeatherData['condition'] = isRain ? 'rain' : Math.random() > 0.3 ? 'clear' : 'clouds'
  
  const weatherScore = calculateWeatherScore(tempAvg, condition, 65, 5, rainProb)
  
  return {
    date,
    location,
    tempMax,
    tempMin,
    tempAvg,
    feelsLike: tempAvg,
    condition,
    description: condition === 'clear' ? 'Clear sky' : condition === 'rain' ? 'Light rain' : 'Partly cloudy',
    humidity: 60 + Math.random() * 20,
    windSpeed: 3 + Math.random() * 5,
    precipitation: condition === 'rain' ? Math.random() * 10 : 0,
    weatherScore,
    demandImpact: calculateDemandImpact(weatherScore),
    confidence: 0.3,
    source: 'estimated'
  }
}

/**
 * Get weather forecast for date range
 */
export async function getWeatherForecast(
  startDate: string,
  endDate: string,
  location: string = 'Tel Aviv',
  lat: number = 32.0853, // Tel Aviv coordinates
  lon: number = 34.7818
): Promise<WeatherForecast> {
  console.log(`[WeatherAgent] Fetching forecast for ${location}`)

  try {
    // Fetch from OpenWeather
    const weatherData = await fetchOpenWeather(lat, lon)

    if (weatherData) {
      const forecastDays = parseOpenWeatherData(weatherData, location)
      
      // Filter to requested date range
      const start = new Date(startDate)
      const end = new Date(endDate)
      
      const filteredDays = forecastDays.filter(day => {
        const d = new Date(day.date)
        return d >= start && d <= end
      })
      
      if (filteredDays.length > 0) {
        const summary = generateWeatherSummary(filteredDays)
        
        return {
          location,
          forecastDays: filteredDays,
          summary
        }
      }
    }

    // Fallback to estimated weather
    console.log('[WeatherAgent] Using estimated weather')
    const forecastDays: WeatherData[] = []
    
    const start = new Date(startDate)
    const end = new Date(endDate)
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0]
      forecastDays.push(generateEstimatedWeather(dateStr, location))
    }
    
    const summary = generateWeatherSummary(forecastDays)
    
    return {
      location,
      forecastDays,
      summary
    }
    
  } catch (error) {
    console.error('[WeatherAgent] Error:', error)
    
    // Return estimated data
    const forecastDays: WeatherData[] = []
    const start = new Date(startDate)
    const end = new Date(endDate)
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0]
      forecastDays.push(generateEstimatedWeather(dateStr, location))
    }
    
    return {
      location,
      forecastDays,
      summary: generateWeatherSummary(forecastDays)
    }
  }
}

/**
 * Generate weather summary
 */
function generateWeatherSummary(forecastDays: WeatherData[]): WeatherForecast['summary'] {
  const avgTemperature = forecastDays.reduce((sum, d) => sum + d.tempAvg, 0) / forecastDays.length
  const goodWeatherDays = forecastDays.filter(d => d.weatherScore >= 70).length
  const badWeatherDays = forecastDays.filter(d => d.weatherScore < 40).length
  const overallScore = forecastDays.reduce((sum, d) => sum + d.weatherScore, 0) / forecastDays.length
  
  // Determine trend
  const firstHalf = forecastDays.slice(0, Math.floor(forecastDays.length / 2))
  const secondHalf = forecastDays.slice(Math.floor(forecastDays.length / 2))
  
  const firstHalfScore = firstHalf.reduce((sum, d) => sum + d.weatherScore, 0) / firstHalf.length
  const secondHalfScore = secondHalf.reduce((sum, d) => sum + d.weatherScore, 0) / secondHalf.length
  
  let trend: 'improving' | 'stable' | 'worsening' = 'stable'
  if (secondHalfScore > firstHalfScore + 10) {
    trend = 'improving'
  } else if (secondHalfScore < firstHalfScore - 10) {
    trend = 'worsening'
  }
  
  return {
    avgTemperature: Math.round(avgTemperature * 10) / 10,
    goodWeatherDays,
    badWeatherDays,
    overallScore: Math.round(overallScore),
    trend
  }
}

/**
 * Get weather for single date
 */
export async function getWeatherForDate(
  date: string,
  location: string = 'Tel Aviv',
  lat: number = 32.0853,
  lon: number = 34.7818
): Promise<WeatherData> {
  const forecast = await getWeatherForecast(date, date, location, lat, lon)
  return forecast.forecastDays[0] || generateEstimatedWeather(date, location)
}
