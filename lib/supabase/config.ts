import { NextResponse } from 'next/server';

const PLACEHOLDER_VALUES = new Set([
  'https://your-project-id.supabase.co',
  'your-anon-key-here',
  'your-service-role-key-here',
]);

function hasPlaceholder(value?: string) {
  if (!value) return true;
  const normalized = value.trim();
  if (!normalized) return true;
  if (PLACEHOLDER_VALUES.has(normalized)) return true;
  return normalized.includes('your-project-id.supabase.co');
}

export function getSupabaseConfigurationIssue(): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (hasPlaceholder(url)) {
    return 'Supabase is not configured: NEXT_PUBLIC_SUPABASE_URL is missing or placeholder.';
  }

  if (hasPlaceholder(anonKey)) {
    return 'Supabase is not configured: NEXT_PUBLIC_SUPABASE_ANON_KEY is missing or placeholder.';
  }

  if (hasPlaceholder(serviceRoleKey)) {
    return 'Supabase is not configured: SUPABASE_SERVICE_ROLE_KEY is missing or placeholder.';
  }

  return null;
}

export function getSupabaseConfigErrorResponse() {
  const issue = getSupabaseConfigurationIssue();
  if (!issue) return null;

  return NextResponse.json(
    {
      error: issue,
      code: 'SUPABASE_NOT_CONFIGURED',
    },
    { status: 503 }
  );
}
