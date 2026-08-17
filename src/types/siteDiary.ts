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
export type SiteDiaryWeatherCondition = 'ELOK' | 'HUJAN' | 'MENDUNG' | 'RIBUT';
export type SiteDiaryOperationIntent = 'IN_PROGRESS_DIARY' | 'FINAL_COMPLETION_DIARY';

export interface SiteDiaryPrintContext {
  location: string;
  work_start_time: string | null;
  work_end_time: string | null;
  weather_condition: SiteDiaryWeatherCondition | null;
  rain_start_time: string | null;
  rain_end_time: string | null;
  contractor_scope: SiteDiaryContractorScope;
}

export interface SiteDiary {
  site_diary_id: string;
  programme_id: string;
  revision_id: string;
  activity_id: string;
  activity_date: string;
  weather: ActivityWeather | null;
  notes: string;
  status: ActivityStatus | null;
  manpower: SiteDiaryManpower[] | null;
  print_context?: SiteDiaryPrintContext | null;
  submitted_by: string;
  submitted_at: string;
  updated_at: string | null;
}
