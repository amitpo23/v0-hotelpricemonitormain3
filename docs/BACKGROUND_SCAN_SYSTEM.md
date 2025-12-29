/**
 * Background Scan Queue System
 * How it works:
 * 1. User clicks "Start Scan" in UI
 * 2. Creates a scan job in database with status "pending"
 * 3. Background worker picks up job and starts scanning
 * 4. UI polls for progress updates
 * 5. User can close browser, scan continues
 */

// ============================================
// OPTION 1: Simple Database Queue (המלצה!)
// ============================================

// 1. Create scan_jobs table:
/*
CREATE TABLE scan_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hotel_id UUID NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, running, completed, failed
  progress INTEGER DEFAULT 0,
  total_scans INTEGER NOT NULL,
  completed_scans INTEGER DEFAULT 0,
  prices_found INTEGER DEFAULT 0,
  current_date DATE,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  started_at TIMESTAMP,
  completed_at TIMESTAMP
);
*/

// 2. API Route to START scan:
// File: app/api/scans/start-background/route.ts

import { createClient } from '@supabase/supabase-js'
import { spawn } from 'child_process'

export async function POST(request: Request) {
  const { hotelId, startDate, endDate } = await request.json()
  
  // Create job in database
  const { data: job, error } = await supabase
    .from('scan_jobs')
    .insert({
      hotel_id: hotelId,
      start_date: startDate,
      end_date: endDate,
      status: 'pending',
      total_scans: calculateTotalScans(startDate, endDate)
    })
    .select()
    .single()
  
  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
  
  // Spawn background process
  const worker = spawn('node', ['scan-worker.mjs', job.id], {
    detached: true,
    stdio: 'ignore'
  })
  worker.unref() // Let it run independently
  
  return Response.json({ 
    success: true, 
    jobId: job.id,
    message: 'סריקה התחילה ברקע' 
  })
}

// 3. API Route to GET progress:
// File: app/api/scans/progress/[jobId]/route.ts

export async function GET(
  request: Request,
  { params }: { params: { jobId: string } }
) {
  const { data: job } = await supabase
    .from('scan_jobs')
    .select('*')
    .eq('id', params.jobId)
    .single()
  
  return Response.json({
    status: job.status,
    progress: job.progress,
    completedScans: job.completed_scans,
    totalScans: job.total_scans,
    pricesFound: job.prices_found,
    currentDate: job.current_date
  })
}

// 4. Worker script:
// File: scan-worker.mjs

import { createClient } from '@supabase/supabase-js'

const jobId = process.argv[2]

async function updateProgress(updates) {
  await supabase
    .from('scan_jobs')
    .update(updates)
    .eq('id', jobId)
}

async function runScan() {
  await updateProgress({ status: 'running', started_at: new Date() })
  
  try {
    // Run actual scan logic...
    for (let i = 0; i < totalScans; i++) {
      // Scan competitor...
      
      // Update progress
      await updateProgress({
        completed_scans: i + 1,
        progress: Math.round((i + 1) / totalScans * 100),
        current_date: currentDate
      })
    }
    
    await updateProgress({ 
      status: 'completed', 
      completed_at: new Date() 
    })
  } catch (error) {
    await updateProgress({ 
      status: 'failed', 
      error_message: error.message 
    })
  }
}

runScan()

// ============================================
// OPTION 2: Using BullMQ (מקצועי יותר)
// ============================================

// npm install bullmq ioredis

// queue.ts
import { Queue } from 'bullmq'

export const scanQueue = new Queue('hotel-scans', {
  connection: {
    host: 'localhost',
    port: 6379
  }
})

// worker.ts
import { Worker } from 'bullmq'

const worker = new Worker('hotel-scans', async (job) => {
  console.log(`Processing job ${job.id}`)
  
  // Update progress
  await job.updateProgress(0)
  
  for (let i = 0; i < 100; i++) {
    // Do work...
    await job.updateProgress(i)
  }
  
  return { success: true }
})

// API route:
export async function POST(request: Request) {
  const { hotelId, startDate, endDate } = await request.json()
  
  const job = await scanQueue.add('scan', {
    hotelId,
    startDate,
    endDate
  })
  
  return Response.json({ jobId: job.id })
}

// ============================================
// UI Component Example
// ============================================

'use client'
import { useState, useEffect } from 'react'

export default function ScanButton() {
  const [jobId, setJobId] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState('idle')
  
  async function startScan() {
    const res = await fetch('/api/scans/start-background', {
      method: 'POST',
      body: JSON.stringify({
        hotelId: 'xxx',
        startDate: '2026-01-01',
        endDate: '2026-03-31'
      })
    })
    const data = await res.json()
    setJobId(data.jobId)
  }
  
  useEffect(() => {
    if (!jobId) return
    
    const interval = setInterval(async () => {
      const res = await fetch(`/api/scans/progress/${jobId}`)
      const data = await res.json()
      
      setProgress(data.progress)
      setStatus(data.status)
      
      if (data.status === 'completed' || data.status === 'failed') {
        clearInterval(interval)
      }
    }, 2000) // Poll every 2 seconds
    
    return () => clearInterval(interval)
  }, [jobId])
  
  return (
    <div>
      <button onClick={startScan}>Start Scan</button>
      {status === 'running' && (
        <div>
          <progress value={progress} max={100} />
          <p>{progress}% Complete</p>
        </div>
      )}
    </div>
  )
}

// ============================================
// RECOMMENDATION:
// ============================================
// Use Option 1 (Database Queue) for simplicity
// No need for Redis/external services
// Works great for your use case
