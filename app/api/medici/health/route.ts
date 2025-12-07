/**
 * Medici Hotels - Health Check API
 * Test Medici API connection and configuration
 */

import { NextRequest, NextResponse } from 'next/server';
import { testMediciConnection, validateMediciConfig } from '@/lib/medici/utils';

/**
 * GET /api/medici/health
 * Check Medici API health and configuration
 */
export async function GET(request: NextRequest) {
  try {
    // Validate configuration
    const configCheck = validateMediciConfig();

    // Test connection
    const connectionTest = await testMediciConnection();

    // Overall health status
    const healthy = configCheck.valid && connectionTest.success;

    return NextResponse.json({
      healthy,
      status: healthy ? 'operational' : 'degraded',
      timestamp: new Date().toISOString(),
      config: {
        valid: configCheck.valid,
        errors: configCheck.errors,
        warnings: configCheck.warnings,
      },
      connection: {
        success: connectionTest.success,
        message: connectionTest.message,
        details: connectionTest.details,
      },
      endpoints: {
        baseUrl: process.env.MEDICI_BASE_URL || 'https://medici-backend.azurewebsites.net',
        swagger: `${process.env.MEDICI_BASE_URL || 'https://medici-backend.azurewebsites.net'}/swagger/index.html`,
      },
    }, {
      status: healthy ? 200 : 503,
    });
  } catch (error: any) {
    console.error('Medici health check error:', error);
    return NextResponse.json({
      healthy: false,
      status: 'error',
      timestamp: new Date().toISOString(),
      error: {
        message: error.message || 'Health check failed',
        details: error,
      },
    }, {
      status: 503,
    });
  }
}
