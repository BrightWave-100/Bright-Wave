import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Copy, LogIn, LogOut, User as UserIcon } from 'lucide-react';
import { SimulationResult } from '../engine/types';
import {
  getOrCreatePlayerIdentity,
  setLocalPlayerName,
  trackArenaEvent,
} from '../lib/player';
import { generateAndCopyChallengeShareLink } from '../lib/share';
import {
  User,
  auth,
  fetchUserSavedResultsFromFirestore,
  onAuthStateChanged,
  signInWithGoogle,
  signOutUser,
} from '../lib/firebase';

export const ProfilePage: React.FC = () => {
  const identity = getOrCreatePlayerIdentity();
  const [displayName, setDisplayName] = useState(identity.playerName);
  const [savingName, setSavingName] = useState(false);
  const [savedNameSuccess, setSavedNameSuccess] = useState(false);

  const [results, setResults] = useState<SimulationResult[]>([]);
  const [loadingResults, setLoadingResults] = useState(true);
  const [copiedResultId, setCopiedResultId] = useState<string | null>(null);

  const [firebaseUser, setFirebaseUser] = useState<User | null>(
    auth.currentUser
  );
  const [cloudResults, setCloudResults] = useState<
    Array<{
      id: string;
      challengeId: string;
      challengeTitle: string;
      score: number;
      archetype: string;
      shareToken: string;
    }>
  >([]);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setFirebaseUser(u);
      if (u) {
        fetchUserSavedResultsFromFirestore(u)
          .then(setCloudResults)
          .catch(() => {});
      } else {
        setCloudResults([]);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    fetch(`/api/player/${encodeURIComponent(identity.playerId)}/results`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.results)) {
          setResults(data.results);
        }
      })
      .catch((err) => console.error('Failed to load player results:', err))
      .finally(() => setLoadingResults(false));
  }, [identity.playerId]);

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingName(true);
    setSavedNameSuccess(false);
    try {
      const updated = setLocalPlayerName(displayName);
      setDisplayName(updated);
      await fetch('/api/player/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: identity.playerId,
          displayName: updated,
        }),
      });
      setSavedNameSuccess(true);
      setTimeout(() => setSavedNameSuccess(false), 2500);
    } finally {
      setSavingName(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setAuthError(null);
    try {
      trackArenaEvent('signup_started');
      const user = await signInWithGoogle(identity.playerId);
      setFirebaseUser(user);
      trackArenaEvent('signup_completed');
      const saved = await fetchUserSavedResultsFromFirestore(user);
      setCloudResults(saved);
    } catch {
      setAuthError(
        'Google Sign-In popup was closed or blocked. You can continue playing with your anonymous profile.'
      );
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-10">
      <div className="space-y-2">
        <h1 className="font-display text-3xl font-extrabold text-white">
          Player Profile & History
        </h1>
        <p className="text-sm text-slate-400">
          Manage your leaderboard display name, inspect past runs, or link your Google account.
        </p>
      </div>

      {/* Identity & Display Name Card */}
      <section className="bg-[#121824] border border-slate-800 rounded-2xl p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-slate-800 flex items-center justify-center text-amber-400 shrink-0">
              <UserIcon className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-base font-bold text-white">{displayName}</p>
              <p className="font-mono text-xs text-slate-400">
                Session ID: {identity.playerId}
              </p>
            </div>
          </div>

          {firebaseUser ? (
            <button
              type="button"
              onClick={() => signOutUser()}
              className="min-h-[40px] px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-2 cursor-pointer self-start sm:self-auto"
            >
              <LogOut className="w-4 h-4" aria-hidden="true" />
              <span>Sign Out</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleGoogleSignIn}
              className="min-h-[42px] px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold flex items-center gap-2 cursor-pointer self-start sm:self-auto"
            >
              <LogIn className="w-4 h-4" aria-hidden="true" />
              <span>Connect Google Account</span>
            </button>
          )}
        </div>

        {authError && (
          <p className="text-xs text-amber-300">{authError}</p>
        )}

        <form onSubmit={handleUpdateName} className="space-y-3">
          <label
            htmlFor="display-name-input"
            className="block text-xs font-semibold text-slate-300"
          >
            Public Leaderboard Display Name (Never use your email address)
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              id="display-name-input"
              type="text"
              maxLength={40}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="flex-1 min-h-[44px] px-4 py-2 bg-[#0B0F17] border border-slate-800 focus:border-amber-400 rounded-xl text-sm text-white outline-none"
            />
            <button
              type="submit"
              disabled={savingName}
              className="min-h-[44px] px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
            >
              {savedNameSuccess ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Updated</span>
                </>
              ) : (
                <span>{savingName ? 'Saving...' : 'Update Display Name'}</span>
              )}
            </button>
          </div>
        </form>
      </section>

      {/* Completed Simulation History */}
      <section className="space-y-4">
        <h2 className="font-display text-xl font-bold text-white">
          Completed Simulation Runs ({results.length})
        </h2>

        {loadingResults ? (
          <div className="h-32 rounded-2xl bg-[#121824] border border-slate-800 animate-pulse" />
        ) : results.length === 0 ? (
          <div className="bg-[#121824] border border-slate-800 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <p className="text-sm text-slate-400">
              You haven&apos;t completed a simulation run yet.
            </p>
            <Link
              to="/challenges"
              className="px-4 py-2 text-xs font-bold bg-amber-400 text-slate-950 rounded-xl whitespace-nowrap"
            >
              Browse Challenges
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-800 border border-slate-800 rounded-2xl bg-[#121824]">
            {results.map((r) => (
              <div
                key={r.id}
                className="p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <p className="text-sm font-bold text-white">
                    {r.challengeTitle}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mt-0.5">
                    <span className="text-amber-400">{r.archetype}</span>
                    <span aria-hidden="true">·</span>
                    <span>Tier: {r.tier}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="font-mono tabular-nums text-lg font-extrabold text-white">
                    {r.score}/100
                  </span>
                  <button
                    type="button"
                    onClick={async () => {
                      const { copied } =
                        await generateAndCopyChallengeShareLink(r);
                      if (copied) {
                        setCopiedResultId(r.id);
                        setTimeout(() => setCopiedResultId(null), 2200);
                      }
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                  >
                    {copiedResultId === r.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Copied Link</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Share Link</span>
                      </>
                    )}
                  </button>
                  <Link
                    to={`/result/${r.id}`}
                    className="text-xs font-semibold text-amber-400 hover:text-amber-300 underline underline-offset-4 whitespace-nowrap"
                  >
                    View &amp; Compare
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Cloud Synced Vault (if signed in with Google) */}
      {firebaseUser && (
        <section className="space-y-4">
          <h2 className="font-display text-xl font-bold text-white">
            Cloud-Backed Account Vault ({cloudResults.length})
          </h2>
          {cloudResults.length === 0 ? (
            <p className="text-xs text-slate-400">
              Click &ldquo;Save Your Results&rdquo; on any completed simulation screen to store a permanent copy in your verified cloud vault.
            </p>
          ) : (
            <div className="divide-y divide-slate-800 border border-slate-800 rounded-2xl bg-[#121824]">
              {cloudResults.map((cr) => (
                <div
                  key={cr.id}
                  className="p-4 sm:px-6 flex items-center justify-between gap-4"
                >
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {cr.challengeTitle}
                    </p>
                    <p className="text-xs text-slate-400">{cr.archetype}</p>
                  </div>
                  <span className="font-mono tabular-nums text-base font-bold text-amber-400">
                    {cr.score}/100
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
};
