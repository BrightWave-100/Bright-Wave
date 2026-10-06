import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { ChallengeSummaryClient } from '../engine/types';
import { ChallengeCard } from '../components/ChallengeCard';
import { trackArenaEvent } from '../lib/player';

import heroImgUrl from '../assets/images/hero_arena_simulation_1790757596882.jpg';
import bizImgUrl from '../assets/images/challenge_business_strategy_1790757609861.jpg';
import survivalImgUrl from '../assets/images/challenge_survival_city_1790757620581.jpg';

interface RecentResultSummary {
  id: string;
  playerName: string;
  challengeId: string;
  challengeTitle: string;
  score: number;
  tier: string;
  archetype: string;
  shareToken: string;
  completedAt: string;
}

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [challenges, setChallenges] = useState<ChallengeSummaryClient[]>([]);
  const [recentResults, setRecentResults] = useState<RecentResultSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [heroImgFailed, setHeroImgFailed] = useState(false);

  useEffect(() => {
    trackArenaEvent('landing_view');
    fetch('/api/challenges')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.challenges)) {
          setChallenges(data.challenges);
        }
        if (Array.isArray(data.recentResults)) {
          setRecentResults(data.recentResults);
        }
      })
      .catch((err) => console.error('Failed to load homepage challenges:', err))
      .finally(() => setLoading(false));
  }, []);

  const featuredSlugs = new Set([
    'business1000',
    'survive30days',
    'startupcrisis',
  ]);
  const featuredChallenges = challenges.filter((c) => featuredSlugs.has(c.id));

  const getFeaturedImage = (id: string) => {
    if (id === 'business1000') return bizImgUrl;
    if (id === 'survive30days') return survivalImgUrl;
    if (id === 'startupcrisis') return heroImgUrl;
    return undefined;
  };

  return (
    <div className="space-y-16">
      {/* HERO SECTION */}
      <section className="relative rounded-3xl overflow-hidden border border-slate-800 bg-[#121824]">
        {!heroImgFailed && (
          <img
            src={heroImgUrl}
            alt="Challenge Arena strategy command table"
            referrerPolicy="no-referrer"
            onError={() => setHeroImgFailed(true)}
            className="absolute inset-0 w-full h-full object-cover object-center opacity-35"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0B0F17] via-[#0B0F17]/90 to-[#0B0F17]/55" />

        <div className="relative z-10 px-6 py-12 sm:px-12 sm:py-16 max-w-3xl space-y-6">
          <p className="text-xs font-medium tracking-wide text-amber-400">
            Interactive Decision-Simulation Engine · 10 Scenarios Live
          </p>

          <h1 className="font-display text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-[1.1]">
            MAKE A CHOICE.{' '}
            <span className="text-amber-400 block sm:inline">
              SEE WHAT HAPPENS.
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-300 max-w-2xl leading-relaxed">
            AI-powered interactive challenges where every decision changes the story. Experience deterministic consequences, earn your strategy score, and dare your friends to beat your run.
          </p>

          <div className="flex flex-wrap items-center gap-3.5 pt-2">
            <button
              type="button"
              onClick={() => navigate('/play/business1000')}
              className="min-h-[48px] px-6 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-sm flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
            >
              <span>PLAY NOW</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={() => navigate('/challenges')}
              className="min-h-[48px] px-6 py-3 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-100 border border-slate-700 font-semibold text-sm transition-colors cursor-pointer whitespace-nowrap"
            >
              EXPLORE CHALLENGES
            </button>

            <Link
              to="/daily"
              className="min-h-[48px] px-4 py-3 text-sm font-medium text-slate-300 hover:text-amber-300 underline underline-offset-4 flex items-center transition-colors whitespace-nowrap"
            >
              Play Today&apos;s Challenge
            </Link>
          </div>
        </div>
      </section>

      {/* FEATURED CHALLENGES */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-slate-800/80 pb-4">
          <div>
            <h2 className="font-display text-2xl font-bold text-white">
              Featured Challenges
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Jump straight into a high-stakes simulation—no account required.
            </p>
          </div>
          <Link
            to="/challenges"
            className="text-sm font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1.5 whitespace-nowrap"
          >
            <span>View All 10 Challenges</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="h-80 rounded-2xl bg-[#121824] border border-slate-800 animate-pulse p-6"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {featuredChallenges.map((c) => (
              <ChallengeCard
                key={c.id}
                challenge={c}
                featuredImage={getFeaturedImage(c.id)}
              />
            ))}
          </div>
        )}
      </section>

      {/* HOW IT WORKS */}
      <section className="border-t border-b border-slate-800/80 py-12 space-y-8">
        <div className="max-w-xl">
          <h2 className="font-display text-2xl font-bold text-white">
            How Challenge Arena Works
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Deterministic simulation mechanics paired with dynamic narrative feedback.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <div>
            <p className="font-mono text-xs text-amber-400 font-semibold mb-2">
              01. Choose a challenge
            </p>
            <h3 className="font-display text-base font-bold text-white mb-1.5">
              Enter a High-Stakes Scenario
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Pick from 10 scenarios across business, survival, negotiation, ethics, and mystery.
            </p>
          </div>

          <div>
            <p className="font-mono text-xs text-amber-400 font-semibold mb-2">
              02. Make your decisions
            </p>
            <h3 className="font-display text-base font-bold text-white mb-1.5">
              Weigh Competing Trade-Offs
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Every choice alters your resources, reputation, energy, and risk profile in real time.
            </p>
          </div>

          <div>
            <p className="font-mono text-xs text-amber-400 font-semibold mb-2">
              03. Watch the outcome
            </p>
            <h3 className="font-display text-base font-bold text-white mb-1.5">
              Get Your Deterministic Score
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Receive an authoritative 0–100 score across four skill dimensions and unlock your result archetype.
            </p>
          </div>

          <div>
            <p className="font-mono text-xs text-amber-400 font-semibold mb-2">
              04. Challenge your friends
            </p>
            <h3 className="font-display text-base font-bold text-white mb-1.5">
              Send a &ldquo;Beat My Score&rdquo; Link
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Share your result card with a unique challenge token so friends can try to top your score.
            </p>
          </div>
        </div>
      </section>

      {/* TRENDING / RECENT VERIFIED RESULTS */}
      <section className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold text-white">
              Recent Verified Runs
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Live server-validated simulation completions.
            </p>
          </div>
          <Link
            to="/leaderboard"
            className="text-sm font-semibold text-amber-400 hover:text-amber-300 whitespace-nowrap"
          >
            Full Leaderboard
          </Link>
        </div>

        {recentResults.length === 0 ? (
          <div className="bg-[#121824] border border-slate-800/80 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-white">
                No completed runs recorded in this session yet.
              </p>
              <p className="text-xs text-slate-400">
                Complete any challenge to set the first verified benchmark on the live board.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/play/business1000')}
              className="px-4 py-2.5 text-xs font-semibold bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl whitespace-nowrap cursor-pointer"
            >
              Set the First Score
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80 border border-slate-800/80 rounded-2xl bg-[#121824] overflow-hidden">
            {recentResults.map((res) => (
              <div
                key={res.id}
                className="p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                    <span className="font-semibold text-slate-200">
                      {res.playerName}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="text-amber-400">{res.archetype}</span>
                    <span aria-hidden="true">·</span>
                    <span>{res.challengeTitle}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-mono tabular-nums text-base font-bold text-white">
                    {res.score}/100
                  </span>
                  <Link
                    to={`/challenge/${res.challengeId}/beat/${res.shareToken}`}
                    className="text-xs font-semibold text-amber-400 hover:text-amber-300 underline underline-offset-4 whitespace-nowrap"
                  >
                    Beat This Score
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
