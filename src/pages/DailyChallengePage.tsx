import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Flame } from 'lucide-react';
import { ChallengeSummaryClient } from '../engine/types';
import { LeaderboardRecord } from '../server/store';

interface DailyResponse {
  dateKey: string;
  seed: string;
  challenge: ChallengeSummaryClient;
  stats: {
    totalRuns: number;
    hasSufficientData: boolean;
    averageScore: number | null;
    topScore: number | null;
  };
  leaderboard: LeaderboardRecord[];
}

export const DailyChallengePage: React.FC = () => {
  const navigate = useNavigate();
  const [daily, setDaily] = useState<DailyResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/daily')
      .then((r) => r.json())
      .then((data) => {
        if (data && data.challenge) {
          setDaily(data);
        }
      })
      .catch((err) => console.error('Failed to load daily challenge:', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 py-8">
        <div className="h-72 rounded-3xl bg-[#121824] border border-slate-800 animate-pulse" />
      </div>
    );
  }

  if (!daily) return null;

  const { challenge, stats, dateKey, seed, leaderboard } = daily;

  return (
    <div className="max-w-3xl mx-auto space-y-10">
      <section className="bg-[#121824] border border-slate-800 rounded-3xl p-6 sm:p-10 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2 text-amber-400 font-semibold">
            <Flame className="w-4 h-4" aria-hidden="true" />
            <span>TODAY&apos;S CHALLENGE</span>
          </div>
          <div className="flex items-center gap-2 font-mono">
            <span>{dateKey}</span>
            <span aria-hidden="true">·</span>
            <span>Seed: {seed}</span>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-xs font-medium text-slate-400">
            Can you beat the global average?
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-white">
            {challenge.title}
          </h1>
          <p className="text-base text-slate-300 leading-relaxed">
            {challenge.description}
          </p>
        </div>

        {/* Honest Aggregate Statistics — Never Fabricated */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div className="bg-[#0B0F17] border border-slate-800/90 rounded-2xl p-4">
            <span className="text-xs text-slate-400 block">
              Global Average Score
            </span>
            <span className="font-mono tabular-nums text-2xl font-bold text-white mt-1 block">
              {stats.hasSufficientData && stats.averageScore !== null
                ? `${stats.averageScore}/100`
                : 'Calibrating...'}
            </span>
            <span className="text-[11px] text-slate-500 mt-0.5 block">
              {stats.hasSufficientData
                ? `Across ${stats.totalRuns} verified runs`
                : `${stats.totalRuns}/3 runs needed for average`}
            </span>
          </div>

          <div className="bg-[#0B0F17] border border-slate-800/90 rounded-2xl p-4">
            <span className="text-xs text-slate-400 block">
              Today&apos;s Top Score
            </span>
            <span className="font-mono tabular-nums text-2xl font-bold text-amber-400 mt-1 block">
              {stats.topScore !== null ? `${stats.topScore}/100` : '—'}
            </span>
            <span className="text-[11px] text-slate-500 mt-0.5 block">
              {stats.topScore !== null
                ? 'Highest verified score'
                : 'Be the first to set a score'}
            </span>
          </div>

          <div className="bg-[#0B0F17] border border-slate-800/90 rounded-2xl p-4">
            <span className="text-xs text-slate-400 block">
              Scenario Format
            </span>
            <span className="font-mono tabular-nums text-2xl font-bold text-white mt-1 block">
              {challenge.totalDecisions} Decisions
            </span>
            <span className="text-[11px] text-slate-500 mt-0.5 block">
              {challenge.difficulty} · {challenge.estimatedMinutes}
            </span>
          </div>
        </div>

        <div className="pt-2">
          <button
            type="button"
            onClick={() => navigate(`/play/${challenge.id}?daily=1`)}
            className="w-full sm:w-auto min-h-[48px] px-8 py-3.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
          >
            <span>PLAY TODAY&apos;S CHALLENGE</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </section>

      {/* Today's Challenge Standings */}
      <section className="space-y-4">
        <h2 className="font-display text-xl font-bold text-white">
          Standings for {challenge.title}
        </h2>
        {leaderboard.length === 0 ? (
          <div className="bg-[#121824] border border-slate-800 rounded-2xl p-6 text-sm text-slate-400">
            No verified runs completed for this scenario yet. Play now to claim the #1 spot.
          </div>
        ) : (
          <div className="divide-y divide-slate-800 border border-slate-800 rounded-2xl bg-[#121824]">
            {leaderboard.map((entry, idx) => (
              <div
                key={entry.id}
                className="p-4 sm:px-6 flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-4">
                  <span className="font-mono tabular-nums text-sm font-bold text-amber-400 w-6">
                    {idx + 1}.
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {entry.displayName}
                    </p>
                    <p className="text-xs text-slate-400">{entry.archetype}</p>
                  </div>
                </div>
                <span className="font-mono tabular-nums text-base font-bold text-white">
                  {entry.score}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
