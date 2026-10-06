import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Tag, X } from 'lucide-react';
import { ChallengeSummaryClient } from '../engine/types';
import { ChallengeCard } from '../components/ChallengeCard';
import { trackArenaEvent } from '../lib/player';

const CATEGORIES = [
  'All',
  'Business',
  'Strategy',
  'Money',
  'Survival',
  'Social',
  'Career',
  'Ethics',
  'Planning',
  'Mystery',
];

const FEATURED_INTEREST_TAGS = [
  'Corporate Strategy',
  'Survival',
  'Ethical Dilemma',
  'Crisis Leadership',
  'Resource Management',
  'Time Pressure',
  'High-Stakes Negotiation',
  'Budget & Planning',
  'Career Strategy',
  'Investigative Logic',
];

export const ChallengesPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [challenges, setChallenges] = useState<ChallengeSummaryClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedTags, setSelectedTags] = useState<string[]>(() => {
    const initialTag = searchParams.get('tag');
    return initialTag ? [initialTag] : [];
  });
  const [searchQuery, setSearchQuery] = useState<string>(
    () => searchParams.get('q') || ''
  );
  const [showAllTags, setShowAllTags] = useState<boolean>(false);
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    const paramTag = searchParams.get('tag');
    if (paramTag) {
      setSelectedTags((prev) =>
        prev.some((t) => t.toLowerCase() === paramTag.toLowerCase())
          ? prev
          : [paramTag]
      );
    }
    const paramQ = searchParams.get('q');
    if (paramQ !== null && paramQ !== searchQuery) {
      setSearchQuery(paramQ);
    }
  }, [searchParams]);

  // Press "/" to focus the top search bar quickly
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    trackArenaEvent('challenge_view');
    fetch('/api/challenges')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.challenges)) {
          setChallenges(data.challenges);
        }
      })
      .catch((err) => console.error('Failed to fetch challenges:', err))
      .finally(() => setLoading(false));
  }, []);

  const tagCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of challenges) {
      for (const t of c.tags) {
        counts.set(t, (counts.get(t) || 0) + 1);
      }
    }
    const allTags = Array.from(counts.entries()).map(([tag, count]) => ({
      tag,
      count,
      featured: FEATURED_INTEREST_TAGS.includes(tag),
    }));

    allTags.sort((a, b) => {
      const aFeatIdx = FEATURED_INTEREST_TAGS.indexOf(a.tag);
      const bFeatIdx = FEATURED_INTEREST_TAGS.indexOf(b.tag);
      if (aFeatIdx !== -1 && bFeatIdx !== -1) return aFeatIdx - bFeatIdx;
      if (aFeatIdx !== -1) return -1;
      if (bFeatIdx !== -1) return 1;
      if (b.count !== a.count) return b.count - a.count;
      return a.tag.localeCompare(b.tag);
    });

    return allTags;
  }, [challenges]);

  const visibleTags = showAllTags
    ? tagCounts
    : tagCounts.slice(0, FEATURED_INTEREST_TAGS.length);

  const syncUrlParams = (nextTags: string[], nextQuery: string) => {
    const params: Record<string, string> = {};
    if (nextTags.length === 1) {
      params.tag = nextTags[0];
    }
    if (nextQuery.trim()) {
      params.q = nextQuery.trim();
    }
    setSearchParams(params, { replace: true });
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    syncUrlParams(selectedTags, value);
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => {
      const exists = prev.some((t) => t.toLowerCase() === tag.toLowerCase());
      const next = exists
        ? prev.filter((t) => t.toLowerCase() !== tag.toLowerCase())
        : [...prev, tag];

      syncUrlParams(next, searchQuery);
      return next;
    });
  };

  const clearAllFilters = () => {
    setSelectedCategory('All');
    setSelectedTags([]);
    setSearchQuery('');
    setSearchParams({}, { replace: true });
  };

  const filteredChallenges = challenges.filter((c) => {
    const matchesCat =
      selectedCategory === 'All' ||
      c.primaryCategory.toLowerCase() === selectedCategory.toLowerCase() ||
      c.category.toLowerCase().includes(selectedCategory.toLowerCase());

    const matchesTags =
      selectedTags.length === 0 ||
      selectedTags.some((selTag) =>
        c.tags.some((t) => t.toLowerCase() === selTag.toLowerCase())
      );

    const rawQuery = searchQuery.trim().toLowerCase();
    const keywords = rawQuery ? rawQuery.split(/\s+/).filter(Boolean) : [];
    const searchableText = [
      c.title,
      c.subtitle,
      c.description,
      c.scenarioIntro,
      c.category,
      c.primaryCategory,
      c.difficulty,
      ...c.tags,
      ...c.scoringDimensions.map((d) => d.label),
    ]
      .join(' ')
      .toLowerCase();

    const matchesSearch =
      keywords.length === 0 ||
      keywords.every((kw) => searchableText.includes(kw));

    return matchesCat && matchesTags && matchesSearch;
  });

  const hasActiveFilters =
    selectedCategory !== 'All' ||
    selectedTags.length > 0 ||
    searchQuery.trim().length > 0;

  return (
    <div className="space-y-8">
      {/* Header + Prominent Top Search Bar */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5">
        <div className="space-y-2">
          <h1 className="font-display text-3xl font-extrabold text-white">
            Challenge Library
          </h1>
          <p className="text-sm text-slate-400 max-w-2xl">
            Search by title or keyword, filter by category, or browse by interest tag. Every simulation is scored deterministically across four strategic dimensions.
          </p>
        </div>

        {/* Top Search Bar */}
        <div className="relative w-full lg:w-96 shrink-0">
          <Search
            className="w-4 h-4 text-amber-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <input
            ref={searchInputRef}
            type="search"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape' && searchQuery) {
                handleSearchChange('');
              }
            }}
            placeholder="Search challenges by title or keyword..."
            aria-label="Search challenges by title or keyword"
            className="w-full min-h-[46px] pl-11 pr-20 py-2.5 bg-[#121824] border border-slate-800 focus:border-amber-400 rounded-xl text-sm text-white placeholder:text-slate-500 outline-none transition-colors"
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => {
                handleSearchChange('');
                searchInputRef.current?.focus();
              }}
              aria-label="Clear search query"
              className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 flex items-center gap-1 cursor-pointer"
            >
              <X className="w-3 h-3" aria-hidden="true" />
              <span>Clear</span>
            </button>
          ) : (
            <span
              aria-hidden="true"
              className="hidden sm:inline-block absolute right-3.5 top-1/2 -translate-y-1/2 font-mono text-[11px] text-slate-500 border border-slate-800 rounded px-1.5 py-0.5 pointer-events-none"
            >
              /
            </span>
          )}
        </div>
      </div>

      {/* Filter Controls */}
      <div className="space-y-4 pb-4 border-b border-slate-800/80">
        {/* Interactive Category Tabs */}
        <div
          role="tablist"
          aria-label="Filter challenges by category"
          className="flex items-center gap-1.5 overflow-x-auto pb-2 lg:pb-0 no-scrollbar"
        >
          {CATEGORIES.map((cat) => {
            const active = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setSelectedCategory(cat)}
                className={`min-h-[40px] px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'bg-amber-400 text-slate-950'
                    : 'bg-[#121824] text-slate-400 hover:text-slate-100 border border-slate-800'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Browse by Interest Tags */}
        <div className="bg-[#121824]/70 border border-slate-800/90 rounded-2xl p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
              <Tag className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
              <span>Browse by Interest Tag</span>
            </div>
            <div className="flex items-center gap-3">
              {tagCounts.length > FEATURED_INTEREST_TAGS.length && (
                <button
                  type="button"
                  onClick={() => setShowAllTags((prev) => !prev)}
                  className="text-xs font-medium text-slate-400 hover:text-amber-400 transition-colors cursor-pointer"
                >
                  {showAllTags
                    ? 'Show Core Interests'
                    : `Show All Tags (${tagCounts.length})`}
                </button>
              )}
              {selectedTags.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTags([]);
                    setSearchParams({}, { replace: true });
                  }}
                  className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Clear Tags ({selectedTags.length})</span>
                </button>
              )}
            </div>
          </div>

          <div
            role="group"
            aria-label="Browse challenges by interest tag"
            className="flex flex-wrap items-center gap-2"
          >
            {visibleTags.map(({ tag, count }) => {
              const isSelected = selectedTags.some(
                (t) => t.toLowerCase() === tag.toLowerCase()
              );
              return (
                <button
                  key={tag}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => toggleTag(tag)}
                  className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-amber-400 text-slate-950 font-bold'
                      : 'bg-[#0B0F17] text-slate-300 hover:text-white hover:border-slate-700 border border-slate-800/90'
                  }`}
                >
                  <span>{tag}</span>
                  <span
                    className={`font-mono text-[11px] ${
                      isSelected ? 'text-slate-900' : 'text-slate-500'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Filter Status Bar */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs text-slate-400">
            <div className="flex flex-wrap items-center gap-2">
              <span>
                Showing{' '}
                <strong className="font-mono text-white">
                  {filteredChallenges.length}
                </strong>{' '}
                of {challenges.length} simulations
              </span>
              {selectedCategory !== 'All' && (
                <span>
                  · Category:{' '}
                  <strong className="text-amber-400">{selectedCategory}</strong>
                </span>
              )}
              {selectedTags.length > 0 && (
                <span>
                  · Interests:{' '}
                  <strong className="text-amber-400">
                    {selectedTags.join(', ')}
                  </strong>
                </span>
              )}
              {searchQuery.trim() && (
                <span>
                  · Keyword:{' '}
                  <strong className="text-amber-400">
                    &ldquo;{searchQuery.trim()}&rdquo;
                  </strong>
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={clearAllFilters}
              className="text-xs font-semibold text-slate-300 hover:text-amber-400 underline underline-offset-4 cursor-pointer"
            >
              Reset All Filters
            </button>
          </div>
        )}
      </div>

      {/* Challenge Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div
              key={n}
              className="h-72 rounded-2xl bg-[#121824] border border-slate-800 animate-pulse p-6"
            />
          ))}
        </div>
      ) : filteredChallenges.length === 0 ? (
        <div className="bg-[#121824] border border-slate-800 rounded-2xl p-8 text-center space-y-3">
          <p className="text-base font-semibold text-white">
            No challenges match your current filter.
          </p>
          <button
            type="button"
            onClick={clearAllFilters}
            className="px-4 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white rounded-lg cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredChallenges.map((challenge) => (
            <ChallengeCard
              key={challenge.id}
              challenge={challenge}
              activeTags={selectedTags}
              onSelectTag={toggleTag}
            />
          ))}
        </div>
      )}
    </div>
  );
};
