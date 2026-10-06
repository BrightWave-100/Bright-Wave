import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Compass,
  Flame,
  Home,
  Trophy,
  User as UserIcon,
  X,
} from 'lucide-react';
import { getOrCreatePlayerIdentity } from '../lib/player';

interface LayoutProps {
  children: React.ReactNode;
}

type FooterDocType = 'privacy' | 'terms' | 'safety' | 'contact' | null;

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeDoc, setActiveDoc] = useState<FooterDocType>(null);
  const { playerName } = getOrCreatePlayerIdentity();

  const navItems = [
    { label: 'Home', path: '/', icon: Home },
    { label: 'Challenges', path: '/challenges', icon: Compass },
    { label: 'Daily', path: '/daily', icon: Flame },
    { label: 'Leaderboard', path: '/leaderboard', icon: Trophy },
    { label: 'Profile', path: '/profile', icon: UserIcon },
  ];

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0B0F17] text-slate-100">
      {/* Top Bar Contract: 3 Zones (Brand Wordmark — 5 Clean Text Nav Links — 1 Primary Action) */}
      <header className="sticky top-0 z-30 h-14 border-b border-slate-800/80 bg-[#0B0F17]/90 backdrop-blur-md px-4 sm:px-8 flex items-center justify-between">
        {/* Zone 1: Single text element wordmark */}
        <Link
          to="/"
          className="font-display text-lg sm:text-xl font-bold tracking-tight text-white hover:text-amber-400 transition-colors whitespace-nowrap focus-visible:outline-2 focus-visible:outline-amber-400"
        >
          Challenge Arena
        </Link>

        {/* Zone 2: 5 clean text navigation links */}
        <nav
          aria-label="Primary Navigation"
          className="hidden md:flex items-center gap-7 text-sm font-medium"
        >
          {navItems.map((item) => {
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`py-1 transition-colors whitespace-nowrap border-b-2 ${
                  active
                    ? 'border-amber-400 text-white font-semibold'
                    : 'border-transparent text-slate-400 hover:text-slate-100'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Zone 3: 1-2 primary actions */}
        <div className="flex items-center gap-3">
          <Link
            to="/profile"
            className="hidden sm:inline-block text-xs text-slate-400 hover:text-slate-200 transition-colors truncate max-w-[140px]"
            title={playerName}
          >
            {playerName}
          </Link>
          <button
            type="button"
            onClick={() => navigate('/daily')}
            className="min-h-[38px] px-3 sm:px-3.5 py-1.5 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400"
          >
            Daily Challenge
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-[1200px] mx-auto px-4 sm:px-8 pt-6 pb-24 md:pb-16">
        {children}
      </main>

      {/* Quiet Footer */}
      <footer className="border-t border-slate-800/80 bg-[#0B0F17] py-8 px-4 sm:px-8 mb-14 md:mb-0">
        <div className="max-w-[1200px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <p className="text-center sm:text-left">
            Challenge Arena · Interactive fictional decision simulations. Not real-world financial, legal, medical, or emergency advice.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-5 shrink-0">
            <button
              type="button"
              onClick={() => setActiveDoc('privacy')}
              className="min-h-[36px] px-1 hover:text-slate-200 transition-colors cursor-pointer"
            >
              Privacy
            </button>
            <button
              type="button"
              onClick={() => setActiveDoc('terms')}
              className="min-h-[36px] px-1 hover:text-slate-200 transition-colors cursor-pointer"
            >
              Terms
            </button>
            <button
              type="button"
              onClick={() => setActiveDoc('safety')}
              className="min-h-[36px] px-1 hover:text-slate-200 transition-colors cursor-pointer"
            >
              Safety
            </button>
            <button
              type="button"
              onClick={() => setActiveDoc('contact')}
              className="min-h-[36px] px-1 hover:text-slate-200 transition-colors cursor-pointer"
            >
              Contact
            </button>
          </div>
        </div>
      </footer>

      {/* Mobile Fixed Bottom Tab Bar (<= 15% viewport height cap, >= 44px touch targets) */}
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-14 bg-[#0B0F17]/95 backdrop-blur-md border-t border-slate-800/90 grid grid-cols-5 items-center px-1"
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`min-h-[44px] min-w-[44px] flex flex-col items-center justify-center transition-colors ${
                active ? 'text-amber-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="w-5 h-5" aria-hidden="true" />
              <span className="text-[10px] font-medium tracking-tight mt-0.5 whitespace-nowrap">
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Footer Information Modal */}
      {activeDoc && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="footer-modal-title"
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 id="footer-modal-title" className="font-display text-lg font-bold text-white capitalize">
                {activeDoc} Policy & Simulation Notice
              </h2>
              <button
                type="button"
                onClick={() => setActiveDoc(null)}
                aria-label="Close modal"
                className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="text-sm text-slate-300 space-y-3 leading-relaxed">
              {activeDoc === 'privacy' && (
                <>
                  <p>
                    Challenge Arena allows you to play immediately using an anonymous session identifier stored in your browser.
                  </p>
                  <p>
                    If you choose to sign in with Google to save your results, your email is isolated in a private database subcollection accessible only to your verified account, and is never displayed on public leaderboards or share cards.
                  </p>
                </>
              )}
              {activeDoc === 'terms' && (
                <>
                  <p>
                    All scenarios, numbers, and consequences in Challenge Arena are fictional game simulations created for entertainment and strategic thinking practice.
                  </p>
                  <p>
                    Nothing in this application constitutes financial, investment, legal, career, medical, or emergency advice.
                  </p>
                </>
              )}
              {activeDoc === 'safety' && (
                <>
                  <p>
                    Gameplay state transitions and scores are 100% deterministic and validated server-side. AI narrative generation is strictly constrained, sanitized against HTML/script injection, and backed by deterministic fallbacks.
                  </p>
                </>
              )}
              {activeDoc === 'contact' && (
                <>
                  <p>
                    For support, feedback, or security reports regarding Challenge Arena, reach out via your organization workspace or review your saved session IDs in the Profile tab.
                  </p>
                </>
              )}
            </div>
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveDoc(null)}
                className="px-4 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white rounded-lg cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
