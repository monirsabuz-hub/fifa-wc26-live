import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Award, Play, CheckCircle } from 'lucide-react';

const emojiToFlagUrl = (emoji) => {
  if (!emoji) return null;
  const codePoints = [...emoji].map(char => char.codePointAt(0));
  const countryCode = codePoints
    .filter(cp => cp >= 127462 && cp <= 127487)
    .map(cp => String.fromCharCode(cp - 127397))
    .join('')
    .toLowerCase();
  return countryCode.length === 2 ? `https://flagcdn.com/w40/${countryCode}.png` : null;
};

const renderFlag = (flag, className = "h-3.5 w-5 object-cover rounded-sm border border-white/10") => {
  if (!flag) return null;

  // Direct CDN URL from API
  if (typeof flag === 'string' && flag.startsWith('http')) {
    return (
      <span className="inline-flex items-center justify-center flex-shrink-0">
        <img
          src={flag}
          alt=""
          className={className}
          onError={(e) => { e.target.style.display = 'none'; }}
        />
      </span>
    );
  }

  // Legacy: emoji → CDN conversion
  const url = emojiToFlagUrl(flag);
  if (!url) return <span className="text-base">{flag}</span>;
  return (
    <span className="inline-flex items-center justify-center flex-shrink-0">
      <img 
        src={url} 
        alt="" 
        className={className}
        onError={(e) => {
          e.target.style.display = 'none';
          if (e.target.nextSibling) e.target.nextSibling.style.display = 'inline';
        }}
      />
      <span className="hidden text-base">{flag}</span>
    </span>
  );
};

const parseTeamString = (teamStr) => {
  if (!teamStr) return { flagEmoji: '', name: '' };
  const chars = [...teamStr];
  const flagCodePoints = [];
  const nameChars = [];
  for (let i = 0; i < chars.length; i++) {
    const cp = chars[i].codePointAt(0);
    if (cp >= 127462 && cp <= 127487) {
      flagCodePoints.push(cp);
    } else {
      nameChars.push(chars[i]);
    }
  }
  const flagEmoji = flagCodePoints.map(cp => String.fromCodePoint(cp)).join('');
  const name = nameChars.join('').trim();
  return { flagEmoji, name };
};

const renderTeamWithFlag = (teamStr, textClass = "text-white") => {
  const { flagEmoji, name } = parseTeamString(teamStr);
  return (
    <span className={`flex items-center gap-2 ${textClass}`}>
      {renderFlag(flagEmoji, "h-3 w-4.5 object-cover rounded-sm border border-white/10 flex-shrink-0")}
      <span className="truncate">{name}</span>
    </span>
  );
};

