import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Trophy } from 'lucide-react';
import { ChallengeSummaryClient } from '../engine/types';
import { LeaderboardRecord } from '../server/store';

export const LeaderboardPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialChallengeId = searchParams.get('challengeId') || 'all';

  const [challenges, setChallenges] = useState<ChallengeSummaryClient[]>([]);
  const [entries, setEntries] = useState<LeaderboardRecord[]>([]);
  const [selectedChallengeId, setSelectedChallengeId] =
    useState<string>(initialChallengeId);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/challenges')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.challenges)) {
          setChallenges(data.challenges);
        }
      })
      .catch((err) => console.error('Failed to load challenge list:', err));
  }, []);

  useEffect(() => {
    setLoading(true);
    const query =
      selectedChallengeId === 'all'
        ? ''
        : `?challengeId=${encodeURIComponent(selectedChallengeId)}`;
    fetch(`/api/leaderboards${query}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.entries)) {
          setEntries(data.entries);
        }
      })
      .catch((err) => console.error('Failed to load leaderboard:', err))
      .finally(() => setLoading(false));
  }, [selectedChallengeId]);

  const handleSelectChallenge = (id: string) => {
    setSelectedChallengeId(id);
    if (id === 'all') {
      setSearchParams({});
    } else {
      setSearchParams({ challengeId: id });
    }
  };

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-amber-400">
          <Trophy className="w-4 h-4" aria-hidden="true" />
          <span>Verified Server Standings</span>
        </div>
        <h1 className="font-display text-3xl font-extrabold text-white">
          Global & Scenario Leaderboards
        </h1>
        <p className="text-sm text-slate-400 max-w-2xl">
          Every entry is calculated and validated server-side from completed simulation runs.
        </p>
      </div>

      {/* Challenge Filter Controls */}
      <div
        role="tablist"
        aria-label="Filter leaderboard by challenge"
        className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-slate-800/80"
      >
        <button
          type="button"
          role="tab"
          aria-selected={selectedChallengeId === 'all'}
          onClick={() => handleSelectChallenge('all')}
          className={`min-h-[40px] px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            selectedChallengeId === 'all'
              ? 'bg-amber-400 text-slate-950'
              : 'bg-[#121824] text-slate-400 hover:text-slate-100 border border-slate-800'
          }`}
        >
          All Challenges
        </button>

        {challenges.map((c) => {
          const active = selectedChallengeId === c.id;
          return (
            <button
              key={c.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => handleSelectChallenge(c.id)}
              className={`min-h-[40px] px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                active
                  ? 'bg-amber-400 text-slate-950'
                  : 'bg-[#121824] text-slate-400 hover:text-slate-100 border border-slate-800'
              }`}
            >
              {c.title}
            </button>
          );
        })}
      </div>

      {/* Leaderboard Table */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="h-16 rounded-xl bg-[#121824] border border-slate-800 animate-pulse"
            />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="bg-[#121824] border border-slate-800 rounded-2xl p-8 text-center space-y-4">
          <p className="text-base font-semibold text-white">
            No verified runs on this leaderboard yet.
          </p>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Challenge Arena never displays fabricated placeholder players. Complete a simulation run to claim Rank #1!
          </p>
          <Link
            to={
              selectedChallengeId !== 'all'
                ? `/play/${selectedChallengeId}`
                : '/play/business1000'
            }
            className="inline-block px-5 py-2.5 text-xs font-bold bg-amber-400 text-slate-950 rounded-xl"
          >
            Play & Claim Rank #1
          </Link>
        </div>
      ) : (
        <div className="bg-[#121824] border border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-800/80">
          {entries.map((entry, idx) => (
            <div
              key={entry.id}
              className="p-4 sm:px-6 flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-4 min-w-0">
                <span className="font-mono tabular-nums text-sm font-bold text-amber-400 w-7 shrink-0">
                  {idx + 1}.
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white truncate">
                    {entry.displayName}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                    <span>{entry.challengeTitle}</span>
                    <span aria-hidden="true">·</span>
                    <span className="text-slate-300">{entry.archetype}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 shrink-0">
                <span className="font-mono tabular-nums text-lg font-extrabold text-white">
                  {entry.score}
                </span>
                {entry.shareToken ? (
                  <Link
                    to={`/challenge/${entry.challengeId}/beat/${entry.shareToken}`}
                    className="text-xs font-medium text-amber-400 hover:text-amber-300 underline underline-offset-4 whitespace-nowrap"
                  >
                    Challenge
                  </Link>
                ) : (
                  <Link
                    to={`/play/${entry.challengeId}`}
                    className="text-xs font-medium text-amber-400 hover:text-amber-300 underline underline-offset-4 whitespace-nowrap"
                  >
                    Play Scenario
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
