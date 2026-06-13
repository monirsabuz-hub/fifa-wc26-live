import React from 'react';
import { motion } from 'framer-motion';
import { Play, Star, Calendar, Info, Shield } from 'lucide-react';
import MatchCountdown from './MatchCountdown';

// Handles both CDN URL strings (from API) and emoji flags (legacy fallback)
const renderFlag = (flag) => {
  if (!flag) return <span className="text-4xl md:text-5xl filter drop-shadow-md">🏳</span>;

  // If it's already a URL (from API)
  if (flag.startsWith('http')) {
    return (
      <img
        src={flag}
        alt=""
        className="h-10 w-14 md:h-12 md:w-16 object-cover rounded-md border border-white/10 shadow-md filter drop-shadow-md"
        onError={(e) => { e.target.style.display = 'none'; }}
      />
    );
  }

  // Legacy: emoji → CDN conversion
  const codePoints = [...flag].map(char => char.codePointAt(0));
  const countryCode = codePoints
    .filter(cp => cp >= 127462 && cp <= 127487)
    .map(cp => String.fromCharCode(cp - 127397))
    .join('')
    .toLowerCase();
  const url = countryCode.length === 2 ? `https://flagcdn.com/w80/${countryCode}.png` : null;
  if (!url) return <span className="text-4xl md:text-5xl filter drop-shadow-md">{flag}</span>;
  return (
    <span className="inline-flex items-center justify-center filter drop-shadow-md">
      <img
        src={url}
        alt=""
        className="h-10 w-14 md:h-12 md:w-16 object-cover rounded-md border border-white/10 shadow-md"
        onError={(e) => {
          e.target.style.display = 'none';
          if (e.target.nextSibling) e.target.nextSibling.style.display = 'inline';
        }}
      />
      <span className="hidden text-4xl md:text-5xl">{flag}</span>
    </span>
  );
};

