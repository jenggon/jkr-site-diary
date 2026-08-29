export interface IClock {
  nowIso(): string;
  nowUtcDate(): Date;
}
