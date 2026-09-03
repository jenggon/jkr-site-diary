import { ActivityStatus, ActivityWeather } from '@/types/activity';

/**
 * Site Diary Engine Domain Model
 *
 * Project: JKR Site Diary Platform
 * Specs: DB-015 (Site Diary Schema), F1 Page 1 Visual Contract
 * ADRs: ADR-007, ADR-009
 * Business Rules: SD-001, SD-002, SD-003, SD-005
 */

export interface SiteDiaryManpower {
  trade_name: string;
  bumi_count: number;
  non_bumi_count: number;
  foreign_count: number;
}

export type SiteDiaryContractorScope = 'CONTRACTOR' | 'NSC';
export type SiteDiaryWeatherCondition = 'ELOK' | 'HUJAN';
export type SiteDiaryDailyWorkStatus = 'MULA' | 'LAKSANA' | 'SIAP' | 'MULA_DAN_SIAP';
export type SiteDiaryWeatherSource = 'AUTO' | 'USER_CONFIRMED' | 'MANUAL';
export type SiteDiaryWeatherProvider = 'VISUAL_CROSSING';
export type SiteDiaryWeatherResolution = 'HOURLY';

export interface SiteDiaryRainInterval {
  readonly start: string;
  readonly end: string;
}

export type SiteDiaryOperationIntent =
  | 'IN_PROGRESS_DIARY'
  | 'FINAL_COMPLETION_DIARY'
  | 'CARRY_FORWARD_DIARY';

export interface SiteDiaryPrintContext {
  location: string;
  work_start_time: string | null;
  work_end_time: string | null;
  weather_condition: SiteDiaryWeatherCondition | null;
  /** Daily snapshot is carried through the existing atomic print-context boundary. */
  daily_work_status?: SiteDiaryDailyWorkStatus | null;
  /** Legacy first interval fields retained until date-level output #7. */
  rain_start_time: string | null;
  rain_end_time: string | null;
  rain_intervals?: SiteDiaryRainInterval[];
  weather_suggested_intervals?: SiteDiaryRainInterval[];
  weather_source?: SiteDiaryWeatherSource | null;
  weather_provider?: SiteDiaryWeatherProvider | null;
  weather_provider_fetched_at?: string | null;
  weather_provider_resolution?: SiteDiaryWeatherResolution | null;
  weather_latitude?: number | null;
  weather_longitude?: number | null;
  weather_timezone?: string | null;
  contractor_scope: SiteDiaryContractorScope;
}

export interface SiteDiary {
  site_diary_id: string;
  programme_id: string;
  revision_id: string;
  activity_id: string;
  activity_date: string;
  weather: ActivityWeather | null;
  /** Canonical Activity lifecycle snapshot retained for backward compatibility. */
  status: ActivityStatus | null;
  /** Daily Site Diary observation, independent from mutable Activity lifecycle. */
  daily_work_status?: SiteDiaryDailyWorkStatus | null;
  notes: string;
  manpower: SiteDiaryManpower[] | null;
  print_context?: SiteDiaryPrintContext | null;
  submitted_by: string;
  submitted_at: string;
  updated_at: string | null;
}
