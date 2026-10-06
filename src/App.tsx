/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { HomePage } from './pages/HomePage';
import { ChallengesPage } from './pages/ChallengesPage';
import { GameplayPage } from './pages/GameplayPage';
import { ResultPage } from './pages/ResultPage';
import { BeatChallengePage } from './pages/BeatChallengePage';
import { DailyChallengePage } from './pages/DailyChallengePage';
import { LeaderboardPage } from './pages/LeaderboardPage';
import { ProfilePage } from './pages/ProfilePage';

class ArenaErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; errorMessage: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error) {
    return {
      hasError: true,
      errorMessage: error.message || 'Unexpected application error.',
    };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0B0F17] text-slate-100 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-[#121824] border border-slate-800 rounded-2xl p-6 space-y-4 text-center">
            <h1 className="font-display text-xl font-bold text-white">
              The simulation hit a turbulence patch
            </h1>
            <p className="text-xs text-slate-400 leading-relaxed">
              Your progress is safe. Refresh or return to the arena home screen to continue.
            </p>
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false, errorMessage: '' });
                window.location.href = '/';
              }}
              className="px-5 py-2.5 text-xs font-bold bg-amber-400 text-slate-950 rounded-xl cursor-pointer"
            >
              Return to Arena
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ArenaErrorBoundary>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/challenges" element={<ChallengesPage />} />
            <Route path="/daily" element={<DailyChallengePage />} />
            <Route path="/leaderboard" element={<LeaderboardPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/play/:challengeId" element={<GameplayPage />} />
            <Route path="/result/:resultId" element={<ResultPage />} />
            <Route
              path="/challenge/:challengeId/beat/:shareToken"
              element={<BeatChallengePage />}
            />
          </Routes>
        </Layout>
      </BrowserRouter>
    </ArenaErrorBoundary>
  );
}
