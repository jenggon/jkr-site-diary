'use client';

import React from 'react';
import { OpenActivityDto } from '@/types/openActivity';

export interface OpenActivityCardProps {
  activity: OpenActivityDto;
  onContinue: (activityId: string) => void;
  disabled?: boolean;
}

export default function OpenActivityCard({
  activity,
  onContinue,
  disabled = false,
}: OpenActivityCardProps) {
  const isVo = activity.sourceType === 'VO' || Boolean(activity.voItemId);
  const isInProgress = activity.status === 'In Progress';
  const displayTitle = activity.subtaskDisplayName || activity.subtask;
  const displayAhi = activity.ahiDisplayName || activity.ahi;

  return (
    <article
      data-testid={`open-activity-card-${activity.activityId}`}
      aria-label={`Aktiviti Terbuka: ${displayTitle}`}
      className="w-full rounded-2xl border border-zinc-800 bg-zinc-900/90 p-4 sm:p-5 shadow-lg hover:border-zinc-700 transition-all flex flex-col justify-between gap-4"
    >
      {/* Top Meta: Source & Lifecycle Status Badges */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        {/* Source Badge */}
        {isVo ? (
          <span
            data-testid="source-badge-vo"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-950/80 border border-emerald-800/60 text-emerald-300"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            Kerja Tambahan / VO (APK)
          </span>
        ) : (
          <span
            data-testid="source-badge-msp"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-950/80 border border-indigo-800/60 text-indigo-300"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
            Kerja Jadual (MSP)
          </span>
        )}

        {/* Status Badge */}
        {isInProgress ? (
          <span
            data-testid="status-badge-inprogress"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-950/80 border border-amber-800/60 text-amber-300"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
            Sedang Laksana
          </span>
        ) : (
          <span
            data-testid="status-badge-new"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-950/80 border border-blue-800/60 text-blue-300"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
            Belum Mula
          </span>
        )}
      </div>

      {/* Main Content: Human-readable Subtask Name & AHI */}
      <div className="space-y-1">
        <h4 className="text-sm sm:text-base font-bold text-zinc-100 leading-snug break-words">
          {displayTitle}
        </h4>

        {displayAhi && (
          <div className="text-xs text-zinc-400 flex items-center gap-1.5 pt-0.5">
            <span className="text-zinc-500 font-medium">AHI:</span>
            <span className="text-zinc-300 font-medium">{displayAhi}</span>
          </div>
        )}
      </div>

      {/* Action: Sambung Laporan Button */}
      <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-end">
        <button
          type="button"
          onClick={() => onContinue(activity.activityId)}
          disabled={disabled}
          data-testid={`continue-activity-btn-${activity.activityId}`}
          aria-label={`Sambung Laporan untuk ${displayTitle}`}
          className="w-full sm:w-auto px-4 py-2.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs sm:text-sm font-bold rounded-xl shadow-md transition-colors flex items-center justify-center gap-2 min-h-[44px]"
        >
          <span>Sambung Laporan</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-4 h-4 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </button>
      </div>
    </article>
  );
}
