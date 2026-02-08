/**
 * Slack Notifications Service
 *
 * Sends notifications to Slack for:
 * - Price recommendation changes
 * - System alerts
 * - Competitor price updates
 * - Error notifications
 */

import { logger } from '@/lib/logger'

interface SlackMessage {
  text?: string
  blocks?: SlackBlock[]
  attachments?: SlackAttachment[]
  channel?: string
}

interface SlackBlock {
  type: 'section' | 'header' | 'divider' | 'context' | 'actions'
  text?: {
    type: 'plain_text' | 'mrkdwn'
    text: string
    emoji?: boolean
  }
  fields?: Array<{
    type: 'plain_text' | 'mrkdwn'
    text: string
  }>
  accessory?: {
    type: string
    text?: { type: string; text: string }
    url?: string
  }
}

interface SlackAttachment {
  color?: string
  title?: string
  text?: string
  fields?: Array<{
    title: string
    value: string
    short?: boolean
  }>
  footer?: string
  ts?: number
}

const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL
const SLACK_ALERTS_CHANNEL = process.env.SLACK_ALERTS_CHANNEL

/**
 * Send a message to Slack
 */
async function sendSlackMessage(message: SlackMessage): Promise<boolean> {
  if (!SLACK_WEBHOOK_URL) {
    logger.debug('Slack not configured, skipping notification')
    return false
  }

  try {
    const response = await fetch(SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...message,
        channel: message.channel || SLACK_ALERTS_CHANNEL,
      }),
    })

    if (!response.ok) {
      logger.error('Slack notification failed', new Error(`Status: ${response.status}`))
      return false
    }

    logger.debug('Slack notification sent successfully')
    return true
  } catch (error) {
    logger.error('Slack notification error', error as Error)
    return false
  }
}

/**
 * Notify about price recommendation change
 */
export async function notifyPriceChange(params: {
  hotelName: string
  date: string
  oldPrice: number
  newPrice: number
  changePercent: number
  reason?: string
}): Promise<boolean> {
  const { hotelName, date, oldPrice, newPrice, changePercent, reason } = params

  const emoji = changePercent > 0 ? ':chart_with_upwards_trend:' : ':chart_with_downwards_trend:'
  const color = changePercent > 0 ? '#36a64f' : '#ff6b6b'

  return sendSlackMessage({
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${emoji} Price Recommendation Update`,
          emoji: true,
        },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Hotel:*\n${hotelName}` },
          { type: 'mrkdwn', text: `*Date:*\n${date}` },
          { type: 'mrkdwn', text: `*Previous:*\n$${oldPrice.toFixed(2)}` },
          { type: 'mrkdwn', text: `*Recommended:*\n$${newPrice.toFixed(2)}` },
        ],
      },
      {
        type: 'context',
        text: {
          type: 'mrkdwn',
          text: `Change: ${changePercent > 0 ? '+' : ''}${changePercent.toFixed(1)}%${reason ? ` | Reason: ${reason}` : ''}`,
        },
      },
    ],
    attachments: [{ color }],
  })
}

/**
 * Notify about competitor price drop
 */
export async function notifyCompetitorPriceDrop(params: {
  hotelName: string
  competitorName: string
  date: string
  oldPrice: number
  newPrice: number
  dropPercent: number
}): Promise<boolean> {
  const { hotelName, competitorName, date, oldPrice, newPrice, dropPercent } = params

  return sendSlackMessage({
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: ':rotating_light: Competitor Price Alert',
          emoji: true,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${competitorName}* dropped their price by *${dropPercent.toFixed(1)}%*`,
        },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Your Hotel:*\n${hotelName}` },
          { type: 'mrkdwn', text: `*Date:*\n${date}` },
          { type: 'mrkdwn', text: `*Their Old Price:*\n$${oldPrice.toFixed(2)}` },
          { type: 'mrkdwn', text: `*Their New Price:*\n$${newPrice.toFixed(2)}` },
        ],
      },
    ],
    attachments: [{ color: '#ff9800' }],
  })
}

/**
 * Notify about high occupancy threshold
 */
export async function notifyHighOccupancy(params: {
  hotelName: string
  date: string
  occupancy: number
  threshold: number
}): Promise<boolean> {
  const { hotelName, date, occupancy, threshold } = params

  return sendSlackMessage({
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: ':fire: High Occupancy Alert',
          emoji: true,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${hotelName}* has reached *${occupancy}%* occupancy for *${date}*`,
        },
      },
      {
        type: 'context',
        text: {
          type: 'mrkdwn',
          text: `Threshold: ${threshold}% | Consider increasing prices`,
        },
      },
    ],
    attachments: [{ color: '#e91e63' }],
  })
}

/**
 * Notify about system error
 */
export async function notifySystemError(params: {
  service: string
  error: string
  context?: string
}): Promise<boolean> {
  const { service, error, context } = params

  return sendSlackMessage({
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: ':x: System Error',
          emoji: true,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Service:* ${service}\n*Error:* ${error}`,
        },
      },
      ...(context ? [{
        type: 'context' as const,
        text: {
          type: 'mrkdwn' as const,
          text: `Context: ${context}`,
        },
      }] : []),
    ],
    attachments: [{ color: '#dc3545' }],
  })
}

/**
 * Notify about daily summary
 */
export async function notifyDailySummary(params: {
  hotelName: string
  date: string
  predictionsGenerated: number
  avgConfidence: number
  priceChanges: number
  competitorUpdates: number
}): Promise<boolean> {
  const { hotelName, date, predictionsGenerated, avgConfidence, priceChanges, competitorUpdates } = params

  return sendSlackMessage({
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: ':bar_chart: Daily Summary',
          emoji: true,
        },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Hotel:*\n${hotelName}` },
          { type: 'mrkdwn', text: `*Date:*\n${date}` },
          { type: 'mrkdwn', text: `*Predictions:*\n${predictionsGenerated}` },
          { type: 'mrkdwn', text: `*Avg Confidence:*\n${avgConfidence.toFixed(1)}%` },
          { type: 'mrkdwn', text: `*Price Changes:*\n${priceChanges}` },
          { type: 'mrkdwn', text: `*Competitor Updates:*\n${competitorUpdates}` },
        ],
      },
    ],
    attachments: [{ color: '#2196f3' }],
  })
}

export const slack = {
  send: sendSlackMessage,
  notifyPriceChange,
  notifyCompetitorPriceDrop,
  notifyHighOccupancy,
  notifySystemError,
  notifyDailySummary,
}

export default slack
