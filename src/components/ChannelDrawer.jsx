import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Tv, X, Star, Sparkles } from 'lucide-react';
import ChannelSearch from './ChannelSearch';
import { getCountryName } from '../utils/countryMap';

const ChannelDrawer = ({
  isOpen,
  onClose,
  category,
  allChannels = [],
  selectedChannel,
  onSelectChannel,
  favorites = [],
  onToggleFavorite,
  isKeyboardActive = true,
  selectedCountry = 'all',
  setSelectedCountry
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [countrySearchQuery, setCountrySearchQuery] = useState('');
  const [isSearchingCountry, setIsSearchingCountry] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const listRef = useRef(null);
  const searchInputRef = useRef(null);

  // 1. Get readable title for active category
  const categoryTitle = useMemo(() => {
    switch (category) {
      case 'wc-broadcasters':
        return 'World Cup Feeds';
      case 'fifa-26':
        return 'FIFA 26';
      case 'all-sports':
        return 'Sports Directory';
      case 'news-channels':
        return 'News Channels';
      case 'bangla-tv':
        return 'Bangla TV Channels';
      case 'favorites':
        return 'Bookmarks';
      default:
        return 'Channels';
    }
  }, [category]);

  // 2. Filter channels by category
  const categoryChannels = useMemo(() => {
    return allChannels.filter((ch) => {
      if (category === 'wc-broadcasters') return ch.isWorldCupBroadcaster;
      if (category === 'fifa-26') return ch.categories.includes('fifa-26');
      if (category === 'all-sports') return ch.categories.includes('sports');
      if (category === 'news-channels') return ch.categories.includes('news');
      if (category === 'bangla-tv') return ch.categories.includes('bangla');
      if (category === 'favorites') return favorites.includes(ch.id);
      return true;
    });
  }, [category, allChannels, favorites]);

  // Get unique countries for the current category
  const uniqueCountries = useMemo(() => {
    const countries = new Set();
    categoryChannels.forEach((ch) => {
      if (ch.country) {
        countries.add(ch.country.toUpperCase());
      }
    });
    return Array.from(countries).sort();
  }, [categoryChannels]);

  // 3. Filter channels by search query and country
  const filteredChannels = useMemo(() => {
    let list = categoryChannels;

    // Apply country filter
    if (selectedCountry && selectedCountry !== 'all') {
      list = list.filter(ch => ch.country?.toUpperCase() === selectedCountry.toUpperCase());
    }

    const query = searchQuery.toLowerCase().trim();
    if (!query) return list;
    return list.filter((ch) => {
      const countryName = getCountryName(ch.country).toLowerCase();
      return (
        ch.name.toLowerCase().includes(query) ||
        (ch.country && ch.country.toLowerCase().includes(query)) ||
        countryName.includes(query)
      );
    });
  }, [categoryChannels, searchQuery, selectedCountry]);

  // Filter countries list by country search query
  const filteredCountries = useMemo(() => {
    if (!countrySearchQuery.trim()) return uniqueCountries;
    const q = countrySearchQuery.toLowerCase().trim();
    return uniqueCountries.filter(code => {
      const name = getCountryName(code).toLowerCase();
      return code.toLowerCase().includes(q) || name.includes(q);
    });
  }, [uniqueCountries, countrySearchQuery]);

  // Render horizontal country pills
  const renderCountrySelector = () => {
    if (uniqueCountries.length <= 1) return null;
    return (
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-2 px-4 border-b border-white/5 bg-white/[0.01] w-full">
        {isSearchingCountry ? (
          <div className="flex items-center gap-1 flex-shrink-0">
            <input
              type="text"
              placeholder="Search..."
              value={countrySearchQuery}
              onChange={(e) => setCountrySearchQuery(e.target.value)}
              className="w-20 bg-white/5 border border-white/10 focus:border-sport-accent/40 outline-none rounded-lg px-2 py-0.5 text-[9px] font-semibold text-white placeholder-sport-secondary transition-all"
              autoFocus
            />
            <button
              onClick={() => {
                setCountrySearchQuery('');
                setIsSearchingCountry(false);
              }}
              className="p-1 rounded-md text-sport-secondary hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              title="Cancel search"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setIsSearchingCountry(true)}
            className="p-1.5 rounded-full bg-white/5 border border-white/5 text-sport-secondary hover:text-white hover:border-white/10 transition-all cursor-pointer flex-shrink-0"
            title="Search countries"
          >
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
        )}
        
        <button
          onClick={() => setSelectedCountry('all')}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all cursor-pointer select-none flex-shrink-0 ${
            selectedCountry === 'all'
              ? 'bg-sport-accent/10 text-sport-accent border-sport-accent/30 shadow-sm'
              : 'bg-white/5 text-sport-secondary border-white/5 hover:bg-white/10 hover:text-white'
          }`}
        >
          Global
        </button>
        {filteredCountries.map(code => (
          <button
            key={code}
            onClick={() => setSelectedCountry(code)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all cursor-pointer select-none flex-shrink-0 ${
              selectedCountry?.toUpperCase() === code.toUpperCase()
                ? 'bg-sport-accent/10 text-sport-accent border-sport-accent/30 shadow-sm'
                : 'bg-white/5 text-sport-secondary border-white/5 hover:bg-white/10 hover:text-white'
            }`}
          >
            <img
              src={`https://flagcdn.com/w20/${code.toLowerCase()}.png`}
              alt=""
              className="h-2 w-3 object-cover rounded-sm border border-white/15"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
            <span>{code}</span>
          </button>
        ))}
        {filteredCountries.length === 0 && (
          <span className="text-[9px] text-sport-secondary/60 italic pl-1 flex-shrink-0">
            No matches
          </span>
        )}
      </div>
    );
  };

  // Reset highlighted index when search query or category changes
  useEffect(() => {
    setHighlightedIndex(0);
  }, [searchQuery, category]);

  // Auto-focus search input when drawer opens or when Ctrl+K is pressed
  useEffect(() => {
    if (isOpen) {
      // Small timeout to allow transition to finish
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Listen for global Ctrl+K to focus search input in drawer if drawer is open
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if (e.ctrlKey && e.key.toLowerCase() === 'k') {
        if (isOpen) {
          e.preventDefault();
          searchInputRef.current?.focus();
        }
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isOpen]);

  // 4. Keyboard Navigation inside drawer (ArrowUp, ArrowDown, Enter, Escape)
  useEffect(() => {
    if (!isOpen || !isKeyboardActive || filteredChannels.length === 0) return;

    const handleKeyDown = (e) => {
      // Don't intercept if modifier keys are pressed
      if (e.ctrlKey || e.altKey || e.metaKey) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightedIndex((prev) => {
          const next = (prev + 1) % filteredChannels.length;
          scrollHighlightedIntoView(next);
          return next;
        });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightedIndex((prev) => {
          const next = (prev - 1 + filteredChannels.length) % filteredChannels.length;
          scrollHighlightedIntoView(next);
          return next;
        });
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const activeCh = filteredChannels[highlightedIndex];
        if (activeCh) {
          onSelectChannel(activeCh);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isKeyboardActive, filteredChannels, highlightedIndex, onSelectChannel, onClose]);

  // Helper to scroll the highlighted element into view
  const scrollHighlightedIntoView = (index) => {
    const listNode = listRef.current;
    if (!listNode) return;
    const itemNode = listNode.childNodes[index];
    if (!itemNode) return;

    const listRect = listNode.getBoundingClientRect();
    const itemRect = itemNode.getBoundingClientRect();

    if (itemRect.bottom > listRect.bottom) {
      listNode.scrollTop += itemRect.bottom - listRect.bottom;
    } else if (itemRect.top < listRect.top) {
      listNode.scrollTop -= listRect.top - itemRect.top;
    }
  };

  return (
    <>
      {/* DESKTOP / TABLET: Slide-out drawer panel */}
      <div
        className={`hidden md:flex flex-col h-full bg-sport-card/95 border-r border-white/5 transition-all duration-250 ease-in-out z-20 ${
          isOpen ? 'w-80 opacity-100' : 'w-0 opacity-0 overflow-hidden border-r-0 pointer-events-none'
        }`}
      >
        <div className="w-80 flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-sport-accent animate-pulse-accent" />
              <h3 className="text-sm font-extrabold text-white tracking-wide uppercase">
                {categoryTitle}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-sport-secondary hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              title="Close Drawer (Esc)"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Search bar */}
          <div className="p-4 border-b border-white/5">
            <ChannelSearch
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              inputRef={searchInputRef}
            />
          </div>

          {/* Country Selector */}
          {renderCountrySelector()}

          {/* Channels List */}
          <div
            ref={listRef}
            className="flex-1 overflow-y-auto p-2 space-y-1 no-scrollbar scroll-smooth"
          >
            {filteredChannels.length > 0 ? (
              filteredChannels.map((ch, idx) => {
                const isSelected = selectedChannel?.id === ch.id;
                const isHighlighted = idx === highlightedIndex;
                const isFav = favorites.includes(ch.id);

                return (
                  <div
                    key={ch.id}
                    onClick={() => onSelectChannel(ch)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer border transition-all duration-200 group relative ${
                      isSelected
                        ? 'bg-sport-accent/10 text-sport-accent border-sport-accent/30 shadow-md shadow-sport-accent/5'
                        : isHighlighted
                        ? 'bg-white/[0.04] text-white border-white/10'
                        : 'bg-transparent text-sport-secondary border-transparent hover:bg-white/[0.02] hover:text-white'
                    }`}
                  >
                    {/* Channel Logo / Icon */}
                    <div className="h-10 w-10 bg-black/40 rounded-lg p-1.5 flex items-center justify-center flex-shrink-0 border border-white/5 group-hover:border-white/10 transition-all">
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
                      <Tv className={`h-4 w-4 text-white/20 ${ch.logo ? 'hidden' : 'inline'}`} />
                    </div>

                    {/* Channel info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold truncate block">
                          {ch.name}
                        </span>
                        {ch.isWorldCupBroadcaster && (
                          <Sparkles className="h-3 w-3 text-sport-accent flex-shrink-0" title="Featured World Cup Broadcaster" />
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-[9px] font-bold text-sport-secondary/80 uppercase mt-0.5">
                        <img
                          src={`https://flagcdn.com/w20/${ch.country?.toLowerCase()}.png`}
                          alt=""
                          className="h-2 w-3 object-cover rounded-sm border border-white/10"
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                        <span>{ch.country || 'Global'}</span>
                        <span>•</span>
                        <span>{ch.latency}ms</span>
                      </div>
                    </div>

                    {/* Bookmark star and Live status */}
                    <div className="flex items-center gap-2">
                      {isFav && (
                        <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                      )}
                      {isSelected ? (
                        <span className="flex h-2 w-2 relative">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sport-accent opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-sport-accent"></span>
                        </span>
                      ) : (
                        <span className="h-1.5 w-1.5 rounded-full bg-white/10 group-hover:bg-sport-accent/30 transition-colors" />
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-10 text-xs text-sport-secondary">
                No channels found
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MOBILE: Bottom sheet layout */}
      <div
        className={`fixed inset-0 z-50 md:hidden flex flex-col justify-end transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Backdrop overlay */}
        <div
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        />

        {/* Bottom sheet content container */}
        <div
          className={`relative w-full max-h-[75vh] bg-sport-card border-t border-white/10 rounded-t-3xl flex flex-col transition-transform duration-300 transform ${
            isOpen ? 'translate-y-0' : 'translate-y-full'
          }`}
        >
          {/* Handle bar for drag visual */}
          <div className="w-12 h-1 bg-white/20 rounded-full mx-auto my-3 flex-shrink-0" />

          {/* Header */}
          <div className="px-4 pb-3 border-b border-white/5 flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-white tracking-wide uppercase flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-sport-accent animate-pulse-accent" />
              {categoryTitle}
            </h3>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full bg-white/5 text-sport-secondary hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Search bar */}
          <div className="p-4 border-b border-white/5">
            <ChannelSearch
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
            />
          </div>

          {/* Country Selector */}
          {renderCountrySelector()}

          {/* Channels list */}
          <div className="flex-1 overflow-y-auto p-3 space-y-1 pb-8">
            {filteredChannels.length > 0 ? (
              filteredChannels.map((ch) => {
                const isSelected = selectedChannel?.id === ch.id;
                const isFav = favorites.includes(ch.id);

                return (
                  <div
                    key={ch.id}
                    onClick={() => {
                      onSelectChannel(ch);
                      onClose(); // Auto close bottom sheet on mobile when selected
                    }}
                    className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer border ${
                      isSelected
                        ? 'bg-sport-accent/10 text-sport-accent border-sport-accent/30'
                        : 'bg-white/[0.02] text-sport-secondary border-transparent'
                    }`}
                  >
                    <div className="h-10 w-10 bg-black/40 rounded-lg p-1.5 flex items-center justify-center flex-shrink-0 border border-white/5">
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
                      <Tv className={`h-4 w-4 text-white/20 ${ch.logo ? 'hidden' : 'inline'}`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-bold truncate block text-white">
                        {ch.name}
                      </span>
                      <div className="flex items-center gap-1.5 text-[9px] font-bold text-sport-secondary/80 uppercase mt-0.5">
                        <img
                          src={`https://flagcdn.com/w20/${ch.country?.toLowerCase()}.png`}
                          alt=""
                          className="h-2 w-3 object-cover rounded-sm border border-white/10"
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                        <span>{ch.country || 'Global'}</span>
                        <span>•</span>
                        <span>{ch.latency}ms</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isFav && (
                        <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                      )}
                      {isSelected && (
                        <span className="flex h-2 w-2 relative">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sport-accent opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-sport-accent"></span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-10 text-xs text-sport-secondary">
                No channels found
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default ChannelDrawer;
