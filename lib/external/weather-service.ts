/**
 * Weather Service - OpenWeatherMap Integration
 * Provides weather impact analysis for pricing predictions
 */

interface WeatherData {
  temp: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  description: string;
}

interface WeatherImpact {
  score: number; // -1 to 1
  multiplier: number; // 0.85 to 1.15
  reasoning: string;
  condition: string;
  temp: number;
}

const WEATHER_CONDITIONS = {
  clear: { score: 0.10, description: 'Perfect weather - sunny skies' },
  clouds: { score: 0.00, description: 'Cloudy but acceptable' },
  rain: { score: -0.15, description: 'Rainy - reduced demand' },
  drizzle: { score: -0.08, description: 'Light rain - slightly reduced demand' },
  thunderstorm: { score: -0.20, description: 'Storms - significantly reduced demand' },
  snow: { score: -0.10, description: 'Snow - reduced travel' },
  mist: { score: -0.05, description: 'Misty conditions' },
  fog: { score: -0.08, description: 'Foggy - reduced visibility' },
} as const;

const TEMP_RANGES = {
  hot: { min: 30, score: 0.08, description: 'Hot weather - high beach/pool demand' },
  warm: { min: 25, max: 30, score: 0.12, description: 'Perfect temperature - optimal conditions' },
  pleasant: { min: 20, max: 25, score: 0.05, description: 'Pleasant weather' },
  cool: { min: 15, max: 20, score: 0.00, description: 'Cool but comfortable' },
  cold: { max: 15, score: -0.05, description: 'Cold weather - reduced demand' },
};

export class WeatherService {
  private apiKey: string;
  private baseUrl = 'https://api.openweathermap.org/data/2.5';
  private cache: Map<string, { data: WeatherImpact; timestamp: number }> = new Map();
  private cacheTTL = 3600000; // 1 hour

  constructor() {
    this.apiKey = process.env.OPENWEATHER_API_KEY || '';
    // Silently use fallback data if API key not available
  }

  /**
   * Get weather impact for a specific location and date
   */
  async getWeatherImpact(
    location: string,
    date: string | Date
  ): Promise<WeatherImpact> {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const cacheKey = `${location}-${dateObj.toISOString().split('T')[0]}`;

    // Check cache
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data;
    }

    try {
      // Calculate days from now
      const daysFromNow = Math.floor(
        (dateObj.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );

      let weatherData: WeatherData;

      if (daysFromNow < 0) {
        // Past date - return neutral impact
        return this.createNeutralImpact('Historical date - no weather data');
      } else if (daysFromNow <= 5) {
        // Use forecast API (free, up to 5 days)
        weatherData = await this.getForecast(location, dateObj);
      } else {
        // Beyond 5 days - use climatology/seasonal patterns
        weatherData = await this.getClimatology(location, dateObj);
      }

      const impact = this.calculateImpact(weatherData);

      // Cache result
      this.cache.set(cacheKey, { data: impact, timestamp: Date.now() });

      return impact;
    } catch (error) {
      console.error('Weather API error:', error);
      return this.createNeutralImpact('Weather data unavailable');
    }
  }

  /**
   * Get forecast for next 5 days
   */
  private async getForecast(location: string, date: Date): Promise<WeatherData> {
    if (!this.apiKey) {
      return this.getSeasonalDefault(location, date);
    }

    const response = await fetch(
      `${this.baseUrl}/forecast?q=${encodeURIComponent(location)}&appid=${this.apiKey}&units=metric`
    );

    if (!response.ok) {
      throw new Error(`Weather API error: ${response.status}`);
    }

    const data = await response.json();

    // Find forecast closest to target date
    const targetTime = date.getTime();
    const forecast = data.list.reduce((closest: any, current: any) => {
      const currentTime = new Date(current.dt * 1000).getTime();
      const closestTime = new Date(closest.dt * 1000).getTime();
      return Math.abs(currentTime - targetTime) < Math.abs(closestTime - targetTime)
        ? current
        : closest;
    });

    return {
      temp: forecast.main.temp,
      condition: forecast.weather[0].main.toLowerCase(),
      humidity: forecast.main.humidity,
      windSpeed: forecast.wind.speed,
      description: forecast.weather[0].description,
    };
  }

  /**
   * Get climatology data (seasonal averages) for dates beyond 5 days
   */
  private async getClimatology(location: string, date: Date): Promise<WeatherData> {
    // Use seasonal patterns based on location and month
    return this.getSeasonalDefault(location, date);
  }

