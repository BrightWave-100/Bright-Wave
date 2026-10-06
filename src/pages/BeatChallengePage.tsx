import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, Check, Copy, Swords } from 'lucide-react';
import { ChallengeSummaryClient, FriendChallengeInvite } from '../engine/types';
import { trackArenaEvent } from '../lib/player';
import { generateAndCopyChallengeShareLink } from '../lib/share';

export const BeatChallengePage: React.FC = () => {
  const { challengeId, shareToken } = useParams<{
    challengeId: string;
    shareToken: string;
  }>();
  const navigate = useNavigate();

  const [invite, setInvite] = useState<FriendChallengeInvite | null>(null);
  const [challenge, setChallenge] = useState<ChallengeSummaryClient | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [copiedInvite, setCopiedInvite] = useState(false);

  useEffect(() => {
    if (!shareToken) return;
    trackArenaEvent('challenge_invite_opened', {
      challengeId,
      shareToken,
    });

    fetch(`/api/friend-challenges/${shareToken}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.invite) setInvite(data.invite);
        if (data.challenge) setChallenge(data.challenge);
      })
      .catch((err) => console.error('Failed to load friend challenge:', err))
      .finally(() => setLoading(false));
  }, [challengeId, shareToken]);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <div className="h-80 rounded-3xl bg-[#121824] border border-slate-800 animate-pulse" />
      </div>
    );
  }

  if (!invite) {
    return (
      <div className="max-w-xl mx-auto bg-[#121824] border border-slate-800 rounded-2xl p-8 text-center space-y-4">
        <h1 className="font-display text-2xl font-bold text-white">
          Challenge Invite Not Found
        </h1>
        <p className="text-sm text-slate-400">
          This challenge link may have expired or is invalid, but you can still play the scenario directly.
        </p>
        <Link
          to={challengeId ? `/play/${challengeId}` : '/challenges'}
          className="inline-block px-6 py-3 text-xs font-bold bg-amber-400 text-slate-950 rounded-xl"
        >
          Play Challenge Now
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-6 space-y-8">
      <section className="bg-[#121824] border border-amber-400/50 rounded-3xl p-8 sm:p-10 space-y-6">
        <div className="flex items-center gap-2 text-xs font-mono text-amber-400">
          <Swords className="w-4 h-4" aria-hidden="true" />
          <span>Direct Score Challenge · #{invite.shareToken}</span>
        </div>

        <div className="space-y-2">
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            {invite.challengerName} scored{' '}
            <span className="font-mono tabular-nums text-amber-400">
              {invite.score}/100
            </span>
            .
          </h1>
          <p className="font-display text-xl text-slate-200 font-semibold">
            Can you beat them?
          </p>
        </div>

        <div className="border-t border-b border-slate-800 py-5 space-y-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
              <span className="text-amber-400 font-semibold">
                {invite.challengeTitle}
              </span>
              <span aria-hidden="true">·</span>
              <span>Archetype: {invite.archetype}</span>
              {challenge && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono">{challenge.estimatedMinutes}</span>
                </>
              )}
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">
              {invite.challengeDescription}
            </p>
          </div>

          {invite.dimensions && invite.dimensions.length > 0 && (
            <div className="pt-2 space-y-2">
              <p className="text-xs font-mono uppercase tracking-wider text-slate-400">
                {invite.challengerName}&apos;s Outcome Breakdown to Beat
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {invite.dimensions.map((dim) => (
                  <div
                    key={dim.key}
                    className="flex items-center justify-between bg-[#0B0F17] border border-slate-800/80 rounded-xl px-3 py-2 text-xs"
                  >
                    <span className="text-slate-300">{dim.label}</span>
                    <span className="font-mono tabular-nums font-bold text-amber-400">
                      {dim.score}/100
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() =>
                navigate(`/play/${invite.challengeId}?beat=${invite.shareToken}`)
              }
              className="min-h-[52px] px-8 py-3.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
            >
              <span>BEAT THIS SCORE</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={async () => {
                const { copied } = await generateAndCopyChallengeShareLink({
                  id: invite.resultId || invite.shareToken,
                  sessionId: '',
                  challengeId: invite.challengeId,
                  challengeTitle: invite.challengeTitle,
                  score: invite.score,
                  archetype: invite.archetype,
                  shareToken: invite.shareToken,
                  playerName: invite.challengerName,
                });
                if (copied) {
                  setCopiedInvite(true);
                  setTimeout(() => setCopiedInvite(false), 2500);
                }
              }}
              className="min-h-[52px] px-4 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
            >
              {copiedInvite ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Invite Link Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy Invite Link</span>
                </>
              )}
            </button>
          </div>

          <p className="text-xs text-slate-400">
            No signup required · Same scenario version &amp; rules
          </p>
        </div>
      </section>
    </div>
  );
};
