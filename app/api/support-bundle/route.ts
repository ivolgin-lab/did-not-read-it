import { NextResponse } from 'next/server';
import { generateSupportBundle } from '@/lib/supportBundle';

export async function POST() {
  const result = await generateSupportBundle();
  return NextResponse.json(result, { status: result.success ? 200 : 500 });
}
