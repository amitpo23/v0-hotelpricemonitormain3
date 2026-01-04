# Vercel Configuration Notes

## Cron Jobs

The project uses Vercel Cron Jobs for scheduled tasks. The configuration is in `vercel.json`.

### Current Cron Jobs

1. **Auto Scan** (`/api/cron/auto-scan`)
   - Schedule: Every 72 hours
   - Purpose: Automatically scan for price updates

2. **Monitor Scan** (`/api/cron/monitor-scan`)
   - Schedule: Every hour
   - Purpose: Monitor ongoing scans and update status

3. **Update Predictions** (`/api/cron/update-predictions`)
   - Schedule: Every hour
   - Purpose: Update price predictions based on new data

### Important Notes

- Vercel cron configuration does NOT support a `description` field
- Only `path` and `schedule` properties are allowed
- If you see an error about additional properties, check:
  1. Project settings in Vercel dashboard
  2. Any environment-specific overrides
  3. Cached configurations that need to be cleared

### Vercel Cron Schema

```json
{
  "crons": [
    {
      "path": "/api/endpoint",
      "schedule": "cron expression"
    }
  ]
}
```

### Troubleshooting

If you encounter errors like "should NOT have additional property `description`":

1. **Clear Vercel cache**: Redeploy the project
2. **Check project settings**: Ensure no crons are defined in Vercel dashboard
3. **Verify vercel.json**: Ensure it only contains `path` and `schedule`
4. **Remove any comments**: JSON doesn't support comments in runtime

### Reference

- [Vercel Cron Jobs Documentation](https://vercel.com/docs/cron-jobs)
- Valid cron schedule expressions follow standard cron syntax
