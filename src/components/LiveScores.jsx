import React from 'react';
import { motion } from 'framer-motion';
import { Tv, Play } from 'lucide-react';

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

const renderFlag = (flag) => {
  if (!flag) return null;

  // Direct CDN URL from API
  if (typeof flag === 'string' && flag.startsWith('http')) {
    return (
      <span className="inline-flex items-center justify-center flex-shrink-0">
        <img
          src={flag}
          alt=""
          className="h-3.5 w-5 object-cover rounded-sm border border-white/10"
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
        className="h-3.5 w-5 object-cover rounded-sm border border-white/10"
        onError={(e) => {
          e.target.style.display = 'none';
          if (e.target.nextSibling) e.target.nextSibling.style.display = 'inline';
        }}
      />
      <span className="hidden text-base">{flag}</span>
    </span>
  );
};

const LiveScores = ({ onSelectChannel, channels, matches = [] }) => {
  const handleTuneIn = (broadcasterId) => {
    const channelObj = channels.find(c => c.id === broadcasterId);
    if (channelObj) {
      onSelectChannel(channelObj);
    }
  };

  // Filter to live or upcoming matches for the widget bar (from live simulation state)
  const displayMatches = matches.filter(m => m.status === 'live' || m.status === 'upcoming');

  return (
    <div className="w-full flex flex-col gap-3 py-1">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sport-accent opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-sport-accent"></span>
          </span>
          <h3 className="text-sm font-semibold tracking-wider uppercase text-sport-secondary">Live Scores & Fixtures</h3>
        </div>
      </div>
      
      <div className="flex gap-4 overflow-x-auto no-scrollbar pb-3 scroll-smooth">
        {displayMatches.map((match, idx) => (
          <motion.div
            key={match.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: idx * 0.05 }}
            className="flex-shrink-0 w-72 bg-sport-card/80 backdrop-blur-md rounded-xl p-4 border border-white/5 flex flex-col justify-between hover:border-sport-accent/30 transition-all duration-300"
          >
            {/* Match Header Info */}
            <div className="flex justify-between items-center mb-3 text-[10px] font-bold text-sport-secondary">
              <span className="bg-white/5 px-2 py-0.5 rounded-full">{match.group}</span>
              {match.status === 'live' ? (
                <span className="text-sport-accent flex items-center gap-1 animate-pulse">
                  <span className="h-1.5 w-1.5 rounded-full bg-sport-accent inline-block"></span>
                  {match.minute && match.minute.toLowerCase().includes('live')
                    ? match.minute
                    : `LIVE ${match.minute || ''}`}
                </span>
              ) : (
                <span className="text-sport-secondary">{match.dateTime || match.time}</span>
              )}
            </div>

            {/* Teams and Scores */}
            <div className="flex flex-col gap-2.5">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2 text-sm font-semibold text-white">
                  {renderFlag(match.homeFlag)}
                  <span className="truncate max-w-[150px]">{match.homeTeam}</span>
                </div>
                {match.status === 'live' ? (
                  <span className="text-sm font-bold text-white bg-white/5 px-2 py-0.5 rounded">{match.score.split('-')[0].trim()}</span>
                ) : (
                  <span className="text-xs text-sport-secondary font-medium">--</span>
                )}
              </div>

              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2 text-sm font-semibold text-white">
                  {renderFlag(match.awayFlag)}
                  <span className="truncate max-w-[150px]">{match.awayTeam}</span>
                </div>
                {match.status === 'live' ? (
                  <span className="text-sm font-bold text-white bg-white/5 px-2 py-0.5 rounded">{match.score.split('-')[1].trim()}</span>
                ) : (
                  <span className="text-xs text-sport-secondary font-medium">--</span>
                )}
              </div>
            </div>

            {/* Action Broadcasters Footer */}
            {match.broadcasters && match.broadcasters.length > 0 && (
              <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                <span className="text-[10px] text-sport-secondary font-semibold">TUNE IN:</span>
                <div className="flex gap-1.5">
                  {match.broadcasters.slice(0, 2).map(bId => {
                    const channelObj = channels.find(c => c.id === bId);
                    const label = channelObj ? channelObj.name.split(' ')[0] : bId.split('.')[0];
                    return (
                      <button
                        key={bId}
                        onClick={() => handleTuneIn(bId)}
                        className="flex items-center gap-1 bg-sport-accent/10 hover:bg-sport-accent hover:text-black text-sport-accent transition-all duration-300 text-[10px] font-bold px-2 py-1 rounded-md"
                      >
                        <Play className="h-2 w-2 fill-current" />
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default LiveScores;
