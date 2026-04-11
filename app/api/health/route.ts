import { NextResponse } from 'next/server'
import { getSupabaseConfigurationIssue } from '@/lib/supabase/config'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabaseIssue = getSupabaseConfigurationIssue()

  const healthCheck = {
    status: supabaseIssue ? 'degraded' : 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    checks: {
      app: 'ok',
      memory: getMemoryStatus(),
      supabase: supabaseIssue ? { status: 'not_configured', issue: supabaseIssue } : { status: 'configured' },
    }
  }

  return NextResponse.json(healthCheck)
}

function getMemoryStatus() {
  if (typeof process !== 'undefined' && process.memoryUsage) {
    const used = process.memoryUsage()
    const heapUsedMB = Math.round(used.heapUsed / 1024 / 1024)
    const heapTotalMB = Math.round(used.heapTotal / 1024 / 1024)
    const usagePercent = Math.round((used.heapUsed / used.heapTotal) * 100)
    
    return {
      heapUsed: `${heapUsedMB}MB`,
      heapTotal: `${heapTotalMB}MB`,
      usagePercent: `${usagePercent}%`,
      status: usagePercent < 90 ? 'ok' : 'warning'
    }
  }
  return { status: 'ok' }
}
