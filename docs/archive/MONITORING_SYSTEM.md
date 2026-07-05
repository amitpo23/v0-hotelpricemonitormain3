# 🔍 Multi-Agent Monitoring System

## Overview
מערכת ניטור מתקדמת לכל ה-Agents במערכת החיזוי, עם circuit breakers, performance tracking, ומעקב אחר שגיאות.

## Components

### 1. Error Coordinator (`lib/coordination/error-coordinator.ts`)
**תכונות:**
- ✅ מעקב אחר שגיאות לפי Agent
- ✅ Circuit Breaker pattern (נפתח אחרי 5 שגיאות)
- ✅ זיהוי דפוסים חוזרים של שגיאות
- ✅ סטטיסטיקות מפורטות לפי Agent
- ✅ ריפוי אוטומטי (נסיון מחדש אחרי 60 שניות)

**Circuit Breaker States:**
- `CLOSED` - פעיל ורץ
- `OPEN` - כבוי (יותר מדי שגיאות)
- `HALF_OPEN` - מנסה להתאושש

**Configuration:**
```typescript
{
  failureThreshold: 5,        // נפתח אחרי 5 שגיאות
  recoveryTimeMs: 60000,      // ממתין 60 שניות
  patternThreshold: 3,        // מזהה דפוס אחרי 3 פעמים
  patternWindowMs: 300000     // בחלון של 5 דקות
}
```

### 2. Performance Monitor (`lib/coordination/performance-monitor.ts`)
**תכונות:**
- ✅ מדידת זמן ביצוע לכל Agent
- ✅ זיהוי bottlenecks אוטומטי
- ✅ התראות על ביצועים איטיים (>10s)
- ✅ מעקב אחר success rate
- ✅ השוואה בין Agents

**Thresholds:**
```typescript
{
  slowExecutionMs: 10000,     // התרעה אחרי 10 שניות
  highFailureRate: 0.3,       // התרעה אחרי 30% failures
  maxRecentAlerts: 20         // שומר 20 התראות אחרונות
}
```

### 3. Orchestrator Integration (`lib/agents/orchestrator-v2.ts`)
**executeAgent Wrapper:**
כל Agent עובר דרך wrapper שמבצע:
1. ✅ בדיקת Circuit Breaker לפני הרצה
2. ✅ מדידת זמן ביצוע
3. ✅ Timeout protection
4. ✅ רישום שגיאות והצלחות
5. ✅ עדכון מטריקות

**Agents Protected:**
- Budget Agent (5s timeout)
- Velocity Agent (5s timeout)
- Holidays Agent (5s timeout)
- Historical Agent (10s timeout)
- Statistics Agent (10s timeout)
- Trends Agent (10s timeout)
- Events Agent (20s timeout)
- Competitor Agent (10-60s timeout)

## API Endpoints

### GET /api/monitoring/stats
מחזיר סטטיסטיקות מלאות:

```json
{
  "timestamp": "2026-01-04T...",
  "errors": {
    "total": 42,
    "byAgent": {
      "Events Agent": 5,
      "Competitor Agent": 2
    },
    "circuitBreakers": [
      {
        "agentName": "Events Agent",
        "state": "open",
        "failureCount": 6,
        "lastFailure": "...",
        "nextRetryAt": "..."
      }
    ],
    "patterns": [...]
  },
  "performance": {
    "totalExecutions": 150,
    "avgExecutionTime": 3200,
    "overallSuccessRate": 0.92,
    "slowestAgents": [...],
    "mostReliableAgents": [...],
    "bottlenecks": [...],
    "recentAlerts": [...]
  }
}
```

## Usage Examples

### Check Monitoring Stats
```bash
curl https://your-domain.vercel.app/api/monitoring/stats
```

### View in Browser
פתח: `https://your-domain.vercel.app/api/monitoring/stats`

### Monitor Real-time
```bash
watch -n 5 'curl -s https://your-domain.vercel.app/api/monitoring/stats | jq ".performance.totalExecutions, .errors.total"'
```

## Benefits

### 🛡️ Resilience
- Agents שנכשלים לא משביתים את כל המערכת
- Circuit breakers מונעים "thundering herd"
- Automatic recovery אחרי תקלות

### 📊 Visibility
- מטריקות בזמן אמת לכל Agent
- זיהוי bottlenecks מיידי
- מעקב אחר דפוסים של שגיאות

### ⚡ Performance
- זיהוי Agents איטיים
- אופטימיזציה מבוססת מידע
- מניעת timeouts מיותרים

## Monitoring in Production

### Key Metrics to Watch
1. **Circuit Breaker States** - כמה Agents open/closed
2. **Execution Times** - ממוצע ו-p95
3. **Failure Rates** - אחוז הצלחה לפי Agent
4. **Error Patterns** - שגיאות חוזרות

### Alerts to Set Up
- ⚠️ Circuit breaker נפתח
- ⚠️ Agent איטי (>10s)
- ⚠️ High failure rate (>30%)
- ⚠️ Error pattern detected

## Future Enhancements
- [ ] Dashboard UI עם גרפים
- [ ] Prometheus/Grafana integration
- [ ] Auto-scaling based on metrics
- [ ] ML-based anomaly detection
- [ ] Slack/Email notifications
- [ ] Historical trends analysis

## Inspired By
Based on patterns from [awesome-claude-code-subagents](https://github.com/tomosaigon/awesome-claude-code-subagents)

---
Created: 2026-01-04
Version: 1.0.0