const HeroBanner = ({ onSelectChannel, channels, favorites, onToggleFavorite, matches }) => {
  // Dynamically pick: first live match, else next upcoming match, else first match
  const liveMatch = matches?.find(m => m.status === 'live');
  const upcomingMatch = matches?.find(m => m.status === 'upcoming');
  const rawHero = liveMatch || upcomingMatch || matches?.[0];

  // Build a normalized heroMatch object from real API data
  const heroMatch = rawHero ? {
    id: rawHero.id,
    homeTeam: rawHero.homeTeam || 'TBD',
    homeFlag: rawHero.homeFlag || null,   // CDN URL from API
    awayTeam: rawHero.awayTeam || 'TBD',
    awayFlag: rawHero.awayFlag || null,   // CDN URL from API
    status: rawHero.status,
    score: rawHero.score || '0 - 0',
    minute: rawHero.minute,
    group: rawHero.group || 'FIFA World Cup 2026',
    localDate: rawHero.localDate || '',
    time: rawHero.time || '',
    date: rawHero.date || '',
    dateTime: rawHero.dateTime || '',
    broadcaster: rawHero.broadcasters?.[0] || null,
    stadium: 'USA / Canada / Mexico 2026',
    description: `Watch the 2026 FIFA World Cup live. ${rawHero.homeTeam || 'Home'} face ${rawHero.awayTeam || 'Away'} in ${rawHero.group || 'the group stage'}. Stream live now.`,
    lineups: { home: [], away: [] },
  } : null;

  const handleWatchHero = () => {
    if (!heroMatch?.broadcaster) return;
    const channelObj = channels.find(c => c.id === heroMatch.broadcaster);
    if (channelObj) {
      onSelectChannel(channelObj);
    }
  };

  const isFavorite = heroMatch?.broadcaster ? favorites.includes(heroMatch.broadcaster) : false;

  // Show placeholder while data loads
  if (!heroMatch) {
    return (
      <div className="relative w-full overflow-hidden rounded-2xl border border-white/5 bg-gradient-to-r from-[#030810] via-[#091220] to-[#050B14] p-6 md:p-10 min-h-[360px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-sport-secondary">
          <div className="h-8 w-8 rounded-full border-2 border-sport-accent/40 border-t-sport-accent animate-spin" />
          <span className="text-xs font-bold uppercase tracking-widest text-sport-accent">Loading 2026 World Cup Data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-white/5 bg-gradient-to-r from-[#030810] via-[#091220] to-[#050B14] p-6 md:p-10 min-h-[360px] md:min-h-[420px] flex flex-col justify-between shadow-2xl">
      {/* Stadium Grid Ambient Reflection */}
      <div className="stadium-grid opacity-30 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-1/2 bg-gradient-to-l from-sport-accent/5 via-transparent to-transparent pointer-events-none" />

      {/* Hero Header */}
      <div className="relative flex justify-between items-center z-10">
        <div className="flex items-center gap-2.5">
          <span className={`${heroMatch.status === 'live' ? 'bg-sport-accent text-black animate-pulse' : 'bg-white/10 text-white'} font-extrabold text-[10px] tracking-widest uppercase px-3 py-1 rounded`}>
            {heroMatch.status === 'live' ? 'FEATURED LIVE' : heroMatch.status === 'finished' ? 'MATCH FINISHED' : 'UPCOMING MATCH'}
          </span>
          <span className="text-xs font-semibold text-sport-secondary flex items-center gap-1.5">
            <Shield className="h-3 w-3 text-sport-accent" />
            {heroMatch.group || 'FIFA World Cup 2026'}
          </span>
        </div>
        <div className="hidden md:flex items-center gap-2 text-xs text-sport-secondary bg-black/30 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/5">
          <span className="h-2 w-2 rounded-full bg-sport-accent animate-pulse" />
          <span>Stream Live in 4K UHD</span>
        </div>
      </div>

      {/* Main Grid Info */}
      <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-6 items-center my-6 z-10">
        <div className="lg:col-span-7 flex flex-col gap-3">
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white leading-tight font-sans">
            {heroMatch.homeTeam} <span className="text-sport-accent">vs</span> {heroMatch.awayTeam}
          </h1>
          <p className="text-sm text-sport-secondary font-medium max-w-xl line-clamp-3">
            {heroMatch.description}
          </p>
          <div className="text-xs text-sport-secondary flex flex-wrap gap-x-4 gap-y-1.5 mt-1">
            <span>🏟️ {heroMatch.stadium}</span>
            <span>🕒 {heroMatch.status === 'live' ? `Live ${heroMatch.minute}` : heroMatch.status === 'finished' ? 'Finished' : (
              <>
                Upcoming • <span className="text-white font-extrabold text-sm">{heroMatch.dateTime}</span>
                {rawHero?.kickoffTime && (
                  <span className="ml-3 bg-amber-500/15 border border-amber-500/20 px-3 py-1 rounded-lg text-amber-300 font-black text-xs inline-flex items-center gap-1.5 shadow-md shadow-amber-500/5">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                    <MatchCountdown kickoffTime={rawHero.kickoffTime} />
                  </span>
                )}
              </>
            )}</span>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 mt-4">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleWatchHero}
              className="flex items-center gap-2 bg-sport-accent hover:bg-sport-accent/90 text-black font-extrabold text-sm px-6 py-3 rounded-xl shadow-lg shadow-sport-accent/20 transition-all duration-300"
            >
              <Play className="h-4 w-4 fill-current text-black" />
              WATCH MATCH LIVE
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => onToggleFavorite(heroMatch.broadcaster)}
              className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white font-bold text-sm px-5 py-3 rounded-xl border border-white/10 transition-all duration-300"
            >
              <Star className={`h-4 w-4 ${isFavorite ? 'fill-yellow-400 text-yellow-400' : 'text-white'}`} />
              {isFavorite ? 'BOOKMARKED' : 'BOOKMARK FEED'}
            </motion.button>
          </div>
        </div>

        {/* Live Interactive Score Widget */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center bg-black/40 backdrop-blur-md rounded-2xl p-6 border border-white/5 shadow-inner">
          <div className="text-[10px] font-extrabold text-sport-secondary tracking-widest mb-4 uppercase">
            LIVE SCOREBOARD
          </div>
          
          <div className="flex items-center justify-around w-full gap-4">
            <div className="flex flex-col items-center text-center">
              {renderFlag(heroMatch.homeFlag)}
              <span className="text-xs font-bold text-white mt-2">{heroMatch.homeTeam}</span>
              <span className="text-[9px] text-sport-secondary mt-0.5 uppercase tracking-wide truncate max-w-[80px]">{heroMatch.homeTeam.toUpperCase()}</span>
            </div>
            
            <div className="flex flex-col items-center">
              <div className="text-3xl md:text-4xl font-black text-white font-mono tracking-wider bg-white/5 px-4 py-2 rounded-xl border border-white/5">
                {heroMatch.score}
              </div>
              {heroMatch.status === 'live' ? (
                <div className="text-[10px] text-sport-accent font-bold animate-pulse mt-2.5">
                  {heroMatch.minute && heroMatch.minute.toLowerCase().includes('live')
                    ? heroMatch.minute.toUpperCase()
                    : `MINUTE ${heroMatch.minute || ''}`}
                </div>
              ) : (
                <div className="text-[10px] text-sport-secondary font-bold mt-2.5">
                  {heroMatch.status === 'finished' ? 'FULL TIME' : heroMatch.dateTime || 'UPCOMING'}
                </div>
              )}
            </div>

            <div className="flex flex-col items-center text-center">
              {renderFlag(heroMatch.awayFlag)}
              <span className="text-xs font-bold text-white mt-2">{heroMatch.awayTeam}</span>
              <span className="text-[9px] text-sport-secondary mt-0.5 uppercase tracking-wide truncate max-w-[80px]">{heroMatch.awayTeam.toUpperCase()}</span>
            </div>
          </div>

          <div className="w-full mt-5 border-t border-white/5 pt-4">
            <div className="flex justify-between items-center text-[10px] text-sport-secondary">
              <span className="font-semibold">Data Source:</span>
              <span className="font-bold text-sport-accent">⚡ FIFA World Cup 2026 — Live API</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Lineups */}
      <div className="relative flex justify-between items-center border-t border-white/5 pt-4 mt-2 z-10">
        <div className="hidden md:flex gap-3 text-[11px] text-sport-secondary">
          <span className="font-bold text-white">ARG Lineup:</span>
          <span>{heroMatch.lineups.home.join(', ')}</span>
        </div>
        <div className="hidden lg:flex gap-3 text-[11px] text-sport-secondary">
          <span className="font-bold text-white">FRA Lineup:</span>
          <span>{heroMatch.lineups.away.join(', ')}</span>
        </div>
        <div className="text-[11px] text-sport-secondary flex items-center gap-1.5 ml-auto">
          <Info className="h-3.5 w-3.5 text-sport-accent" />
          <span>Interactive HUD Stream Active</span>
        </div>
      </div>
    </div>
  );
};

export default HeroBanner;
