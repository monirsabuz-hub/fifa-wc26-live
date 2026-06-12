import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, X, Star, Trophy, Tv, Globe, Sparkles, Languages, Award } from 'lucide-react';
import { getCountryName } from '../utils/countryMap';

const CommandPalette = ({
  isOpen,
  onClose,
  allChannels = [],
  selectedChannel,
  onSelectChannel,
  favorites = [],
  recentChannels = []
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setHighlightedIndex(0);
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Group matched channels by category
  const groupedResults = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    
    // If query is empty, suggest recent channels + some featured ones
    if (!query) {
      const suggestions = {};
      if (recentChannels.length > 0) {
        suggestions['Recent Channels'] = recentChannels.slice(0, 4);
      }
      
      const featured = allChannels.filter(c => c.isWorldCupBroadcaster).slice(0, 4);
      if (featured.length > 0) {
        suggestions['Suggested Feeds'] = featured;
      }
      
      return suggestions;
    }

    const matched = allChannels.filter((ch) => {
      const countryName = getCountryName(ch.country).toLowerCase();
      return (
        ch.name.toLowerCase().includes(query) ||
        (ch.country && ch.country.toLowerCase().includes(query)) ||
        countryName.includes(query)
      );
    });

    const groups = {
      bookmarks: [],
      fifa26: [],
      wc: [],
      news: [],
      bangla: [],
      sports: []
    };

    matched.forEach((ch) => {
      const isFav = favorites.includes(ch.id);
      if (isFav) {
        groups.bookmarks.push(ch);
      } else if (ch.categories.includes('fifa-26')) {
        groups.fifa26.push(ch);
      } else if (ch.isWorldCupBroadcaster) {
        groups.wc.push(ch);
      } else if (ch.categories.includes('news')) {
        groups.news.push(ch);
      } else if (ch.categories.includes('bangla')) {
        groups.bangla.push(ch);
      } else {
        groups.sports.push(ch);
      }
    });

    const result = {};
    if (groups.bookmarks.length > 0) result['Bookmarked Streams'] = groups.bookmarks;
    if (groups.fifa26.length > 0) result['FIFA 26'] = groups.fifa26;
    if (groups.wc.length > 0) result['World Cup Feeds'] = groups.wc;
    if (groups.news.length > 0) result['News Channels'] = groups.news;
    if (groups.bangla.length > 0) result['Bangla TV Channels'] = groups.bangla;
    if (groups.sports.length > 0) result['Sports Directory'] = groups.sports;

    return result;
  }, [searchQuery, allChannels, favorites, recentChannels]);

  // Flattened list of channels to simplify keyboard navigation mapping
  const flatChannelsList = useMemo(() => {
    const list = [];
    Object.values(groupedResults).forEach((channels) => {
      list.push(...channels);
    });
    return list;
  }, [groupedResults]);

  // Reset highlight index when query changes
  useEffect(() => {
    setHighlightedIndex(0);
  }, [searchQuery]);

  // Handle global key events for this modal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightedIndex((prev) => {
          const next = flatChannelsList.length > 0 ? (prev + 1) % flatChannelsList.length : 0;
          scrollHighlightedIntoView(next);
          return next;
        });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightedIndex((prev) => {
          const next = flatChannelsList.length > 0 ? (prev - 1 + flatChannelsList.length) % flatChannelsList.length : 0;
          scrollHighlightedIntoView(next);
          return next;
        });
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const activeCh = flatChannelsList[highlightedIndex];
        if (activeCh) {
          onSelectChannel(activeCh);
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, flatChannelsList, highlightedIndex, onSelectChannel, onClose]);

  // Helper to scroll the highlighted element into view in the modal list
  const scrollHighlightedIntoView = (index) => {
    const listNode = listRef.current;
    if (!listNode) return;
    
    // Find all item elements inside the list container (excluding headers)
    const items = listNode.querySelectorAll('.command-item');
    const itemNode = items[index];
    if (!itemNode) return;

    const listRect = listNode.getBoundingClientRect();
    const itemRect = itemNode.getBoundingClientRect();

    if (itemRect.bottom > listRect.bottom) {
      listNode.scrollTop += itemRect.bottom - listRect.bottom + 8;
    } else if (itemRect.top < listRect.top) {
      listNode.scrollTop -= listRect.top - itemRect.top + 8;
    }
  };

  if (!isOpen) return null;

  // Render icons dynamically based on group name
  const getGroupIcon = (groupName) => {
    switch (groupName) {
      case 'Bookmarked Streams':
      case 'Recent Channels':
        return <Star className="h-3.5 w-3.5 text-yellow-400 fill-yellow-400/20" />;
      case 'FIFA 26':
        return <Trophy className="h-3.5 w-3.5 text-yellow-400 fill-yellow-400/10" />;
      case 'World Cup Feeds':
      case 'Suggested Feeds':
        return <Award className="h-3.5 w-3.5 text-sport-accent" />;
      case 'News Channels':
        return <Globe className="h-3.5 w-3.5 text-blue-400" />;
      case 'Bangla TV Channels':
        return <Languages className="h-3.5 w-3.5 text-rose-400" />;
      default:
        return <Tv className="h-3.5 w-3.5 text-sport-secondary" />;
    }
  };

  // Keep track of the current index counter as we render groups
  let globalItemCounter = 0;

  return (
    <div className="fixed inset-0 z-55 flex items-start justify-center pt-20 px-4">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity"
      />

      {/* Spotlight Dialog */}
      <div className="relative w-full max-w-xl bg-sport-card border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden glass-panel max-h-[500px]">
        {/* Search Input bar */}
        <div className="relative p-4 border-b border-white/5 flex items-center">
          <Search className="h-5 w-5 text-sport-secondary mr-3 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search channels globally... (Type name or country)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent outline-none text-sm font-semibold text-white placeholder-sport-secondary"
          />
          <div className="flex items-center gap-1.5 ml-2">
            <kbd className="hidden sm:inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-white/5 border border-white/10 text-sport-secondary font-mono shadow-sm">
              ESC
            </kbd>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-sport-secondary hover:text-white transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Results Pane */}
        <div
          ref={listRef}
          className="flex-1 overflow-y-auto p-3 space-y-4 no-scrollbar"
        >
          {flatChannelsList.length > 0 ? (
            Object.entries(groupedResults).map(([groupName, channels]) => (
              <div key={groupName} className="space-y-1.5">
                {/* Group Header */}
                <div className="flex items-center gap-2 px-3 py-1">
                  {getGroupIcon(groupName)}
                  <span className="text-[10px] font-extrabold text-sport-secondary tracking-wider uppercase">
                    {groupName}
                  </span>
                </div>

                {/* Group items */}
                <div className="space-y-0.5">
                  {channels.map((ch) => {
                    const isSelected = selectedChannel?.id === ch.id;
                    const itemIndex = globalItemCounter;
                    const isHighlighted = itemIndex === highlightedIndex;
                    
                    // Increment the counter
                    globalItemCounter++;

                    return (
                      <div
                        key={ch.id}
                        onClick={() => {
                          onSelectChannel(ch);
                          onClose();
                        }}
                        onMouseEnter={() => setHighlightedIndex(itemIndex)}
                        className={`command-item flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer border transition-all duration-200 ${
                          isHighlighted
                            ? 'bg-sport-accent/10 border-sport-accent/30 text-sport-accent shadow-md shadow-sport-accent/5'
                            : 'bg-transparent border-transparent text-sport-secondary hover:bg-white/[0.02] hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Channel Logo */}
                          <div className="h-8 w-8 bg-black/40 rounded-lg p-1 flex items-center justify-center flex-shrink-0 border border-white/5">
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

                          {/* Channel info */}
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className={`text-xs font-bold truncate ${isHighlighted ? 'text-sport-accent' : 'text-white'}`}>
                                {ch.name}
                              </span>
                              {ch.isWorldCupBroadcaster && (
                                <Sparkles className="h-3 w-3 text-sport-accent flex-shrink-0" />
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 text-[8px] font-extrabold text-sport-secondary/70 uppercase tracking-widest mt-0.5">
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

                        {/* Active indicator */}
                        <div className="flex items-center gap-2">
                          {isSelected && (
                            <span className="text-[8px] font-black bg-sport-accent/20 border border-sport-accent/30 text-sport-accent px-1.5 py-0.5 rounded uppercase tracking-wider">
                              Watching
                            </span>
                          )}
                          {isHighlighted && (
                            <kbd className="hidden sm:inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[8px] font-bold bg-white/5 border border-white/10 text-sport-secondary font-mono">
                              ENTER
                            </kbd>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-10 flex flex-col items-center gap-2">
              <span className="text-sm font-bold text-white">No streams found</span>
              <span className="text-xs text-sport-secondary">
                Try searching for another broadcaster or country code
              </span>
            </div>
          )}
        </div>

        {/* Keyboard Helper Footer */}
        <div className="p-3 bg-black/40 border-t border-white/5 flex items-center justify-between text-[9px] font-bold text-sport-secondary select-none">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="bg-white/5 px-1 rounded font-mono">↑↓</kbd> Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="bg-white/5 px-1 rounded font-mono">Enter</kbd> Select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="bg-white/5 px-1 rounded font-mono">Esc</kbd> Close
            </span>
          </div>
          <div>
            Total: {flatChannelsList.length} feed{flatChannelsList.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
