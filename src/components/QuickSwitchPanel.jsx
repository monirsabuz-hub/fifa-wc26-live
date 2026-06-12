import React, { useMemo } from 'react';
import { Tv, Zap, Star, Sparkles } from 'lucide-react';
import { getCountryName } from '../utils/countryMap';

const QuickSwitchPanel = ({
  category,
  allChannels = [],
  selectedChannel,
  onSelectChannel,
  favorites = []
}) => {
  // 1. Get title based on category
  const title = useMemo(() => {
    switch (category) {
      case 'wc-broadcasters':
        return 'Quick Switch: World Cup';
      case 'fifa-26':
        return 'Quick Switch: FIFA 26';
      case 'all-sports':
        return 'Quick Switch: Sports';
      case 'news-channels':
        return 'Quick Switch: News';
      case 'bangla-tv':
        return 'Quick Switch: Bangla';
      case 'favorites':
        return 'Quick Switch: Bookmarks';
      default:
        return 'Quick Switch';
    }
  }, [category]);

  // 2. Filter channels belonging to this category, excluding the selected one
  const filteredChannels = useMemo(() => {
    return allChannels
      .filter((ch) => {
        // Exclude current stream
        if (selectedChannel && ch.id === selectedChannel.id) return false;

        // Filter by category
        if (category === 'wc-broadcasters') return ch.isWorldCupBroadcaster;
        if (category === 'fifa-26') return ch.categories.includes('fifa-26');
        if (category === 'all-sports') return ch.categories.includes('sports');
        if (category === 'news-channels') return ch.categories.includes('news');
        if (category === 'bangla-tv') return ch.categories.includes('bangla');
        if (category === 'favorites') return favorites.includes(ch.id);
        return true;
      })
      // Prioritize featured ones or sort by latency/name
      .slice(0, 8); // Display top 8 channels for quick switching
  }, [category, allChannels, selectedChannel, favorites]);

  return (
    <div className="flex flex-col gap-4 bg-sport-card/45 border border-white/5 rounded-2xl p-5 h-full shadow-lg backdrop-blur-md w-full">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/5 pb-3">
        <div className="flex items-center gap-2">
          <Zap className="h-4.5 w-4.5 text-sport-accent animate-pulse" />
          <h3 className="text-xs font-bold text-white tracking-wider uppercase">
            {title}
          </h3>
        </div>
        <span className="text-[9px] font-extrabold text-sport-accent bg-sport-accent/10 border border-sport-accent/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
          LIVE FEEDS
        </span>
      </div>

      {/* Channel list */}
      <div className="flex flex-col gap-2.5 overflow-y-auto max-h-[380px] no-scrollbar pr-1">
        {filteredChannels.length > 0 ? (
          filteredChannels.map((ch) => {
            const isFav = favorites.includes(ch.id);

            return (
              <button
                key={ch.id}
                onClick={() => onSelectChannel(ch)}
                className="w-full flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/5 hover:border-sport-accent/30 hover:bg-white/[0.08] cursor-pointer transition-all duration-300 text-left outline-none group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Logo */}
                  <div className="h-9 w-9 bg-black/40 rounded-lg p-1.5 flex items-center justify-center flex-shrink-0 border border-white/5 group-hover:border-sport-accent/20 transition-all">
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
                    <Tv className={`h-4.5 w-4.5 text-white/20 ${ch.logo ? 'hidden' : 'inline'}`} />
                  </div>

                  {/* Meta details */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-bold text-white truncate block group-hover:text-sport-accent transition-colors">
                        {ch.name}
                      </span>
                      {ch.isWorldCupBroadcaster && (
                        <Sparkles className="h-3 w-3 text-sport-accent flex-shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-[8px] font-extrabold text-sport-secondary/70 uppercase tracking-widest mt-0.5 leading-none">
                      <img
                        src={`https://flagcdn.com/w20/${ch.country?.toLowerCase()}.png`}
                        alt=""
                        className="h-2 w-3 object-cover rounded-sm border border-white/10"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                      <span>{getCountryName(ch.country)}</span>
                      <span>•</span>
                      <span>{ch.latency}ms</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isFav && (
                    <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                  )}
                  <span className="h-2 w-2 rounded-full bg-sport-accent group-hover:animate-pulse-accent" />
                </div>
              </button>
            );
          })
        ) : (
          <div className="text-center py-8 text-xs text-sport-secondary font-semibold">
            No other channels in this category
          </div>
        )}
      </div>
    </div>
  );
};

export default QuickSwitchPanel;
