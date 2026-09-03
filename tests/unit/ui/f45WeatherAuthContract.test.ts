import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('F4.5 weather authenticated boundary', () => {
  it('authenticates live forecast requests without exposing the provider key', () => {
    const live = read('src/app/site-diary/ProjectWeatherPulse.tsx');
    expect(live).toContain('useAuth');
    expect(live).toContain('session?.access_token');
    expect(live).toContain('Authorization: `Bearer ${accessToken}`');
    expect(live).not.toContain('VISUAL_CROSSING_API_KEY');
  });

  it('authenticates historical evidence requests and falls back to manual when session is unavailable', () => {
    const evidence = read('src/app/site-diary/WeatherEvidenceSection.tsx');
    expect(evidence).toContain('useAuth');
    expect(evidence).toContain('session?.access_token');
    expect(evidence).toContain('Authorization: `Bearer ${accessToken}`');
    expect(evidence).toContain("source: 'MANUAL'");
    expect(evidence).not.toContain('VISUAL_CROSSING_API_KEY');
  });

  it('keeps the Visual Crossing key server-only', () => {
    const server = read('src/lib/weather/siteWeather.ts');
    const route = read('src/app/api/weather/site/route.ts');
    expect(server).toContain('process.env.VISUAL_CROSSING_API_KEY');
    expect(route).toContain('extractVerifiedIdentity');
  });
});
