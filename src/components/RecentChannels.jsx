import React from 'react';
import { Tv, History, Trash2 } from 'lucide-react';

const RecentChannels = ({
  recentChannels = [],
  selectedChannel,
  onSelectChannel,
  onClearRecent
}) => {
  if (recentChannels.length === 0) return null;

  return (
    <div className="w-full bg-sport-card/40 border border-white/5 rounded-2xl p-4 shadow-lg backdrop-blur-md">
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-sport-accent" />
          <h3 className="text-xs font-bold text-white tracking-wider uppercase">
            Recently Watched Feeds
          </h3>
        </div>
        {onClearRecent && (
          <button
            onClick={onClearRecent}
            className="text-[10px] font-extrabold text-sport-secondary hover:text-red-400 flex items-center gap-1 transition-colors cursor-pointer"
            title="Clear watch history"
          >
            <Trash2 className="h-3 w-3" />
            CLEAR HISTORY
          </button>
        )}
      </div>

      <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-1 scroll-smooth">
        {recentChannels.slice(0, 8).map((ch) => {
          const isSelected = selectedChannel?.id === ch.id;

          return (
            <button
              key={ch.id}
              onClick={() => onSelectChannel(ch)}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border flex-shrink-0 transition-all duration-300 text-left select-none outline-none group cursor-pointer ${
                isSelected
                  ? 'bg-sport-accent/10 border-sport-accent/30 text-sport-accent shadow-md shadow-sport-accent/5'
                  : 'bg-white/5 border-white/5 text-sport-secondary hover:bg-white/[0.08] hover:text-white hover:border-white/10'
              }`}
            >
              {/* Channel logo / icon */}
              <div className="h-7 w-7 bg-black/40 rounded-md p-1 flex items-center justify-center flex-shrink-0 border border-white/5 group-hover:border-white/10 transition-all">
                {ch.logo ? (
                  <img
                    src={ch.logo}
                    alt={ch.name}
                    className="max-h-full max-w-full object-contain"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      if (e.target.nextSibling) {
                        e.target.nextSibling.style.display = 'inline';
                      }
                    }}
                  />
                ) : null}
                <Tv className={`h-3 w-3 text-white/20 ${ch.logo ? 'hidden' : 'inline'}`} />
              </div>

              {/* Channel metadata */}
              <div className="min-w-0 flex flex-col justify-center">
                <span className={`text-[11px] font-bold truncate ${isSelected ? 'text-sport-accent' : 'text-white group-hover:text-sport-accent'}`}>
                  {ch.name}
                </span>
                <span className="text-[8px] font-extrabold text-sport-secondary/70 uppercase tracking-widest mt-0.5 leading-none">
                  {ch.country || 'GLOBAL'} • {ch.latency}ms
                </span>
              </div>

              {/* Pulsing indicator for currently playing */}
              {isSelected && (
                <span className="h-1.5 w-1.5 rounded-full bg-sport-accent animate-pulse-accent flex-shrink-0 ml-1" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default RecentChannels;