const ScheduleBoard = ({ onSelectChannel, channels, matches = [] }) => {
  const [activeSubTab, setActiveSubTab] = useState('list'); // 'list' | 'bracket'
  const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'live' | 'upcoming' | 'finished'

  const handleBroadcasterClick = (broadcasterId) => {
    const ch = channels.find(c => c.id === broadcasterId);
    if (ch) {
      onSelectChannel(ch);
    }
  };

  const filteredMatches = matches.filter(m => {
    if (filterStatus === 'all') return true;
    return m.status === filterStatus;
  });

  return (
    <div className="w-full flex flex-col gap-4 mt-2">
      {/* Header bar tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-3">
        <div className="flex gap-4">
          <button 
            className={`flex items-center gap-2 pb-2.5 text-sm font-semibold tracking-wide border-b-2 transition-all duration-300 ${
              activeSubTab === 'list' 
                ? 'border-sport-accent text-sport-accent' 
                : 'border-transparent text-sport-secondary hover:text-white'
            }`}
            onClick={() => setActiveSubTab('list')}
          >
            <Calendar className="h-4 w-4" />
            Match Schedule
          </button>
          <button 
            className={`flex items-center gap-2 pb-2.5 text-sm font-semibold tracking-wide border-b-2 transition-all duration-300 ${
              activeSubTab === 'bracket' 
                ? 'border-sport-accent text-sport-accent' 
                : 'border-transparent text-sport-secondary hover:text-white'
            }`}
            onClick={() => setActiveSubTab('bracket')}
          >
            <Award className="h-4 w-4" />
            Knockout Bracket
          </button>
        </div>

        {/* Sub-filters for Schedule List */}
        {activeSubTab === 'list' && (
          <div className="flex gap-1 bg-white/5 p-1 rounded-xl border border-white/5 max-w-max self-start sm:self-auto">
            {['all', 'live', 'upcoming', 'finished'].map(status => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-300 ${
                  filterStatus === status 
                    ? 'bg-sport-card text-sport-accent shadow-md border border-white/5' 
                    : 'text-sport-secondary hover:text-white'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Contents */}
      {activeSubTab === 'list' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredMatches.map((match, index) => (
            <motion.div 
              key={match.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.04 }}
              className="glass-panel rounded-xl p-4 border border-white/5 flex flex-col justify-between hover:border-sport-accent/20 transition-all duration-300"
            >
              <div className="flex justify-between items-center mb-3">
                <span className="text-[9px] font-extrabold uppercase bg-white/5 px-2 py-0.5 rounded-full text-sport-secondary">
                  {match.group}
                </span>
                {match.status === 'live' ? (
                  <div className="flex items-center gap-1.5 text-sport-accent font-bold text-xs bg-sport-accent/10 border border-sport-accent/20 px-2.5 py-0.5 rounded-full animate-pulse">
                    <span className="h-1.5 w-1.5 rounded-full bg-sport-accent" />
                    LIVE {match.minute}
                  </div>
                ) : match.status === 'finished' ? (
                  <div className="flex items-center gap-1 text-[10px] font-bold text-sport-secondary bg-white/5 px-2.5 py-0.5 rounded-full">
                    <CheckCircle className="h-3 w-3 text-sport-secondary/60" /> 
                    FINISHED
                  </div>
                ) : (
                  <span className="text-[10px] font-bold text-sport-accent uppercase tracking-wider bg-sport-accent/10 px-2.5 py-0.5 rounded-full border border-sport-accent/20">
                    UPCOMING
                  </span>
                )}
              </div>

              {/* Team Scores */}
              <div className="flex flex-col gap-3 py-1">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2.5 text-sm font-bold text-white">
                    {renderFlag(match.homeFlag, "h-4 w-5.5 object-cover rounded-sm border border-white/10 shadow-sm")}
                    <span>{match.homeTeam}</span>
                  </div>
                  {match.score ? (
                    <span className="text-sm font-bold text-white font-mono bg-white/5 px-2 py-0.5 rounded border border-white/5">
                      {match.score.split('-')[0].trim()}
                    </span>
                  ) : (
                    <span className="text-xs text-sport-secondary/40 font-bold font-mono">-</span>
                  )}
                </div>

                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2.5 text-sm font-bold text-white">
                    {renderFlag(match.awayFlag, "h-4 w-5.5 object-cover rounded-sm border border-white/10 shadow-sm")}
                    <span>{match.awayTeam}</span>
                  </div>
                  {match.score ? (
                    <span className="text-sm font-bold text-white font-mono bg-white/5 px-2 py-0.5 rounded border border-white/5">
                      {match.score.split('-')[1].trim()}
                    </span>
                  ) : (
                    <span className="text-xs text-sport-secondary/40 font-bold font-mono">-</span>
                  )}
                </div>
              </div>

              {/* Card Footer Broadcasters */}
              <div className="mt-4 pt-3 border-t border-white/5 flex flex-col gap-2.5">
                <div className="flex justify-between items-center text-[10px] text-sport-secondary font-semibold">
                  <span>Kickoff:</span>
                  <span className="text-white">{match.dateTime || match.time}</span>
                </div>
                {match.broadcasters && match.broadcasters.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[9px] text-sport-secondary font-bold uppercase tracking-wider">TUNE IN LIVE:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {match.broadcasters.map(bId => {
                        const channelObj = channels.find(c => c.id === bId);
                        const label = channelObj ? channelObj.name : bId.split('.')[0];
                        return (
                          <button
                            key={bId}
                            onClick={() => handleBroadcasterClick(bId)}
                            className="flex items-center gap-1 bg-sport-accent/10 hover:bg-sport-accent hover:text-black border border-sport-accent/10 hover:border-transparent text-sport-accent text-[9px] font-bold px-2 py-1 rounded-md transition-all duration-300"
                          >
                            <Play className="h-2 w-2 fill-current" />
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
          {filteredMatches.length === 0 && (
            <div className="col-span-2 text-center py-12 text-sport-secondary font-bold text-sm">
              No matches found matching the selected filter.
            </div>
          )}
        </div>
      ) : (
        /* Knockout Bracket View */
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-0 bg-sport-card/30 border border-white/5 rounded-2xl p-6 overflow-x-auto min-w-[900px] items-stretch relative">
          
          {/* Custom SVG filter defs for neon glow */}
          <svg className="absolute w-0 h-0">
            <defs>
              <filter id="bracket-neon-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
          </svg>

          {/* Column 1: Quarterfinals */}
          <div className="lg:col-span-1 flex flex-col gap-4">
            <div className="text-xs font-extrabold uppercase text-sport-secondary tracking-widest pl-1 border-l-2 border-sport-accent/60 mb-2">
              Quarterfinals
            </div>
            
            <div className="flex flex-col gap-4 h-full justify-between py-2">
              {[
                { teams: ["🇳🇱 Netherlands", "🇦🇷 Argentina"], scores: ["1", "2"], broadcaster: "CazeTV.br", channelLabel: "CazéTV" },
                { teams: ["🇭🇷 Croatia", "🇧🇷 Brazil"], scores: ["1 (4)", "1 (2)"], broadcaster: "DasErste.de", channelLabel: "ARD" },
                { teams: ["🇬🇧 England", "🇫🇷 France"], scores: ["1", "2"], broadcaster: "La1.es", channelLabel: "La 1" },
                { teams: ["🇲🇦 Morocco", "🇵🇹 Portugal"], scores: ["1", "0"], broadcaster: "FIFAPlus.uk", channelLabel: "FIFA+" }
              ].map((m, i) => (
                <div 
                  key={i} 
                  onClick={() => handleBroadcasterClick(m.broadcaster)}
                  className="bg-sport-card hover:bg-sport-card/80 border border-white/5 hover:border-sport-accent/30 p-3.5 rounded-xl cursor-pointer flex flex-col gap-2 transition-all duration-300"
                >
                  <div className="flex justify-between items-center text-xs font-semibold">
                    {renderTeamWithFlag(m.teams[0], "text-sport-secondary")}
                    <span className="text-white/40">{m.scores[0]}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs font-bold">
                    {renderTeamWithFlag(m.teams[1], "text-white")}
                    <span className="text-sport-accent">{m.scores[1]}</span>
                  </div>
                  <div className="border-t border-white/5 pt-2 mt-1 flex justify-between items-center text-[9px] font-bold text-sport-secondary">
                    <span>📺 {m.channelLabel}</span>
                    <span className="text-sport-accent/80">FINISHED</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Column 2: QF to SF Connectors */}
          <div className="hidden lg:flex lg:col-span-1 flex-col justify-around h-full py-14 w-full select-none pointer-events-none">
            {/* SVG 1 (QF 1 & 2 to SF 1) */}
            <svg className="w-full h-[180px] stroke-sport-accent/20" viewBox="0 0 48 180" fill="none">
              <path d="M 0 35 L 24 35 L 24 90 L 48 90" strokeWidth="2" filter="url(#bracket-neon-glow)" />
              <path d="M 0 145 L 24 145 L 24 90 L 48 90" strokeWidth="2" filter="url(#bracket-neon-glow)" />
            </svg>
            {/* SVG 2 (QF 3 & 4 to SF 2) */}
            <svg className="w-full h-[180px] stroke-sport-accent/20" viewBox="0 0 48 180" fill="none">
              <path d="M 0 35 L 24 35 L 24 90 L 48 90" strokeWidth="2" filter="url(#bracket-neon-glow)" />
              <path d="M 0 145 L 24 145 L 24 90 L 48 90" strokeWidth="2" filter="url(#bracket-neon-glow)" />
            </svg>
          </div>

          {/* Column 3: Semifinals */}
          <div className="lg:col-span-1 flex flex-col gap-4">
            <div className="text-xs font-extrabold uppercase text-sport-secondary tracking-widest pl-1 border-l-2 border-sport-accent/60 mb-2">
              Semifinals
            </div>
            
            <div className="flex flex-col gap-12 h-full justify-around py-16">
              {[
                { teams: ["🇦🇷 Argentina", "🇭🇷 Croatia"], scores: ["3", "0"], broadcaster: "TyCSports.ar", channelLabel: "TyC Sports" },
                { teams: ["🇫🇷 France", "🇲🇦 Morocco"], scores: ["2", "0"], broadcaster: "CCTV1.cn", channelLabel: "CCTV" }
              ].map((m, i) => (
                <div 
                  key={i} 
                  onClick={() => handleBroadcasterClick(m.broadcaster)}
                  className="bg-sport-card hover:bg-sport-card/80 border border-white/5 hover:border-sport-accent/30 p-3.5 rounded-xl cursor-pointer flex flex-col gap-2 transition-all duration-300"
                >
                  <div className="flex justify-between items-center text-xs font-bold">
                    {renderTeamWithFlag(m.teams[0], "text-white")}
                    <span className="text-sport-accent">{m.scores[0]}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs font-semibold">
                    {renderTeamWithFlag(m.teams[1], "text-sport-secondary")}
                    <span className="text-white/40">{m.scores[1]}</span>
                  </div>
                  <div className="border-t border-white/5 pt-2 mt-1 flex justify-between items-center text-[9px] font-bold text-sport-secondary">
                    <span>📺 {m.channelLabel}</span>
                    <span className="text-sport-accent/80">FINISHED</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Column 4: SF to Final Connector */}
          <div className="hidden lg:flex lg:col-span-1 flex-col justify-center h-full w-full select-none pointer-events-none">
            <svg className="w-full h-[360px] stroke-sport-accent/20" viewBox="0 0 48 360" fill="none">
              <path d="M 0 75 L 24 75 L 24 180 L 48 180" strokeWidth="2" filter="url(#bracket-neon-glow)" />
              <path d="M 0 285 L 24 285 L 24 180 L 48 180" strokeWidth="2" filter="url(#bracket-neon-glow)" />
            </svg>
          </div>

          {/* Column 5: Final */}
          <div className="lg:col-span-1 flex flex-col gap-4">
            <div className="text-xs font-extrabold uppercase text-yellow-400 tracking-widest pl-1 border-l-2 border-yellow-400 mb-2">
              Championship Final
            </div>
            
            <div className="flex flex-col h-full justify-center py-20">
              <div 
                onClick={() => handleBroadcasterClick('TyCSports.ar')}
                className="bg-sport-card/90 hover:bg-sport-card border-2 border-yellow-400/40 hover:border-yellow-400 p-5 rounded-2xl cursor-pointer flex flex-col gap-3 shadow-lg shadow-yellow-500/5 transition-all duration-300"
              >
                <div className="flex justify-between items-center text-sm font-black">
                  {renderTeamWithFlag("🇦🇷 Argentina", "text-white")}
                  <span className="text-yellow-400 font-mono">3 (4)</span>
                </div>
                <div className="flex justify-between items-center text-sm font-bold">
                  {renderTeamWithFlag("🇫🇷 France", "text-sport-secondary")}
                  <span className="text-white/40 font-mono">3 (2)</span>
                </div>
                <div className="border-t border-white/5 pt-3 mt-1.5 flex justify-between items-center text-[10px] font-bold text-yellow-400">
                  <span>🏆 Champions: ARGENTINA</span>
                  <span className="animate-pulse flex items-center gap-1">
                    <Play className="h-2 w-2 fill-current" /> Play Feed
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScheduleBoard;
