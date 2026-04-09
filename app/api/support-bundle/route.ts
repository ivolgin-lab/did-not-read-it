import { NextResponse } from 'next/server';
import { getStatus, startSupportBundle } from '@/lib/supportBundle';

export async function POST() {
  const result = startSupportBundle();
  return NextResponse.json(result, { status: result.started ? 202 : 409 });
}

export async function GET() {
  return NextResponse.json(getStatus());
}
