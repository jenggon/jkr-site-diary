import { NextRequest, NextResponse } from 'next/server';
import { extractVerifiedIdentity } from '@/app/api/_shared/identity';
import { getSiteWeather, SiteWeatherMode } from '@/lib/weather/siteWeather';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: NextRequest) {
  const identity = await extractVerifiedIdentity(request);
  if (!identity) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const modeParam = request.nextUrl.searchParams.get('mode') ?? 'forecast';
  if (modeParam !== 'forecast' && modeParam !== 'historical') {
    return NextResponse.json({ error: 'Invalid weather mode' }, { status: 400 });
  }
  const mode = modeParam as SiteWeatherMode;
  const date = request.nextUrl.searchParams.get('date') ?? undefined;
  if (mode === 'historical' && (!date || !DATE_RE.test(date))) {
    return NextResponse.json({ error: 'Historical weather requires YYYY-MM-DD date' }, { status: 400 });
  }

  try {
    const snapshot = await getSiteWeather(mode, date);
    return NextResponse.json({ data: snapshot }, {
      status: 200,
      headers: { 'Cache-Control': 'private, max-age=0, must-revalidate' },
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : '';
    if (code === 'WEATHER_NOT_CONFIGURED') {
      return NextResponse.json({ error: 'Weather service is not configured' }, { status: 503 });
    }
    if (code === 'WEATHER_CONFIG_INVALID') {
      return NextResponse.json({ error: 'Weather site configuration is invalid' }, { status: 500 });
    }
    return NextResponse.json({ error: 'Weather service is temporarily unavailable' }, { status: 502 });
  }
}
