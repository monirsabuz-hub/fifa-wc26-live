import React, { useState, useMemo, useRef } from 'react';
import { Trophy, Tv, Star, Globe, Search, X, Languages, Award } from 'lucide-react';
import channelsData from '../data/channels.json';
import { COUNTRY_MAP, getCountryName } from '../utils/countryMap';

const CategorySidebar = ({
  activeTab,
  setActiveTab,
  wcCount,
  fifa26Count,
  sportsCount,
  newsCount,
  banglaCount,
  favoritesCount,
  isSidebarExpanded,
  setIsSidebarExpanded,
  selectedCountry,
  setSelectedCountry
}) => {
  const [countrySearchQuery, setCountrySearchQuery] = useState('');
  const countryInputRef = useRef(null);

  const categoriesList = [
    { id: 'wc-broadcasters', label: 'World Cup Feeds', icon: Award, count: wcCount },
    { id: 'fifa-26', label: 'FIFA 26', icon: Trophy, count: fifa26Count },
    { id: 'all-sports', label: 'Sports Directory', icon: Tv, count: sportsCount },
    { id: 'news-channels', label: 'News Channels', icon: Globe, count: newsCount },
    { id: 'bangla-tv', label: 'Bangla TV Channels', icon: Languages, count: banglaCount },
    { id: 'favorites', label: 'Bookmarked Streams', icon: Star, count: favoritesCount }
  ];

  // Calculate channel counts per country
  const countryCounts = useMemo(() => {
    const counts = {};
    channelsData.forEach(ch => {
      if (ch.country) {
        const code = ch.country.toUpperCase();
        counts[code] = (counts[code] || 0) + 1;
      }
    });
    return counts;
  }, []);

  // Get unique sorted countries list
  const uniqueCountries = useMemo(() => {
    const list = Object.keys(countryCounts).map(code => ({
      code,
      name: getCountryName(code),
      count: countryCounts[code]
    }));
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [countryCounts]);

  // Filter countries list by query
  const filteredCountries = useMemo(() => {
    if (!countrySearchQuery.trim()) return uniqueCountries;
    const q = countrySearchQuery.toLowerCase().trim();
    return uniqueCountries.filter(c =>
      c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)
    );
  }, [uniqueCountries, countrySearchQuery]);

  return (
    <aside className={`bg-sport-card border-r border-white/5 py-5 px-3 flex flex-col h-full transition-all duration-300 ease-in-out select-none ${
      isSidebarExpanded ? 'w-64' : 'w-16'
    }`}>
      <div className="flex-1 overflow-y-auto no-scrollbar w-full mb-5 pr-0.5">
        {isSidebarExpanded && (
          <span className="text-[10px] font-extrabold text-sport-secondary tracking-widest uppercase block mb-2.5 w-full pl-2">
            Categories
          </span>
        )}
        <ul className="flex flex-col gap-1.5 w-full">
          {categoriesList.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <li key={item.id}>
                <button
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 ${
                    isActive
                      ? 'bg-sport-accent/10 text-sport-accent shadow-sm'
                      : 'text-sport-secondary hover:bg-white/[0.02] hover:text-white'
                  }`}
                  title={item.label}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon className={`h-4.5 w-4.5 flex-shrink-0 ${isActive ? 'text-sport-accent' : 'text-sport-secondary'}`} />
                    {isSidebarExpanded && <span className="truncate">{item.label}</span>}
                  </div>
                  {isSidebarExpanded && (
                    <span className={`text-[9px] bg-white/5 px-2 py-0.5 rounded-full font-bold text-sport-secondary`}>
                      {item.count}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>

        {/* Browse Countries Section */}
        {isSidebarExpanded ? (
          <div className="mt-6 flex flex-col gap-3">
            <div className="h-[1px] bg-white/5 w-full my-2" />
            <span className="text-[10px] font-extrabold text-sport-secondary tracking-widest uppercase block mb-1 w-full pl-2">
              Browse Countries
            </span>

            {/* Country Search Bar */}
            <div className="relative mx-1.5">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-sport-secondary" />
              <input
                ref={countryInputRef}
                type="text"
                value={countrySearchQuery}
                onChange={(e) => setCountrySearchQuery(e.target.value)}
                placeholder="Search country..."
                className="w-full bg-white/5 border border-white/5 focus:border-sport-accent/40 outline-none rounded-xl pl-8.5 pr-8 py-2 text-xs font-semibold text-white placeholder-sport-secondary/70 transition-all"
              />
              {countrySearchQuery && (
                <button
                  onClick={() => setCountrySearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-md text-sport-secondary hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                  title="Clear search"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            {/* Country List container */}
            <div className="flex flex-col gap-1 max-h-[280px] overflow-y-auto no-scrollbar pr-0.5 mt-1">
              {/* Global Option */}
              <button
                onClick={() => setSelectedCountry('all')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all duration-300 ${
                  selectedCountry === 'all'
                    ? 'bg-sport-accent/10 text-sport-accent shadow-sm'
                    : 'text-sport-secondary hover:bg-white/[0.02] hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Globe className={`h-4.5 w-4.5 flex-shrink-0 ${selectedCountry === 'all' ? 'text-sport-accent' : 'text-sport-secondary'}`} />
                  <span className="truncate">All Countries</span>
                </div>
              </button>

              {/* Filtered Countries */}
              {filteredCountries.map(country => {
                const isSelected = selectedCountry?.toUpperCase() === country.code;
                return (
                  <button
                    key={country.code}
                    onClick={() => setSelectedCountry(country.code)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all duration-300 ${
                      isSelected
                        ? 'bg-sport-accent/10 text-sport-accent shadow-sm'
                        : 'text-sport-secondary hover:bg-white/[0.02] hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={`https://flagcdn.com/w20/${country.code.toLowerCase()}.png`}
                        alt=""
                        className="h-3.5 w-5 object-cover rounded-sm border border-white/10 flex-shrink-0"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                      <span className="truncate">{country.name}</span>
                    </div>
                    <span className="text-[9px] bg-white/5 px-2 py-0.5 rounded-full font-bold text-sport-secondary">
                      {country.count}
                    </span>
                  </button>
                );
              })}

              {filteredCountries.length === 0 && (
                <span className="text-[10px] text-sport-secondary/60 italic text-center py-4">
                  No countries found
                </span>
              )}
            </div>
          </div>
        ) : (
          /* Collapsed state countries quick-access button */
          <div className="flex flex-col items-center gap-2 mt-4">
            <div className="h-[1px] bg-white/5 w-10 my-2" />
            <button
              onClick={() => {
                setIsSidebarExpanded(true);
                setTimeout(() => {
                  countryInputRef.current?.focus();
                }, 150);
              }}
              className={`p-2.5 rounded-xl border transition-all duration-300 cursor-pointer ${
                selectedCountry !== 'all'
                  ? 'bg-sport-accent/10 border-sport-accent/20 text-sport-accent'
                  : 'bg-white/5 border-white/5 text-sport-secondary hover:text-white hover:border-white/10'
              }`}
              title="Search by Country"
            >
              <Globe className="h-4.5 w-4.5" />
            </button>
          </div>
        )}
      </div>

      {/* Sidebar Expand/Collapse Toggle Button */}
      <div className="mt-auto pt-3 border-t border-white/5 flex justify-center">
        <button
          onClick={() => setIsSidebarExpanded(!isSidebarExpanded)}
          className="p-2 rounded-xl bg-white/5 border border-white/5 text-sport-secondary hover:text-white transition-all cursor-pointer hover:border-white/10"
          title={isSidebarExpanded ? "Collapse Sidebar" : "Expand Sidebar"}
        >
          {isSidebarExpanded ? (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          ) : (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
          )}
        </button>
      </div>
    </aside>
  );
};

export default CategorySidebar;
