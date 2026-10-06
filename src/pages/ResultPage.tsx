import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import confetti from 'canvas-confetti';
import {
  Check,
  Copy,
  RotateCcw,
  Share2,
  BookmarkCheck,
  ArrowRight,
  Link2,
  Sparkles,
} from 'lucide-react';
import { SimulationResult } from '../engine/types';
import { getOrCreatePlayerIdentity, trackArenaEvent } from '../lib/player';
import {
  generateAndCopyChallengeShareLink,
  generateChallengeShareLink,
} from '../lib/share';
import {
  User,
  auth,
  onAuthStateChanged,
  saveResultToFirestoreVault,
  signInWithGoogle,
} from '../lib/firebase';

export const ResultPage: React.FC = () => {
  const { resultId } = useParams<{ resultId: string }>();
  const navigate = useNavigate();

  const [result, setResult] = useState<SimulationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [displayScore, setDisplayScore] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [mintingLink, setMintingLink] = useState(false);
  const [activeShareToken, setActiveShareToken] = useState<string>('');

  const [firebaseUser, setFirebaseUser] = useState<User | null>(
    auth.currentUser
  );
  const [savingVault, setSavingVault] = useState(false);
  const [savedToVault, setSavedToVault] = useState(false);
  const [vaultError, setVaultError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setFirebaseUser(u);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!resultId) return;
    setLoading(true);
    fetch(`/api/results/${resultId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.result) {
          setResult(data.result);
          setActiveShareToken(data.result.shareToken || '');
        }
      })
      .catch((err) => console.error('Failed to load result:', err))
      .finally(() => setLoading(false));
  }, [resultId]);

  // Score count-up & confetti for strong/exceptional scores
  useEffect(() => {
    if (!result) return;
    const target = result.score;
    let current = 0;
    const step = Math.max(1, Math.ceil(target / 24));
    const timer = window.setInterval(() => {
      current += step;
      if (current >= target) {
        setDisplayScore(target);
        window.clearInterval(timer);
      } else {
        setDisplayScore(current);
      }
    }, 22);

    if (target >= 75) {
      try {
        confetti({
          particleCount: 45,
          spread: 60,
          origin: { y: 0.65 },
        });
      } catch {
        // Ignore in headless/non-canvas environments
      }
    }

    return () => window.clearInterval(timer);
  }, [result]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 py-8">
        <div className="h-80 rounded-3xl bg-[#121824] border border-slate-800 animate-pulse" />
        <div className="h-48 rounded-2xl bg-[#121824] border border-slate-800 animate-pulse" />
      </div>
    );
  }

  if (!result) {
    return (
      <div className="max-w-xl mx-auto bg-[#121824] border border-slate-800 rounded-2xl p-8 text-center space-y-4">
        <h1 className="font-display text-2xl font-bold text-white">
          Result Not Found
        </h1>
        <p className="text-sm text-slate-400">
          This simulation result could not be located.
        </p>
        <Link
          to="/challenges"
          className="inline-block px-5 py-2.5 text-xs font-bold bg-amber-400 text-slate-950 rounded-xl"
        >
          Explore Challenges
        </Link>
      </div>
    );
  }

  const sharePayload = generateChallengeShareLink({
    ...result,
    shareToken: activeShareToken || result.shareToken,
  });

  const handleWebShare = async () => {
    trackArenaEvent('result_shared', {
      challengeId: result.challengeId,
      sessionId: result.sessionId,
      shareToken: sharePayload.shareToken,
    });
    trackArenaEvent('challenge_invite_created', {
      challengeId: result.challengeId,
      shareToken: sharePayload.shareToken,
    });

    if (navigator.share) {
      try {
        await navigator.share({
          title: sharePayload.title,
          text: sharePayload.text,
          url: sharePayload.url,
        });
        return;
      } catch {
        // Fallback to copy link if user cancels or share fails
      }
    }
    await handleCopyLink(false);
  };

  const handleCopyLink = async (mintFresh = false) => {
    if (mintFresh) setMintingLink(true);
    try {
      const { copied, payload } = await generateAndCopyChallengeShareLink(
        {
          ...result,
          shareToken: activeShareToken || result.shareToken,
        },
        {
          mintFreshToken: mintFresh,
          copyFullText: false,
        }
      );
      setActiveShareToken(payload.shareToken);
      if (copied) {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2500);
      }
    } finally {
      if (mintFresh) setMintingLink(false);
    }
  };

  const handleCopyText = async () => {
    const { copied, payload } = await generateAndCopyChallengeShareLink(
      {
        ...result,
        shareToken: activeShareToken || result.shareToken,
      },
      {
        mintFreshToken: false,
        copyFullText: true,
      }
    );
    setActiveShareToken(payload.shareToken);
    if (copied) {
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2500);
    }
  };

  const handleSaveToAccount = async () => {
    setSavingVault(true);
    setVaultError(null);
    const { playerId } = getOrCreatePlayerIdentity();

    try {
      let currentUser = firebaseUser;
      if (!currentUser) {
        trackArenaEvent('signup_started', {
          challengeId: result.challengeId,
        });
        currentUser = await signInWithGoogle(playerId);
        setFirebaseUser(currentUser);
        trackArenaEvent('signup_completed', {
          challengeId: result.challengeId,
        });
      }
      await saveResultToFirestoreVault(result, currentUser, playerId);
      setSavedToVault(true);
    } catch (err) {
      setVaultError(
        err instanceof Error
          ? 'Could not complete Google Sign-In or cloud save. Your result remains safely stored on the server.'
          : 'Cloud save failed.'
      );
    } finally {
      setSavingVault(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Friend Beat Banner & Outcome Comparison if applicable */}
      {result.friendTargetBeaten && (
        <div
          className={`rounded-2xl p-6 border ${
            result.friendTargetBeaten.beaten
              ? 'bg-emerald-950/40 border-emerald-700/80 text-emerald-100'
              : 'bg-slate-900 border-slate-700 text-slate-200'
          } space-y-4`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <p className="text-xs font-mono uppercase tracking-wider text-amber-400">
                Head-to-Head Simulation Comparison
              </p>
              <p className="text-base font-bold">
                {result.friendTargetBeaten.beaten
                  ? `You beat ${result.friendTargetBeaten.challengerName}'s score of ${result.friendTargetBeaten.challengerScore}/100!`
                  : `${result.friendTargetBeaten.challengerName} scored ${result.friendTargetBeaten.challengerScore}/100 — you scored ${result.score}/100.`}
              </p>
              {result.friendTargetBeaten.challengerArchetype && (
                <p className="text-xs text-slate-300">
                  {result.friendTargetBeaten.challengerName}:{' '}
                  <strong className="text-white">
                    {result.friendTargetBeaten.challengerArchetype}
                  </strong>{' '}
                  vs. You:{' '}
                  <strong className="text-amber-400">{result.archetype}</strong>
                </p>
              )}
            </div>
            {!result.friendTargetBeaten.beaten && (
              <button
                type="button"
                onClick={() =>
                  navigate(
                    `/play/${result.challengeId}?beat=${result.friendTargetBeaten?.shareToken}`
                  )
                }
                className="px-4 py-2 text-xs font-bold bg-amber-400 text-slate-950 rounded-xl whitespace-nowrap cursor-pointer"
              >
                Rematch Now
              </button>
            )}
          </div>

          {result.friendTargetBeaten.challengerDimensions &&
            result.friendTargetBeaten.challengerDimensions.length > 0 && (
              <div className="pt-3 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {result.dimensions.map((dim) => {
                  const friendDim =
                    result.friendTargetBeaten?.challengerDimensions?.find(
                      (fd) => fd.key === dim.key
                    );
                  if (!friendDim) return null;
                  const diff = dim.score - friendDim.score;
                  return (
                    <div
                      key={dim.key}
                      className="flex items-center justify-between bg-[#0B0F17]/70 px-3 py-2 rounded-xl border border-slate-800/80"
                    >
                      <span className="text-slate-300 font-medium">
                        {dim.label}
                      </span>
                      <span className="font-mono tabular-nums text-slate-200">
                        You: <strong>{dim.score}</strong> · Friend:{' '}
                        <strong>{friendDim.score}</strong>{' '}
                        <span
                          className={
                            diff > 0
                              ? 'text-emerald-400'
                              : diff < 0
                              ? 'text-rose-400'
                              : 'text-slate-400'
                          }
                        >
                          ({diff > 0 ? `+${diff}` : diff})
                        </span>
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
        </div>
      )}

      {/* HTML/CSS SHAREABLE RESULT CARD */}
      <section
        aria-label="Shareable Result Card"
        className="bg-[#121824] border border-slate-800 rounded-3xl p-6 sm:p-10 space-y-6 relative overflow-hidden"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/90 pb-4 text-xs text-slate-400">
          <span className="font-display font-bold text-white tracking-tight text-sm">
            Challenge Arena
          </span>
          <div className="flex items-center gap-2">
            <span>{result.challengeTitle}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono">#{result.shareToken}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          <div className="md:col-span-5 space-y-2">
            <p className="text-xs font-medium text-slate-400">
              Simulation Performance Score
            </p>
            <div className="flex items-baseline gap-2">
              <span className="font-mono tabular-nums text-5xl sm:text-6xl font-extrabold text-amber-400">
                {displayScore}
              </span>
              <span className="font-mono tabular-nums text-xl text-slate-500">
                /100
              </span>
            </div>
            <p className="text-xs font-semibold text-slate-300 capitalize">
              Tier: {result.tier} ({result.tierLabel})
            </p>
          </div>

          <div className="md:col-span-7 space-y-3 md:border-l md:border-slate-800 md:pl-6">
            <p className="text-xs font-mono text-amber-400">
              Result Archetype
            </p>
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {result.archetype}
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              {result.archetypeDescription}
            </p>
          </div>
        </div>

        {/* Dimension Bars */}
        <div className="pt-4 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {result.dimensions.map((dim) => (
            <div key={dim.key} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-300">{dim.label}</span>
                <span className="font-mono tabular-nums font-semibold text-white">
                  {dim.score}/100
                </span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-400 rounded-full transition-all duration-300"
                  style={{ width: `${dim.score}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-400">
          <span>
            Player: <strong className="text-slate-200">{result.playerName}</strong> · Can you beat me?
          </span>
          <span className="font-mono text-slate-500 truncate max-w-full sm:max-w-xs">
            {sharePayload.shortPath}
          </span>
        </div>
      </section>

      {/* VIRAL LOOP / SHARE ACTIONS */}
      <section className="bg-[#121824] border border-slate-800 rounded-2xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-lg font-bold text-white">
              Invite Friends to Compare Simulation Outcomes
            </h2>
            <p className="text-sm text-slate-400">
              Share your unique challenge link—friends play the exact same scenario and get a head-to-head score &amp; dimension comparison.
            </p>
          </div>
        </div>

        {/* Interactive Unique Share Link Field */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 bg-[#0B0F17] border border-slate-800 rounded-xl p-2 pl-3.5">
          <div className="flex items-center gap-2.5 flex-1 min-w-0 py-1.5">
            <Link2 className="w-4 h-4 text-amber-400 shrink-0" aria-hidden="true" />
            <input
              type="text"
              readOnly
              aria-label="Unique challenge share link"
              value={sharePayload.url}
              onClick={(e) => e.currentTarget.select()}
              className="w-full bg-transparent font-mono text-xs text-slate-200 outline-none truncate"
            />
          </div>
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => handleCopyLink(false)}
              className="flex-1 sm:flex-initial min-h-[40px] px-4 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
            >
              {copiedLink ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Link Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Share Link</span>
                </>
              )}
            </button>
            <button
              type="button"
              disabled={mintingLink}
              onClick={() => handleCopyLink(true)}
              title="Generate and copy a fresh unique invite token for another friend"
              className="flex-1 sm:flex-initial min-h-[40px] px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>{mintingLink ? 'Generating...' : 'New Invite Link'}</span>
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleWebShare}
            className="min-h-[48px] px-6 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-sm flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Share2 className="w-4 h-4" aria-hidden="true" />
            <span>CHALLENGE A FRIEND</span>
          </button>

          <button
            type="button"
            onClick={handleCopyText}
            className="min-h-[48px] px-4 py-3 rounded-xl bg-slate-800/70 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
          >
            {copiedText ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span>Comparison Challenge Text Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copy Challenge Text &amp; Link</span>
              </>
            )}
          </button>
        </div>
      </section>

      {/* SAVE YOUR RESULTS (Optional Google Sign-In + Firestore Vault) */}
      <section className="bg-[#121824] border border-slate-800 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="font-display text-base font-bold text-white">
            Save your results across devices
          </h2>
          <p className="text-xs text-slate-400">
            {savedToVault
              ? 'Saved to your verified Google account vault.'
              : firebaseUser
              ? `Signed in as ${firebaseUser.displayName || 'Challenger'}. Click to back up this run to your cloud profile.`
              : 'Optional: Sign in with Google to permanently link this run to your profile.'}
          </p>
          {vaultError && (
            <p className="text-xs text-amber-300 mt-1">{vaultError}</p>
          )}
        </div>

        <button
          type="button"
          disabled={savingVault || savedToVault}
          onClick={handleSaveToAccount}
          className={`min-h-[44px] px-5 py-2.5 rounded-xl font-semibold text-xs flex items-center gap-2 shrink-0 transition-colors cursor-pointer whitespace-nowrap ${
            savedToVault
              ? 'bg-emerald-950/60 border border-emerald-700 text-emerald-300 cursor-default'
              : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
          }`}
        >
          <BookmarkCheck className="w-4 h-4" aria-hidden="true" />
          <span>
            {savedToVault
              ? 'Result Saved'
              : savingVault
              ? 'Saving...'
              : firebaseUser
              ? 'Save Your Results'
              : 'Save Your Results (Google Sign-In)'}
          </span>
        </button>
      </section>

      {/* DECISION TIMELINE RECAP */}
      <section className="space-y-4">
        <h2 className="font-display text-xl font-bold text-white">
          Your Simulation Decision Path
        </h2>
        <div className="divide-y divide-slate-800/80 border border-slate-800/80 rounded-2xl bg-[#121824]">
          {result.decisionHistory.map((step, i) => (
            <div key={step.decisionId} className="p-5 space-y-1.5">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-mono text-amber-400">
                  Decision 0{i + 1}
                </span>
                <span>{step.consequence.eventTitle}</span>
              </div>
              <p className="text-sm font-semibold text-white">
                {step.optionTitle}
              </p>
              <p className="text-xs text-slate-400 leading-relaxed">
                {step.consequence.feedback}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* NEXT ACTIONS */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
        <button
          type="button"
          onClick={() => navigate(`/play/${result.challengeId}`)}
          className="min-h-[44px] px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center gap-2 cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" aria-hidden="true" />
          <span>Play Again</span>
        </button>

        <div className="flex items-center gap-3">
          <Link
            to={`/leaderboard?challengeId=${result.challengeId}`}
            className="min-h-[44px] px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center"
          >
            View Leaderboard
          </Link>
          <Link
            to="/challenges"
            className="min-h-[44px] px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center gap-1.5"
          >
            <span>Next Challenge</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </div>
  );
};
