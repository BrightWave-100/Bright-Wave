import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { ChallengeSummaryClient } from '../engine/types';

interface ChallengeCardProps {
  challenge: ChallengeSummaryClient;
  featuredImage?: string;
  activeTags?: string[];
  onSelectTag?: (tag: string) => void;
}

export const ChallengeCard: React.FC<ChallengeCardProps> = ({
  challenge,
  featuredImage,
  activeTags = [],
  onSelectTag,
}) => {
  const navigate = useNavigate();
  const [imgError, setImgError] = React.useState(false);

  const handleTagClick = (tag: string) => {
    if (onSelectTag) {
      onSelectTag(tag);
    } else {
      navigate(`/challenges?tag=${encodeURIComponent(tag)}`);
    }
  };

  return (
    <article className="group bg-[#121824] border border-slate-800/90 hover:border-amber-500/50 rounded-2xl p-6 flex flex-col justify-between transition-colors">
      <div>
        {featuredImage && !imgError && (
          <div className="relative h-40 w-full mb-5 rounded-xl overflow-hidden bg-slate-900">
            <img
              src={featuredImage}
              alt={challenge.title}
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
              className="w-full h-full object-cover object-center group-hover:scale-[1.02] transition-transform duration-200"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#121824] via-black/30 to-transparent" />
          </div>
        )}

        {/* Zero-Pill Metadata: Clean unboxed inline text with typographic separators */}
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mb-2.5">
          <span className="text-amber-400 font-medium">{challenge.category}</span>
          <span aria-hidden="true">·</span>
          <span>{challenge.difficulty} Difficulty</span>
          <span aria-hidden="true">·</span>
          <span className="font-mono tabular-nums">{challenge.estimatedMinutes}</span>
        </div>

        <h3 className="font-display text-xl font-bold text-white tracking-tight mb-2 group-hover:text-amber-300 transition-colors">
          {challenge.title}
        </h3>

        <p className="text-sm text-slate-300 leading-relaxed mb-4">
          {challenge.description}
        </p>
      </div>

      <div className="pt-4 border-t border-slate-800/80 space-y-4">
        {/* Interactive unboxed interest tags separated by slashes */}
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-slate-400">
          <span className="text-slate-500 mr-0.5">Tags:</span>
          {challenge.tags.map((tag, index) => {
            const isSelected = activeTags.some(
              (t) => t.toLowerCase() === tag.toLowerCase()
            );
            return (
              <React.Fragment key={tag}>
                <button
                  type="button"
                  onClick={() => handleTagClick(tag)}
                  aria-pressed={isSelected}
                  className={`transition-colors cursor-pointer hover:text-amber-300 underline-offset-4 hover:underline ${
                    isSelected
                      ? 'text-amber-400 font-semibold underline'
                      : 'text-slate-300'
                  }`}
                >
                  {tag}
                </button>
                {index < challenge.tags.length - 1 && (
                  <span className="text-slate-600" aria-hidden="true">
                    /
                  </span>
                )}
              </React.Fragment>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => navigate(`/play/${challenge.id}`)}
          className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-slate-800/90 group-hover:bg-amber-400 text-slate-100 group-hover:text-slate-950 font-semibold text-sm flex items-center justify-between transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-400"
        >
          <span className="whitespace-nowrap">Play Challenge</span>
          <ArrowRight className="w-4 h-4 shrink-0" aria-hidden="true" />
        </button>
      </div>
    </article>
  );
};
