# 🎯 Decision Agent Database Setup Guide

## Status: Tables Not Created Yet ❌

Run `node check-decision-agent-tables.mjs` to verify.

---

## Option 1: Supabase SQL Editor (Recommended) ✨

### Step 1: Open SQL Editor
Visit: **https://supabase.com/dashboard/project/dqhmraeyisoigxzsitiz/editor**

### Step 2: Copy SQL Script
Open the file `create-decision-agent-tables.sql` and copy its entire contents.

### Step 3: Execute
1. Paste into the SQL Editor
2. Click "Run" (or press Cmd/Ctrl + Enter)
3. Wait ~5-10 seconds for completion

### Step 4: Verify
```bash
node check-decision-agent-tables.mjs
```

You should see all ✅ green checkmarks!

---

## Option 2: psql Command Line

If you have connection string:

```bash
# Get your connection string from:
# https://supabase.com/dashboard/project/dqhmraeyisoigxzsitiz/settings/database

# Then run:
psql "your-connection-string" -f create-decision-agent-tables.sql
```

---

## Option 3: Supabase CLI (if installed)

```bash
# Link to project
supabase link --project-ref dqhmraeyisoigxzsitiz

# Run migration
supabase db push
```

---

## What Gets Created

### 6 Tables:
1. **agent_execution_logs** - Track all agent executions
2. **agent_accuracy_tracking** - Historical accuracy data  
3. **decision_logs** - Every Decision Agent decision
4. **israeli_holidays** - Holiday data with tourism impact
5. **external_data_cache** - Cache for external APIs
6. **autopilot_executions** - Autonomous price changes

### 4 Views:
1. **agent_performance_summary** - Performance metrics
2. **agent_accuracy_summary** - Accuracy rates
3. **decision_quality_trends** - Decision quality over time
4. **autopilot_roi_summary** - ROI from autopilot

### Sample Data:
- 8 Israeli holidays for 2025 with tourism impact multipliers

---

## Verify Tables Exist

```bash
node check-decision-agent-tables.mjs
```

Expected output:
```
✅ agent_execution_logs - EXISTS
✅ agent_accuracy_tracking - EXISTS
✅ decision_logs - EXISTS
✅ israeli_holidays - EXISTS
✅ external_data_cache - EXISTS
✅ autopilot_executions - EXISTS
```

---

## Next Steps After Setup

1. **Test Decision Agent**:
   ```bash
   node test-decision-agent.mjs
   ```

2. **View Documentation**:
   - `DECISION_AGENT_GUIDE.md` - Usage guide
   - `QUICK_START.md` - Quick reference

3. **Start Using**:
   - Decision Agent is automatically used by orchestrator-v2
   - See examples in `DECISION_AGENT_GUIDE.md`

---

## Troubleshooting

### Error: "permission denied"
- Make sure you're using the **service_role** key, not anon key
- Get it from: Settings → API → service_role

### Error: "relation already exists"
- Tables already created! Run verification:
  ```bash
  node check-decision-agent-tables.mjs
  ```

### Still having issues?
- Check Supabase logs in Dashboard
- Verify your project is active
- Try running SQL in smaller chunks
