import React, { useState, useEffect, useRef } from 'react';
import { Trophy, Tv, Star, RefreshCw, Wifi, WifiOff, Award, Play, CheckCircle, Calendar, Layers, TrendingUp, Volume2, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import channelsData from './data/channels.json';
import { useWorldCupData } from './hooks/useWorldCupData';
import VideoPlayer from './components/VideoPlayer';
import GroupStandings from './components/GroupStandings';
import TournamentBracket from './components/TournamentBracket';
import MatchCountdown from './components/MatchCountdown';

function App() {
  // Always default to World Cup TSN 4 (id: WorldCupTSN4.tv)
  const defaultChannel = channelsData.find(c => c.id === 'WorldCupTSN4.tv') || channelsData[0];
  const [selectedChannel, setSelectedChannel] = useState(defaultChannel);
  const [activeToast, setActiveToast] = useState(null);
  const [activeTab, setActiveTab] = useState('standings'); // 'standings' | 'bracket' | 'schedule'

  // Poll real 2026 World Cup data (polls every 60s)
  const { matches, loading: dataLoading, error: dataError, usingFallback, refetch } = useWorldCupData();

  // Track previous match scores to detect goals/kickoffs
  const prevMatchesRef = useRef([]);
  useEffect(() => {
    if (prevMatchesRef.current.length === 0) {
      prevMatchesRef.current = matches;
      return;
    }

    for (const match of matches) {
      const prev = prevMatchesRef.current.find(m => m.id === match.id);
      if (!prev) continue;

      // Detect newly live match
      if (prev.status !== 'live' && match.status === 'live') {
        setActiveToast({
          message: `🏁 Kickoff! ${match.homeTeam} vs ${match.awayTeam} is now LIVE!`,
          type: 'kickoff',
          id: Date.now(),
        });
        break;
      }

      // Detect score change (goal)
      if (match.status === 'live' && prev.score !== match.score) {
        setActiveToast({
          message: `⚽ GOAL! ${match.homeTeam} ${match.score} ${match.awayTeam} (${match.minute || ''})`,
          type: 'goal',
          id: Date.now(),
        });
        break;
      }
    }

    prevMatchesRef.current = matches;
  }, [matches]);

  // Auto-dismiss toast
  useEffect(() => {
    if (activeToast) {
      const timer = setTimeout(() => setActiveToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [activeToast]);

  const handleSelectChannel = (channel) => {
    setSelectedChannel(channel);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePlayMatch = () => {
    handleSelectChannel(defaultChannel);
  };

  // Render flag utility
  const renderFlag = (flag, className = "h-4 w-6 object-cover rounded-sm border border-white/10") => {
    if (!flag) return null;
    if (typeof flag === 'string' && flag.startsWith('http')) {
      return (
        <img
          src={flag}
          alt=""
          className={className}
          onError={(e) => { e.target.style.display = 'none'; }}
        />
      );
    }
    return <span className="text-sm">{flag}</span>;
  };

  // Filter matches
  const liveMatches = matches.filter(m => m.status === 'live');
  const finishedMatches = matches.filter(m => m.status === 'finished').slice(0, 4);
  const upcomingMatches = matches.filter(m => m.status === 'upcoming');
  const nextUpcomingMatch = upcomingMatches.length > 0 
    ? [...upcomingMatches].sort((a, b) => (a.kickoffTime || Infinity) - (b.kickoffTime || Infinity))[0]
    : null;

  return (
    <div className="flex flex-col min-h-screen bg-sport-bg text-white selection:bg-sport-accent selection:text-black">
      
      {/* 1. Header Bar */}
      <header className="sticky top-0 z-40 w-full glass-panel border-b border-white/5 px-4 md:px-8 py-3 sm:py-4 flex flex-col sm:flex-row gap-3 sm:gap-4 justify-between items-center">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl bg-sport-accent/10 border border-sport-accent/20 flex items-center justify-center shadow-lg shadow-sport-accent/5">
            <Trophy className="h-5 w-5 sm:h-6 sm:w-6 text-sport-accent animate-pulse-accent" />
          </div>
          <div>
            <h1 className="text-sm sm:text-base md:text-lg font-black tracking-wider bg-gradient-to-r from-white via-white to-sport-accent bg-clip-text text-transparent flex items-center gap-1.5 sm:gap-2">
              FIFA STREAMER
              <span className="text-[8px] sm:text-[9px] bg-gradient-to-r from-yellow-400 to-amber-500 text-black font-black px-1.5 py-0.5 rounded tracking-wider shadow-md">
                2026 WC
              </span>
            </h1>
            <p className="text-[10px] text-sport-secondary/70 font-bold uppercase tracking-widest hidden md:block">
              By <a href="https://www.facebook.com/monir.mrn/" target="_blank" rel="noopener noreferrer" className="hover:text-sport-accent transition-colors underline decoration-sport-accent/30 hover:decoration-sport-accent">Monirul Islam</a>
            </p>
          </div>
        </div>

        {/* Sync/Status Badges */}
        <div className="flex items-center gap-2 sm:gap-3">
          {liveMatches.length > 0 && (
            <div className="flex items-center gap-1.5 sm:gap-2 bg-sport-accent/5 border border-sport-accent/15 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl text-[8px] sm:text-[10px] font-black text-sport-accent uppercase tracking-wider">
              <span className="h-1 w-1 sm:h-1.5 sm:w-1.5 rounded-full bg-sport-accent animate-pulse" />
              {liveMatches.length} Match{liveMatches.length > 1 ? 'es' : ''} Live
            </div>
          )}

          <button
            onClick={refetch}
            title={usingFallback ? 'Offline fallback data' : 'Connected to live server'}
            className={`flex items-center gap-1 sm:gap-1.5 text-[8px] sm:text-[9px] font-extrabold uppercase tracking-widest px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl border transition-all ${
              usingFallback
                ? 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20'
                : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
            }`}
          >
            {usingFallback ? <WifiOff className="h-2.5 w-2.5 sm:h-3 sm:w-3 animate-pulse" /> : <Wifi className="h-2.5 w-2.5 sm:h-3 sm:w-3" />}
            {usingFallback ? 'Offline Mode' : 'Live Connected'}
          </button>
        </div>
      </header>

      {/* 2. Main Content Grid */}
      <main className="flex-1 w-full px-4 md:px-6 py-4 md:py-5 flex flex-col gap-5 md:gap-6">
        
        {/* Top Section: Channel Sidebar + Player + Scoreboard */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">

          {/* Left Sidebar: Channel Selector */}
          <div className="lg:col-span-2 order-2 lg:order-1 flex flex-col gap-2">
            <span className="text-[9px] font-extrabold text-sport-secondary uppercase tracking-widest pl-1 mb-1">
              Broadcast Feeds
            </span>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:flex lg:flex-col gap-2">
              {channelsData.map(ch => {
                const isActive = selectedChannel.id === ch.id;
                const isDefault = ch.id === 'WorldCupTSN4.tv';

                return (
                  <div
                    key={ch.id}
                    onClick={() => handleSelectChannel(ch)}
                    className={`relative cursor-pointer rounded-xl p-3 border transition-all duration-300 flex flex-col gap-2 ${
                      isActive
                        ? 'bg-sport-accent/10 border-sport-accent/40 shadow-lg shadow-sport-accent/10'
                        : 'bg-sport-card/30 border-white/5 hover:border-white/10 hover:bg-sport-card/50'
                    }`}
                  >
                    {/* Icon + Name */}
                    <div className="flex items-center gap-2">
                      <div className={`h-7 w-7 rounded-lg flex-shrink-0 flex items-center justify-center ${isActive ? 'bg-sport-accent/20' : 'bg-white/5 border border-white/5'}`}>
                        <Tv className={`h-3.5 w-3.5 ${isActive ? 'text-sport-accent' : 'text-sport-secondary'}`} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-[11px] font-bold text-white tracking-wide leading-tight truncate">{ch.name}</h3>
                        <span className="text-[8px] font-semibold text-sport-secondary uppercase tracking-wider">
                          {ch.isIframe ? '1ball.pk' : `${ch.country || 'INT'} • ${ch.id.toLowerCase().includes('tsports') ? 'BN' : 'EN'}`}
                        </span>
                      </div>
                    </div>

                    {/* Quality badge */}
                    <div className="flex items-center gap-1 flex-wrap">
                      {isDefault && (
                        <span className="text-[7px] font-black bg-sport-accent/15 text-sport-accent border border-sport-accent/25 px-1 py-0.5 rounded uppercase tracking-widest">
                          DEFAULT
                        </span>
                      )}
                      <span className={`text-[7px] font-bold px-1 py-0.5 rounded ${isActive ? 'bg-sport-accent text-black font-black' : 'bg-white/5 text-sport-secondary'}`}>
                        {ch.isIframe ? 'WEB EMBED' : isDefault ? '4K UHD' : 'HD 1080P'}
                      </span>
                    </div>

                    {/* Active glow bottom border */}
                    {isActive && (
                      <div className="absolute inset-x-0 bottom-0 h-0.5 bg-sport-accent rounded-b-xl" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Center Column: Player */}
          <div className="lg:col-span-7 order-1 lg:order-2">
            <VideoPlayer
              channel={selectedChannel}
              onClose={null}
              isTheaterMode={false}
              onToggleTheater={null}
              nextMatch={nextUpcomingMatch}
            />
          </div>

          {/* Right Column: Scoreboard */}
          <div className="lg:col-span-3 order-3 flex flex-col gap-4 h-full">
            <div className="bg-sport-card/30 border border-white/5 rounded-2xl p-4 backdrop-blur-md h-full flex flex-col justify-between">
              
              <div>
                <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-4">
                  <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                    </span>
                    Live Scoreboard
                  </h3>
                  <span className="text-[9px] font-bold text-sport-secondary bg-white/5 px-2 py-0.5 rounded-full">
                    FIFA World Cup 2026
                  </span>
                </div>

                {/* Match Lists */}
                <div className="flex flex-col gap-3 max-h-[560px] overflow-y-auto pr-1 no-scrollbar">
                  
                  {/* Live Matches */}
                  {liveMatches.length > 0 ? (
                    liveMatches.map(match => (
                      <div
                        key={match.id}
                        onClick={handlePlayMatch}
                        className="bg-sport-accent/5 border border-sport-accent/20 rounded-xl p-3 flex flex-col gap-2 hover:bg-sport-accent/10 transition-all cursor-pointer group"
                      >
                        <div className="flex justify-between items-center text-[9px] font-bold text-sport-accent uppercase tracking-widest">
                          <span>{match.group}</span>
                          <span className="animate-pulse flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-sport-accent inline-block"></span>
                            {match.minute && match.minute.toLowerCase().includes('live')
                              ? match.minute
                              : `LIVE ${match.minute || ''}`}
                          </span>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <div className="flex justify-between items-center text-xs">
                            <div className="flex items-center gap-2 text-white font-bold">
                              {renderFlag(match.homeFlag, "h-3 w-4.5 object-cover rounded-sm border border-white/10")}
                              <span>{match.homeTeam}</span>
                            </div>
                            <span className="text-xs font-extrabold text-white bg-white/5 px-1.5 py-0.5 rounded font-mono">
                              {match.score.split('-')[0].trim()}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <div className="flex items-center gap-2 text-white font-bold">
                              {renderFlag(match.awayFlag, "h-3 w-4.5 object-cover rounded-sm border border-white/10")}
                              <span>{match.awayTeam}</span>
                            </div>
                            <span className="text-xs font-extrabold text-white bg-white/5 px-1.5 py-0.5 rounded font-mono">
                              {match.score.split('-')[1].trim()}
                            </span>
                          </div>
                        </div>
                        <div className="border-t border-white/5 pt-2 mt-1 flex justify-between items-center text-[9px] font-bold text-sport-secondary">
                          <span>Click to Watch Feed</span>
                          <span className="text-sport-accent opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                            <Play className="h-2 w-2 fill-current" /> STREAM NOW
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6 border border-dashed border-white/5 rounded-xl text-xs text-sport-secondary/60">
                      No matches are currently live.
                    </div>
                  )}

                  {/* Finished Matches separator */}
                  <div className="text-[9px] font-extrabold text-sport-secondary uppercase tracking-widest mt-2 pl-1 border-l border-white/20">
                    Recent Results
                  </div>

                  {/* Finished Matches list */}
                  {finishedMatches.map(match => (
                    <div
                      key={match.id}
                      className="bg-sport-card/40 border border-white/5 rounded-xl p-3 flex flex-col gap-2 hover:border-white/10 transition-all"
                    >
                      <div className="flex justify-between items-center text-[9px] font-bold text-sport-secondary uppercase tracking-widest">
                        <span>{match.group}</span>
                        <span className="flex items-center gap-1 text-[8px] font-bold bg-white/5 px-1.5 py-0.5 rounded text-sport-secondary">
                          FINISHED
                        </span>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <div className="flex justify-between items-center text-xs text-sport-secondary">
                          <div className="flex items-center gap-2">
                            {renderFlag(match.homeFlag, "h-3 w-4.5 object-cover rounded-sm border border-white/10 opacity-70")}
                            <span className="truncate max-w-[120px]">{match.homeTeam}</span>
                          </div>
                          <span className="font-mono text-white/80 font-bold">{match.score ? match.score.split('-')[0].trim() : '0'}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs text-sport-secondary">
                          <div className="flex items-center gap-2">
                            {renderFlag(match.awayFlag, "h-3 w-4.5 object-cover rounded-sm border border-white/10 opacity-70")}
                            <span className="truncate max-w-[120px]">{match.awayTeam}</span>
                          </div>
                          <span className="font-mono text-white/80 font-bold">{match.score ? match.score.split('-')[1].trim() : '0'}</span>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Upcoming Matches separator */}
                  {upcomingMatches.length > 0 && (
                    <>
                      <div className="text-[9px] font-extrabold text-sport-secondary uppercase tracking-widest mt-2 pl-1 border-l border-white/20 flex items-center gap-2">
                        <Calendar className="h-3 w-3" />
                        Upcoming Matches
                      </div>

                      {upcomingMatches.slice(0, 4).map(match => (
                        <div
                          key={match.id}
                          className="bg-sport-card/20 border border-white/5 rounded-xl p-3 flex flex-col gap-2 hover:border-white/10 transition-all"
                        >
                          {/* Group + kickoff time */}
                          <div className="flex justify-between items-center text-[10px] font-bold text-sport-secondary uppercase tracking-widest">
                            <span className="font-extrabold">{match.group}</span>
                            <span className="flex items-center gap-1 text-[11px] font-black text-blue-300 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-md shadow-sm">
                              {match.date ? `${match.date} · ` : ''}{match.time}
                            </span>
                          </div>

                          {/* Teams */}
                          <div className="flex flex-col gap-2 my-1">
                            <div className="flex justify-between items-center text-[13px] text-white/90 font-bold">
                              <div className="flex items-center gap-2">
                                {renderFlag(match.homeFlag, "h-3.5 w-5 object-cover rounded-sm border border-white/10 opacity-90")}
                                <span>{match.homeTeam}</span>
                              </div>
                              <span className="font-mono text-sport-secondary/40 text-[10px] font-black">vs</span>
                            </div>
                            <div className="flex justify-between items-center text-[13px] text-white/90 font-bold">
                              <div className="flex items-center gap-2">
                                {renderFlag(match.awayFlag, "h-3.5 w-5 object-cover rounded-sm border border-white/10 opacity-90")}
                                <span>{match.awayTeam}</span>
                              </div>
                            </div>
                          </div>

                          {/* Kickoff Countdown */}
                          {match.kickoffTime && (
                            <div className="text-xs text-amber-300 font-black bg-amber-500/10 border border-amber-500/20 rounded-xl py-1.5 px-3 flex items-center justify-between mt-1 shadow-md shadow-amber-500/5">
                              <span className="text-white/60 uppercase text-[9px] tracking-widest font-extrabold flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                                Kickoff
                              </span>
                              <MatchCountdown kickoffTime={match.kickoffTime} className="font-mono tracking-wide" />
                            </div>
                          )}
                        </div>
                      ))}
                    </>
                  )}

                </div>
              </div>

              {/* Promo box */}
              <div className="mt-4 bg-gradient-to-r from-[#0F1E36] to-[#0a1224] border border-white/5 rounded-xl p-3 flex items-center justify-between text-[10px]">
                <div className="flex items-center gap-2 text-yellow-400 font-bold">
                  <Award className="h-4 w-4" />
                  <span>2026 World Cup Bracket Live</span>
                </div>
                <button 
                  onClick={() => setActiveTab('bracket')}
                  className="text-sport-accent hover:underline uppercase font-extrabold tracking-widest text-[9px]"
                >
                  View Bracket
                </button>
              </div>

            </div>
          </div>

        </section>

        {/* 3. Tournament Info Center Dashboard */}
        <section className="flex flex-col gap-6">
          
          {/* Navigation Tab Header */}
          <div className="flex border-b border-white/5 gap-6 overflow-x-auto no-scrollbar whitespace-nowrap">
            <button
              onClick={() => setActiveTab('standings')}
              className={`pb-3.5 text-xs font-black tracking-wider uppercase border-b-2 transition-all duration-300 flex items-center gap-2 cursor-pointer ${
                activeTab === 'standings'
                  ? 'border-sport-accent text-sport-accent'
                  : 'border-transparent text-sport-secondary hover:text-white'
              }`}
            >
              <TrendingUp className="h-4 w-4" />
              Group Standings
            </button>
            <button
              onClick={() => setActiveTab('bracket')}
              className={`pb-3.5 text-xs font-black tracking-wider uppercase border-b-2 transition-all duration-300 flex items-center gap-2 cursor-pointer ${
                activeTab === 'bracket'
                  ? 'border-sport-accent text-sport-accent'
                  : 'border-transparent text-sport-secondary hover:text-white'
              }`}
            >
              <Award className="h-4 w-4" />
              Tournament Bracket
            </button>
            <button
              onClick={() => setActiveTab('schedule')}
              className={`pb-3.5 text-xs font-black tracking-wider uppercase border-b-2 transition-all duration-300 flex items-center gap-2 cursor-pointer ${
                activeTab === 'schedule'
                  ? 'border-sport-accent text-sport-accent'
                  : 'border-transparent text-sport-secondary hover:text-white'
              }`}
            >
              <Calendar className="h-4 w-4" />
              Upcoming Schedule
            </button>
          </div>

          {/* Active Tab Screen Layouts */}
          <div className="w-full">
            {activeTab === 'standings' ? (
              <GroupStandings matches={matches} />
            ) : activeTab === 'bracket' ? (
              <TournamentBracket onSelectChannel={handleSelectChannel} channels={channelsData} />
            ) : (
              // Upcoming Schedule matches
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {upcomingMatches.map((match, idx) => (
                  <div
                    key={match.id}
                    onClick={handlePlayMatch}
                    className="bg-sport-card/40 border border-white/5 hover:border-sport-accent/20 rounded-2xl p-4 flex flex-col justify-between transition-all duration-300 cursor-pointer group"
                  >
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-[9px] font-extrabold uppercase bg-white/5 px-2 py-0.5 rounded-full text-sport-secondary">
                        {match.group}
                      </span>
                      <span className="text-[10px] font-bold text-sport-accent uppercase tracking-wider bg-sport-accent/10 px-2.5 py-0.5 rounded-full border border-sport-accent/20">
                        UPCOMING
                      </span>
                    </div>

                    <div className="flex flex-col gap-3 py-1.5">
                      <div className="flex justify-between items-center text-sm font-bold text-white">
                        <div className="flex items-center gap-2.5">
                          {renderFlag(match.homeFlag)}
                          <span>{match.homeTeam}</span>
                        </div>
                        <span className="text-xs text-sport-secondary/40 font-bold font-mono">-</span>
                      </div>
                      <div className="flex justify-between items-center text-sm font-bold text-white">
                        <div className="flex items-center gap-2.5">
                          {renderFlag(match.awayFlag)}
                          <span>{match.awayTeam}</span>
                        </div>
                        <span className="text-xs text-sport-secondary/40 font-bold font-mono">-</span>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-white/5 flex justify-between items-end text-[10px] text-sport-secondary font-semibold">
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] font-extrabold uppercase text-sport-secondary/60 tracking-wider">Kickoff Time</span>
                        <span className="text-white font-extrabold text-sm">{match.dateTime || match.time}</span>
                        {match.kickoffTime && (
                          <div className="inline-flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-md text-amber-300 font-extrabold text-[11px] w-fit mt-1.5 shadow-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                            <MatchCountdown kickoffTime={match.kickoffTime} />
                          </div>
                        )}
                      </div>
                      <span className="bg-sport-accent/10 hover:bg-sport-accent hover:text-black text-sport-accent text-[10px] font-extrabold px-4 py-2 rounded-xl transition-all duration-300 flex items-center gap-1.5 shadow-lg shadow-sport-accent/5">
                        <Play className="h-2.5 w-2.5 fill-current" /> Stream Live
                      </span>
                    </div>
                  </div>
                ))}
                {upcomingMatches.length === 0 && (
                  <div className="col-span-2 text-center py-12 text-sport-secondary font-bold text-sm">
                    No upcoming matches listed.
                  </div>
                )}
              </div>
            )}
          </div>

        </section>

      </main>

      {/* Floating Goal/Kickoff Notifications */}
      <AnimatePresence>
        {activeToast && (
          <motion.div
            key={activeToast.id}
            initial={{ opacity: 0, y: -30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={`fixed top-24 right-4 md:right-6 z-50 glass-panel border px-4.5 py-3 rounded-2xl flex items-center gap-3.5 shadow-2xl max-w-sm ${
              activeToast.type === 'goal' 
                ? 'border-sport-accent/40 shadow-sport-accent/5' 
                : 'border-yellow-400/40 shadow-yellow-400/5'
            }`}
          >
            <div className={`h-8 w-8 rounded-full flex items-center justify-center text-black flex-shrink-0 font-bold ${
              activeToast.type === 'goal' ? 'bg-sport-accent' : 'bg-yellow-400'
            }`}>
              {activeToast.type === 'goal' ? '⚽' : '🏁'}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[9px] font-extrabold text-sport-secondary uppercase tracking-widest leading-none">
                {activeToast.type === 'goal' ? 'LIVE GOAL ALERT' : 'TOURNAMENT KICKOFF'}
              </span>
              <p className="text-xs font-bold text-white mt-1 leading-normal break-words pr-2">
                {activeToast.message}
              </p>
            </div>
            <button 
              onClick={() => setActiveToast(null)} 
              className="text-sport-secondary hover:text-white transition-colors ml-auto p-1 cursor-pointer flex-shrink-0"
            >
              <CheckCircle className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      
    </div>
  );
}

export default App;
