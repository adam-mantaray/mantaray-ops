import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const { pin } = await req.json();
  const correctPin = process.env.OPS_PIN || '2695';

  if (pin === correctPin) {
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ ok: false, error: 'Invalid PIN' }, { status: 401 });
}
