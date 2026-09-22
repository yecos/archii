import { NextResponse } from 'next/server';
import { getDynamicFeatureFlags } from '@/lib/feature-flags-server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const flags = await getDynamicFeatureFlags();
  return NextResponse.json(
    { flags },
    { headers: { 'Cache-Control': 'no-store, max-age=0' } },
  );
}
