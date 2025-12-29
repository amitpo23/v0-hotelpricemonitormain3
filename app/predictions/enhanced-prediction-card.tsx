'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  SparklesIcon, 
  TrendingUpIcon, 
  CloudIcon, 
  ActivityIcon,
  CalendarIcon,
  AlertCircleIcon
} from '@/components/icons';

interface EnhancedPrediction {
  date: string;
  predictedPrice: number;
  confidenceScore: number;
  demandLevel: string;
  recommendation: string;
  recommendedPrice: number;
  priceRange: {
    min: number;
    max: number;
  };
  factors: Array<{
    name: string;
    impact: number;
    description: string;
  }>;
}

interface EnhancedPredictionResponse {
  success: boolean;
  prediction: EnhancedPrediction;
  context: {
    dataQuality: number;
    weatherForecast: string;
    bookingMomentum: string;
    yoyComparison: string;
  };
}

interface EnhancedPredictionCardProps {
  hotelId: string;
  defaultDate?: string;
}

export function EnhancedPredictionCard({ hotelId, defaultDate }: EnhancedPredictionCardProps) {
  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState<EnhancedPredictionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(
    defaultDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );

  const fetchEnhancedPrediction = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/predictions/enhanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hotelId,
          targetDate: selectedDate,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.statusText}`);
      }

      const data = await response.json();
      setPrediction(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 60) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getImpactIcon = (impact: number) => {
    if (impact > 0) return '↑';
    if (impact < 0) return '↓';
    return '→';
  };

  const getImpactColor = (impact: number) => {
    if (impact > 0) return 'text-green-600';
    if (impact < 0) return 'text-red-600';
    return 'text-slate-600';
  };

  return (
    <Card className="border-cyan-500/30 bg-gradient-to-br from-slate-900/50 to-slate-800/30">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-emerald-500 blur-md opacity-50"></div>
              <div className="relative bg-slate-900 border border-cyan-500/30 p-2 rounded-lg">
                <SparklesIcon className="h-5 w-5 text-cyan-400" />
              </div>
            </div>
            <div>
              <CardTitle className="text-xl">Enhanced Prediction Engine</CardTitle>
              <CardDescription>
                AI-powered pricing with weather, booking velocity & year-over-year analysis
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Date Selector */}
        <div className="flex gap-2">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
            className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-cyan-500 focus:outline-none"
          />
          <Button
            onClick={fetchEnhancedPrediction}
            disabled={loading}
            className="bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-600 hover:to-emerald-600"
          >
            {loading ? 'Analyzing...' : 'Get Prediction'}
          </Button>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
            <AlertCircleIcon className="h-5 w-5" />
            <span>{error}</span>
          </div>
        )}

        {prediction && (
          <div className="space-y-4">
            {/* Main Prediction */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                <div className="text-sm text-slate-400 mb-1">Predicted Price</div>
                <div className="text-3xl font-bold text-cyan-400">
                  ₪{prediction.prediction.predictedPrice}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Range: ₪{prediction.prediction.priceRange.min} - ₪{prediction.prediction.priceRange.max}
                </div>
              </div>

              <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                <div className="text-sm text-slate-400 mb-1">Confidence Score</div>
                <div className="flex items-baseline gap-2">
                  <div className="text-3xl font-bold text-emerald-400">
                    {prediction.prediction.confidenceScore}%
                  </div>
                  <Badge className={getConfidenceColor(prediction.prediction.confidenceScore)}>
                    {prediction.prediction.confidenceScore >= 80 ? 'High' : 
                     prediction.prediction.confidenceScore >= 60 ? 'Medium' : 'Low'}
                  </Badge>
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Data Quality: {(prediction.context.dataQuality * 100).toFixed(0)}%
                </div>
              </div>
            </div>

            {/* Factors */}
            <div className="space-y-2">
              <div className="text-sm font-medium text-slate-300 flex items-center gap-2">
                <ActivityIcon className="h-4 w-4" />
                Contributing Factors
              </div>
              <div className="space-y-2">
                {prediction.prediction.factors.map((factor, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg border border-slate-700/50">
                    <div className="flex-1">
                      <div className="font-medium text-sm text-slate-200">{factor.name}</div>
                      <div className="text-xs text-slate-400 mt-1">{factor.description}</div>
                    </div>
                    <div className={`flex items-center gap-1 text-sm font-medium ${getImpactColor(factor.impact)}`}>
                      <span>{getImpactIcon(factor.impact)}</span>
                      <span>{Math.abs(factor.impact)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Context */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 bg-slate-800/30 rounded-lg border border-slate-700/50">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
                  <CloudIcon className="h-4 w-4" />
                  Weather Impact
                </div>
                <div className="text-xs text-slate-400">
                  {prediction.context.weatherForecast}
                </div>
              </div>

              <div className="p-3 bg-slate-800/30 rounded-lg border border-slate-700/50">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
                  <TrendingUpIcon className="h-4 w-4" />
                  Booking Momentum
                </div>
                <div className="text-xs text-slate-400">
                  {prediction.context.bookingMomentum}
                </div>
              </div>

              <div className="p-3 bg-slate-800/30 rounded-lg border border-slate-700/50">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
                  <CalendarIcon className="h-4 w-4" />
                  Year-over-Year
                </div>
                <div className="text-xs text-slate-400">
                  {prediction.context.yoyComparison}
                </div>
              </div>

              <div className="p-3 bg-slate-800/30 rounded-lg border border-slate-700/50">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
                  <Badge className="bg-gradient-to-r from-cyan-500/20 to-emerald-500/20 text-cyan-300 border-cyan-500/30">
                    {prediction.prediction.recommendation.toUpperCase()}
                  </Badge>
                </div>
                <div className="text-xs text-slate-400">
                  Recommended: ₪{prediction.prediction.recommendedPrice} ({prediction.prediction.demandLevel} demand)
                </div>
              </div>
            </div>

            {/* Enhancement Notice */}
            <div className="flex items-center gap-2 p-3 bg-gradient-to-r from-cyan-500/10 to-emerald-500/10 border border-cyan-500/30 rounded-lg">
              <SparklesIcon className="h-5 w-5 text-cyan-400" />
              <div className="text-sm text-slate-300">
                <span className="font-medium text-cyan-400">Enhanced with:</span> Weather data, booking velocity analysis, year-over-year patterns, and 30+ ML features
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
