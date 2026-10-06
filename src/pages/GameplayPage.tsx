import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowRight, CheckCircle2, RotateCcw, AlertCircle } from 'lucide-react';
import {
  ChallengeSessionClient,
  DecisionHistoryItem,
  StateMetricDefinition,
} from '../engine/types';
import { getOrCreatePlayerIdentity, trackArenaEvent } from '../lib/player';
import { soundEngine } from '../lib/sound';

function formatMetricValue(
  value: number,
  unit?: StateMetricDefinition['unit']
): string {
  if (unit === 'currency') {
    return `$${value.toLocaleString()}`;
  }
  if (unit === 'percent') {
    return `${value}%`;
  }
  if (unit === 'day') {
    return `Day ${value}`;
  }
  if (unit === 'hours') {
    return `${value}h`;
  }
  return value.toLocaleString();
}

export const GameplayPage: React.FC = () => {
  const { challengeId } = useParams<{ challengeId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const isDaily = searchParams.get('daily') === '1';
  const friendShareToken = searchParams.get('beat') || undefined;

  const [session, setSession] = useState<ChallengeSessionClient | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [latestConsequence, setLatestConsequence] =
    useState<DecisionHistoryItem | null>(null);
  const [completedResultId, setCompletedResultId] = useState<string | null>(
    null
  );

  const startOrResumeSession = useCallback(
    async (forceNew = false) => {
      if (!challengeId) return;
      setLoading(true);
      setError(null);
      setLatestConsequence(null);
      setSelectedOptionId(null);
      setCompletedResultId(null);

      try {
        const { playerId, playerName } = getOrCreatePlayerIdentity();
        const res = await fetch('/api/sessions/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            challengeId,
            playerId,
            playerName,
            isDaily,
            friendShareToken,
            forceNew,
          }),
        });

        const data = await res.json();
        if (!res.ok || !data.session) {
          throw new Error(data.error || 'Could not start simulation session.');
        }

        setSession(data.session);
        trackArenaEvent(
          friendShareToken ? 'friend_challenge_started' : 'challenge_started',
          {
            challengeId: data.session.challengeId,
            sessionId: data.session.id,
            shareToken: friendShareToken,
          }
        );
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Unable to initialize simulation.'
        );
      } finally {
        setLoading(false);
      }
    },
    [challengeId, isDaily, friendShareToken]
  );

  useEffect(() => {
    startOrResumeSession(false);
  }, [startOrResumeSession]);

  const handleSelectOption = async (optionId: string) => {
    if (!session || !session.currentDecision || submitting || latestConsequence) {
      return;
    }

    soundEngine.playSelect();
    setSelectedOptionId(optionId);
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/sessions/${session.id}/decide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          challengeId: session.challengeId,
          decisionIndex: session.currentDecisionIndex,
          decisionId: session.currentDecision.id,
          optionId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.session) {
          setSession(data.session);
        }
        throw new Error(data.error || 'Decision validation failed.');
      }

      soundEngine.playConsequence();
      setSession(data.session);
      setLatestConsequence(data.consequence);

      trackArenaEvent('decision_made', {
        challengeId: session.challengeId,
        sessionId: session.id,
        metadata: {
          decisionIndex: session.currentDecisionIndex,
          optionId,
        },
      });

      if (data.completed && data.result) {
        setCompletedResultId(data.result.id);
        trackArenaEvent('challenge_completed', {
          challengeId: session.challengeId,
          sessionId: session.id,
          metadata: { score: data.result.score },
        });
        if (data.result.friendTargetBeaten?.beaten) {
          trackArenaEvent('friend_score_beaten', {
            challengeId: session.challengeId,
            shareToken: data.result.friendTargetBeaten.shareToken,
          });
        }
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Network interruption while recording your choice.'
      );
      setSelectedOptionId(null);
    } finally {
      setSubmitting(false);
    }
  };

  const handleContinue = () => {
    if (completedResultId) {
      soundEngine.playResultComplete();
      navigate(`/result/${completedResultId}`);
      return;
    }
    setLatestConsequence(null);
    setSelectedOptionId(null);
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 py-8">
        <div className="h-10 w-64 bg-[#121824] rounded-xl animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="h-20 bg-[#121824] border border-slate-800 rounded-xl animate-pulse"
            />
          ))}
        </div>
        <div className="h-64 bg-[#121824] border border-slate-800 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (error && !session) {
    return (
      <div className="max-w-xl mx-auto bg-[#121824] border border-slate-800 rounded-2xl p-8 text-center space-y-4">
        <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
        <h1 className="font-display text-xl font-bold text-white">
          Simulation Unavailable
        </h1>
        <p className="text-sm text-slate-300">{error}</p>
        <div className="flex justify-center gap-3">
          <button
            type="button"
            onClick={() => startOrResumeSession(true)}
            className="px-4 py-2.5 text-xs font-semibold bg-amber-400 text-slate-950 rounded-xl cursor-pointer"
          >
            Start Fresh Session
          </button>
          <button
            type="button"
            onClick={() => navigate('/challenges')}
            className="px-4 py-2.5 text-xs font-semibold bg-slate-800 text-slate-200 rounded-xl cursor-pointer"
          >
            Back to Library
          </button>
        </div>
      </div>
    );
  }

  if (!session) return null;

  const progressSteps = session.totalDecisions;
  const completedSteps = latestConsequence
    ? session.currentDecisionIndex
    : session.currentDecisionIndex;
  const progressPercent = Math.min(
    100,
    Math.round((completedSteps / Math.max(1, progressSteps)) * 100)
  );

  const activeDecision = session.currentDecision;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header & Progress Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <span className="text-amber-400 font-semibold">
              {session.isDaily ? "Today's Daily Challenge" : 'Live Simulation'}
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">
              Decision {Math.min(session.currentDecisionIndex + (latestConsequence ? 0 : 1), session.totalDecisions)} of {session.totalDecisions}
            </span>
          </div>
          <h1 className="font-display text-2xl font-bold text-white">
            {session.challengeTitle}
          </h1>
        </div>

        <button
          type="button"
          onClick={() => startOrResumeSession(true)}
          title="Restart Challenge"
          className="self-start sm:self-auto min-h-[40px] px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-white bg-[#121824] border border-slate-800 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Restart Run</span>
        </button>
      </div>

      {/* Progress Bar */}
      <div
        role="progressbar"
        aria-valuenow={progressPercent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Simulation progress"
        className="w-full h-2 bg-slate-800/90 rounded-full overflow-hidden"
      >
        <div
          className="h-full bg-amber-400 transition-all duration-200"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Compact State HUD Bar */}
      <section
        aria-label="Current Simulation State"
        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5"
      >
        {session.stateMetrics.map((metric) => {
          const val = session.state[metric.key] ?? 0;
          const delta = latestConsequence?.stateChanges?.[metric.key];
          return (
            <div
              key={metric.key}
              className="bg-[#121824] border border-slate-800/90 rounded-xl px-3.5 py-2.5 flex flex-col justify-between"
            >
              <span className="text-[11px] font-medium text-slate-400 tracking-tight truncate">
                {metric.label}
              </span>
              <div className="flex items-baseline justify-between gap-1 mt-1">
                <span className="font-mono tabular-nums text-base sm:text-lg font-bold text-white">
                  {formatMetricValue(val, metric.unit)}
                </span>
                {typeof delta === 'number' && delta !== 0 && (
                  <span
                    className={`font-mono tabular-nums text-xs font-semibold ${
                      metric.key === 'risk'
                        ? delta > 0
                          ? 'text-rose-400'
                          : 'text-emerald-400'
                        : delta > 0
                        ? 'text-emerald-400'
                        : 'text-rose-400'
                    }`}
                  >
                    {delta > 0 ? `+${delta}` : delta}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </section>

      {error && (
        <div
          role="alert"
          className="bg-rose-950/50 border border-rose-800 text-rose-200 rounded-xl p-4 text-sm"
        >
          {error}
        </div>
      )}

      {/* Consequence Panel (After making a decision) */}
      {latestConsequence ? (
        <section
          aria-live="polite"
          className="bg-[#121824] border border-amber-400/50 rounded-2xl p-6 sm:p-8 space-y-5"
        >
          {latestConsequence.consequence.turbulenceNotice && (
            <p className="text-xs text-amber-300/90 border-b border-slate-800 pb-2">
              {latestConsequence.consequence.turbulenceNotice}
            </p>
          )}

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-amber-400 font-medium">
              <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Consequence Recorded</span>
              <span aria-hidden="true">·</span>
              <span className="text-slate-400">
                You chose: {latestConsequence.optionTitle}
              </span>
            </div>

            <h2 className="font-display text-2xl font-bold text-white">
              {latestConsequence.consequence.eventTitle}
            </h2>
          </div>

          <p className="text-base text-slate-200 leading-relaxed">
            {latestConsequence.consequence.narrative}
          </p>

          <div className="pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <p className="text-xs text-slate-400 italic">
              Analysis: {latestConsequence.consequence.feedback}
            </p>

            <button
              type="button"
              onClick={handleContinue}
              className="min-h-[48px] px-6 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 shrink-0 transition-colors cursor-pointer whitespace-nowrap"
            >
              <span>
                {completedResultId
                  ? 'Reveal Final Score'
                  : 'Next Decision'}
              </span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </section>
      ) : activeDecision ? (
        /* Active Decision Prompt & Option Cards */
        <section className="space-y-5">
          <div className="bg-[#121824] border border-slate-800/90 rounded-2xl p-6 space-y-3">
            <p className="font-mono text-xs font-semibold text-amber-400">
              {activeDecision.roundLabel}
            </p>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              {activeDecision.context}
            </p>
            <h2 className="font-display text-xl sm:text-2xl font-bold text-white pt-1">
              {activeDecision.prompt}
            </h2>
          </div>

          <div
            role="group"
            aria-label="Available decisions"
            className="space-y-3.5"
          >
            {activeDecision.options.map((option, idx) => {
              const isSelected = selectedOptionId === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  disabled={submitting}
                  onClick={() => handleSelectOption(option.id)}
                  className={`w-full text-left min-h-[68px] p-5 rounded-2xl border transition-all duration-150 flex items-start gap-4 cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-400 ${
                    isSelected
                      ? 'bg-amber-400/15 border-amber-400 text-white scale-[0.99]'
                      : submitting
                      ? 'bg-[#121824]/50 border-slate-800/60 text-slate-500 opacity-60 cursor-not-allowed'
                      : 'bg-[#121824] border-slate-800/90 hover:border-amber-400/60 hover:bg-slate-800/40 text-slate-100'
                  }`}
                >
                  <span className="font-mono tabular-nums text-xs font-bold text-amber-400 mt-0.5 shrink-0">
                    0{idx + 1}.
                  </span>
                  <div className="space-y-1.5 flex-1">
                    <p className="font-semibold text-base text-white leading-snug">
                      {option.title}
                    </p>
                    <p className="text-sm text-slate-400 leading-relaxed">
                      {option.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {submitting && (
            <p
              aria-live="polite"
              className="text-xs font-mono text-amber-400 text-center animate-pulse"
            >
              Validating decision and computing simulation state...
            </p>
          )}
        </section>
      ) : (
        <div className="bg-[#121824] border border-slate-800 rounded-2xl p-6 text-center space-y-4">
          <p className="text-base font-semibold text-white">
            This simulation run is complete.
          </p>
          {session.resultId && (
            <button
              type="button"
              onClick={() => navigate(`/result/${session.resultId}`)}
              className="px-5 py-2.5 text-xs font-bold bg-amber-400 text-slate-950 rounded-xl cursor-pointer"
            >
              View Result
            </button>
          )}
        </div>
      )}
    </div>
  );
};
