import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Play, Calendar, Clock, Tv } from 'lucide-react';
import epgData from '../data/epg.json';
import { formatEPGTimeRange } from '../utils/timeFormatter';

const ChannelLogo = ({ id, name, logo }) => {
  const [logoUrl, setLogoUrl] = useState(logo && logo.trim().length > 0 ? logo : null);

  const handleError = () => {
    setLogoUrl(null);
  };

  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={`${name} Logo`}
        className="max-h-full max-w-full object-contain"
        onError={handleError}
      />
    );
  }

  return <Tv className="h-5 w-5 text-white/20" />;
};

const EPGTimeline = ({ channels, onSelectChannel, selectedChannel }) => {
  const [currentTime, setCurrentTime] = useState(() => {
    return new Date().toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString(undefined, {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      }));
    }, 30000); // update every 30 seconds
    return () => clearInterval(timer);
  }, []);

  // Get EPG details or generate mock ones dynamically
  const getEPGInfo = (ch) => {
    if (epgData[ch.id]) {
      return epgData[ch.id];
    }
    
    const channelName = ch.name;
    const isWc = ch.isWorldCupBroadcaster;
    
    // Generate deterministic mock info based on channel ID
    const charSum = ch.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    
    if (isWc) {
      const wcEvents = [
        {
          now: { title: "FIFA World Cup 2026: Matchday Live Build-up", time: "09:30 - 11:30", type: "Pre-Show", progress: 60 },
          next: { title: "FIFA World Cup 2026: Live Match Broadcast", time: "11:30 - 14:00", type: "Live Match" }
        },
        {
          now: { title: "FIFA World Cup: Historic Match Highlights", time: "10:00 - 11:30", type: "Highlights", progress: 45 },
          next: { title: "World Cup Tonight: Analysis & Insights", time: "11:30 - 12:30", type: "Analysis" }
        },
        {
          now: { title: "FIFA World Cup 2026: Tactical Cam Coverage", time: "10:00 - 12:30", type: "Live Sports", progress: 70 },
          next: { title: "Road to 2026: Tournament Documentaries", time: "12:30 - 13:30", type: "Documentary" }
        }
      ];
      return wcEvents[charSum % wcEvents.length];
    }

    // Default Sports / General
    const sportsEvents = [
      {
        now: { title: "Live Sports Broadcast: Championship Event", time: "10:00 - 12:00", type: "Live Match", progress: 45 },
        next: { title: "Global Sports Center & Match Analysis", time: "12:00 - 13:00", type: "Analysis" }
      },
      {
        now: { title: "World Sports Today: Weekly Highlights", time: "09:30 - 11:00", type: "Replay", progress: 80 },
        next: { title: "Extreme Action Sports Collection", time: "11:00 - 12:30", type: "Extreme Sports" }
      },
      {
        now: { title: "Legends of Sports: Documentary Showcase", time: "10:00 - 11:30", type: "Documentary", progress: 30 },
        next: { title: "Live Sports News & Matchday Countdown", time: "11:30 - 12:00", type: "News" }
      }
    ];
    return sportsEvents[charSum % sportsEvents.length];
  };

  return (
    <div className="w-full flex flex-col gap-4">
      {/* TV Guide header info */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white tracking-wide">TV Guide (EPG)</h2>
          <p className="text-xs text-sport-secondary">Real-time scheduling for all 217 live channels</p>
        </div>
        <div className="flex items-center gap-1.5 bg-white/5 border border-white/5 px-3 py-1.5 rounded-lg text-xs font-semibold text-sport-secondary">
          <Clock className="h-3.5 w-3.5 text-sport-accent" />
          <span>Current Time: {currentTime}</span>
        </div>
      </div>

      {/* Grid container */}
      <div className="w-full overflow-x-auto border border-white/5 rounded-xl bg-sport-card/40 backdrop-blur-md">
        <table className="w-full min-w-[700px] border-collapse text-left">
          <thead>
            <tr className="border-b border-white/5 bg-white/[0.02] text-xs font-bold text-sport-secondary uppercase tracking-wider">
              <th className="py-4 px-6 w-1/3">Channel Info</th>
              <th className="py-4 px-6 w-1/3">Now Broadcasting</th>
              <th className="py-4 px-6 w-1/3">Next Schedule</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {channels.map((ch, idx) => {
              const epg = getEPGInfo(ch);
              const isActive = selectedChannel && selectedChannel.id === ch.id;

              return (
                <motion.tr
                  key={ch.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: Math.min(idx * 0.02, 0.4) }}
                  onClick={() => onSelectChannel(ch)}
                  className={`group cursor-pointer transition-colors duration-200 ${isActive ? 'bg-sport-accent/5' : 'hover:bg-white/[0.02]'}`}
                >
                  {/* Channel Meta */}
                  <td className="py-4 px-6 flex items-center gap-4">
                    <div className="relative h-12 w-12 rounded-lg bg-white/5 border border-white/5 p-2 flex items-center justify-center flex-shrink-0 group-hover:border-sport-accent/30 transition-all duration-300">
                      <ChannelLogo id={ch.id} name={ch.name} logo={ch.logo} />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                        <Play className="h-4 w-4 text-sport-accent fill-current" />
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-1 truncate">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-white group-hover:text-sport-accent transition-colors duration-200 truncate">
                          {ch.name}
                        </span>
                        {ch.isWorldCupBroadcaster && (
                          <span className="bg-yellow-400/10 border border-yellow-400/20 text-yellow-400 font-bold text-[9px] px-1.5 py-0.5 rounded">WC</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-sport-secondary">
                        <span className="bg-white/5 px-1.5 py-0.5 rounded uppercase font-bold text-[9px]">
                          {ch.country ? ch.country.toUpperCase() : 'GL'}
                        </span>
                        <span>•</span>
                        <span>{ch.latency}ms latency</span>
                      </div>
                    </div>
                  </td>

                  {/* Now Playing info */}
                  <td className="py-4 px-6 vertical-align-middle">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex justify-between items-center text-xs font-semibold text-white">
                        <span className="line-clamp-1 group-hover:text-sport-accent transition-colors duration-200">{epg.now.title}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-sport-secondary font-bold">
                        <span className="text-sport-accent bg-sport-accent/10 px-1.5 py-0.5 rounded-full">{epg.now.type}</span>
                        <span>{formatEPGTimeRange(epg.now.time)}</span>
                      </div>
                      {/* EPG Time progress bar */}
                      <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden mt-1">
                        <div 
                          className="bg-sport-accent h-full rounded-full transition-all duration-500" 
                          style={{ width: `${epg.now.progress || 50}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  {/* Next program info */}
                  <td className="py-4 px-6 vertical-align-middle">
                    <div className="flex flex-col gap-1.5 text-xs text-sport-secondary">
                      <span className="font-semibold text-white/90 line-clamp-1">{epg.next.title}</span>
                      <div className="flex items-center gap-2 text-[10px]">
                        <span className="bg-white/5 px-1.5 py-0.5 rounded-full font-bold">{epg.next.type}</span>
                        <span>{formatEPGTimeRange(epg.next.time)}</span>
                      </div>
                    </div>
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default EPGTimeline;