  /**
   * Get seasonal default weather based on location and month
   */
  private getSeasonalDefault(location: string, date: Date): WeatherData {
    const month = date.getMonth();
    const locationLower = location.toLowerCase();

    // Israel/Mediterranean climate
    if (locationLower.includes('tel aviv') || locationLower.includes('israel')) {
      if (month >= 5 && month <= 9) {
        // Summer (June-October): Hot and dry
        return {
          temp: 28 + Math.random() * 4,
          condition: 'clear',
          humidity: 60,
          windSpeed: 3,
          description: 'Summer - typically sunny',
        };
      } else if (month >= 11 || month <= 2) {
        // Winter (December-March): Mild with some rain
        return {
          temp: 15 + Math.random() * 5,
          condition: Math.random() > 0.3 ? 'clouds' : 'rain',
          humidity: 75,
          windSpeed: 4,
          description: 'Winter - mild with occasional rain',
        };
      } else {
        // Spring/Fall: Pleasant
        return {
          temp: 22 + Math.random() * 4,
          condition: 'clear',
          humidity: 65,
          windSpeed: 3,
          description: 'Pleasant spring/fall weather',
        };
      }
    }

    // Default moderate climate
    return {
      temp: 20,
      condition: 'clouds',
      humidity: 70,
      windSpeed: 3,
      description: 'Moderate conditions',
    };
  }

  /**
   * Calculate weather impact on pricing
   */
  private calculateImpact(weather: WeatherData): WeatherImpact {
    let score = 0;
    let reasoning: string[] = [];

    // Weather condition impact
    const conditionKey = weather.condition as keyof typeof WEATHER_CONDITIONS;
    const conditionImpact = WEATHER_CONDITIONS[conditionKey];
    if (conditionImpact) {
      score += conditionImpact.score;
      reasoning.push(conditionImpact.description);
    }

    // Temperature impact
    let tempImpact = 0;
    if (weather.temp >= TEMP_RANGES.hot.min) {
      tempImpact = TEMP_RANGES.hot.score;
      reasoning.push(TEMP_RANGES.hot.description);
    } else if (weather.temp >= TEMP_RANGES.warm.min && weather.temp < TEMP_RANGES.warm.max!) {
      tempImpact = TEMP_RANGES.warm.score;
      reasoning.push(TEMP_RANGES.warm.description);
    } else if (weather.temp >= TEMP_RANGES.pleasant.min && weather.temp < TEMP_RANGES.pleasant.max!) {
      tempImpact = TEMP_RANGES.pleasant.score;
      reasoning.push(TEMP_RANGES.pleasant.description);
    } else if (weather.temp >= TEMP_RANGES.cool.min && weather.temp < TEMP_RANGES.cool.max!) {
      tempImpact = TEMP_RANGES.cool.score;
      reasoning.push(TEMP_RANGES.cool.description);
    } else {
      tempImpact = TEMP_RANGES.cold.score;
      reasoning.push(TEMP_RANGES.cold.description);
    }
    score += tempImpact;

    // Extreme humidity penalty
    if (weather.humidity > 85) {
      score -= 0.03;
      reasoning.push('High humidity - less comfortable');
    }

    // High wind penalty
    if (weather.windSpeed > 8) {
      score -= 0.05;
      reasoning.push('Strong winds - reduced outdoor activities');
    }

    // Cap score between -1 and 1
    score = Math.max(-1, Math.min(1, score));

    // Convert to multiplier (0.85 to 1.15)
    const multiplier = 1 + score * 0.15;

    return {
      score,
      multiplier,
      reasoning: reasoning.join('. '),
      condition: weather.condition,
      temp: Math.round(weather.temp),
    };
  }

  /**
   * Create neutral impact when weather data is unavailable
   */
  private createNeutralImpact(reason: string): WeatherImpact {
    return {
      score: 0,
      multiplier: 1.0,
      reasoning: reason,
      condition: 'unknown',
      temp: 20,
    };
  }

  /**
   * Get weather for multiple dates in batch
   */
  async getWeatherImpactBatch(
    location: string,
    dates: (string | Date)[]
  ): Promise<Map<string, WeatherImpact>> {
    const results = new Map<string, WeatherImpact>();

    await Promise.all(
      dates.map(async (date) => {
        const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];
        const impact = await this.getWeatherImpact(location, date);
        results.set(dateStr, impact);
      })
    );

    return results;
  }
}

// Singleton instance
export const weatherService = new WeatherService();
