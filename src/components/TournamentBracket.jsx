import React from 'react';
import { motion } from 'framer-motion';
import { Play, Award, Calendar, CheckCircle } from 'lucide-react';

const renderFlag = (flag) => {
  if (!flag) return null;
  if (typeof flag === 'string' && flag.startsWith('http')) {
    return (
      <img
        src={flag}
        alt=""
        className="h-3 w-4.5 object-cover rounded-sm border border-white/10 flex-shrink-0"
        onError={(e) => { e.target.style.display = 'none'; }}
      />
    );
  }
  return <span className="text-xs leading-none">{flag}</span>;
};

const TournamentBracket = ({ onSelectChannel, channels = [] }) => {
  const handlePlayMatch = () => {
    // Select World Cup TSN 4 (default) as stream channel since other broadcasters are removed
    const defaultChannel = channels.find(c => c.id === 'WorldCupTSN4.tv') || channels[0];
    if (defaultChannel && onSelectChannel) {
      onSelectChannel(defaultChannel);
    }
  };

  const quarterFinals = [
    { home: "Netherlands", homeFlag: "🇳🇱", homeScore: "1", away: "Argentina", awayFlag: "🇦🇷", awayScore: "2", status: "finished" },
    { home: "Croatia", homeFlag: "🇭🇷", homeScore: "1 (4)", away: "Brazil", awayFlag: "🇧🇷", awayScore: "1 (2)", status: "finished" },
    { home: "England", homeFlag: "🇬🇧", homeScore: "1", away: "France", awayFlag: "🇫🇷", awayScore: "2", status: "finished" },
    { home: "Morocco", homeFlag: "🇲🇦", homeScore: "1", away: "Portugal", awayFlag: "🇵🇹", awayScore: "0", status: "finished" }
  ];

  const semiFinals = [
    { home: "Argentina", homeFlag: "🇦🇷", homeScore: "3", away: "Croatia", awayFlag: "🇭🇷", awayScore: "0", status: "finished" },
    { home: "France", homeFlag: "🇫🇷", homeScore: "2", away: "Morocco", awayFlag: "🇲🇦", awayScore: "0", status: "finished" }
  ];

  const finalMatch = {
    home: "Argentina", homeFlag: "🇦🇷", homeScore: "3 (4)", away: "France", awayFlag: "🇫🇷", awayScore: "3 (2)", status: "finished", winner: "Argentina"
  };

  return (
    <div className="w-full mt-2 overflow-x-auto no-scrollbar pb-4">
      {/* Horizontal scrolling bracket container */}
      <div className="min-w-[950px] grid grid-cols-5 gap-0 items-center py-6 px-4 bg-sport-card/30 border border-white/5 rounded-3xl relative overflow-hidden backdrop-blur-md">
        
        {/* Glow Background Gradients */}
        <div className="absolute top-[-50%] left-[-20%] w-[60%] h-[150%] bg-sport-accent/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-[-50%] right-[-10%] w-[50%] h-[150%] bg-yellow-400/5 rounded-full blur-[100px] pointer-events-none" />

        {/* Column 1: Quarterfinals */}
        <div className="col-span-1 flex flex-col gap-8 z-10">
          <div className="text-[10px] font-extrabold uppercase text-sport-secondary tracking-widest pl-2 border-l-2 border-sport-accent mb-2">
            Quarterfinals
          </div>
          <div className="flex flex-col gap-6">
            {quarterFinals.map((m, idx) => (
              <div 
                key={idx}
                onClick={handlePlayMatch}
                className="bg-sport-card/80 hover:bg-sport-card border border-white/5 hover:border-sport-accent/30 p-3.5 rounded-2xl cursor-pointer flex flex-col gap-2.5 transition-all duration-300 shadow-md group"
              >
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2 text-sport-secondary font-semibold group-hover:text-white transition-colors">
                    {renderFlag(m.homeFlag)}
                    <span>{m.home}</span>
                  </div>
                  <span className="text-white/40 font-mono">{m.homeScore}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2 text-white font-bold">
                    {renderFlag(m.awayFlag)}
                    <span>{m.away}</span>
                  </div>
                  <span className="text-sport-accent font-mono font-bold">{m.awayScore}</span>
                </div>
                <div className="border-t border-white/5 pt-2 mt-1 flex items-center justify-between text-[9px] font-bold text-sport-secondary">
                  <span className="flex items-center gap-1"><CheckCircle className="h-2.5 w-2.5 text-sport-secondary/50" /> FINISHED</span>
                  <span className="text-sport-accent/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                    <Play className="h-2 w-2 fill-current" /> STREAM REPLAY
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Column 2: SVG Connectors 1 */}
        <div className="col-span-1 h-full flex flex-col justify-around select-none pointer-events-none z-10">
          <svg className="w-full h-[180px] stroke-white/10" viewBox="0 0 100 180" fill="none">
            <path d="M 0 35 L 50 35 L 50 90 L 100 90" strokeWidth="1.5" />
            <path d="M 0 145 L 50 145 L 50 90 L 100 90" strokeWidth="1.5" />
            <circle cx="50" cy="90" r="3" fill="#00FF88" className="shadow-lg" />
          </svg>
          <svg className="w-full h-[180px] stroke-white/10" viewBox="0 0 100 180" fill="none">
            <path d="M 0 35 L 50 35 L 50 90 L 100 90" strokeWidth="1.5" />
            <path d="M 0 145 L 50 145 L 50 90 L 100 90" strokeWidth="1.5" />
            <circle cx="50" cy="90" r="3" fill="#00FF88" className="shadow-lg" />
          </svg>
        </div>

        {/* Column 3: Semifinals */}
        <div className="col-span-1 flex flex-col gap-24 z-10">
          <div className="text-[10px] font-extrabold uppercase text-sport-secondary tracking-widest pl-2 border-l-2 border-sport-accent mb-2">
            Semifinals
          </div>
          <div className="flex flex-col gap-20">
            {semiFinals.map((m, idx) => (
              <div 
                key={idx}
                onClick={handlePlayMatch}
                className="bg-sport-card/80 hover:bg-sport-card border border-white/5 hover:border-sport-accent/30 p-3.5 rounded-2xl cursor-pointer flex flex-col gap-2.5 transition-all duration-300 shadow-md group"
              >
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2 text-white font-bold">
                    {renderFlag(m.homeFlag)}
                    <span>{m.home}</span>
                  </div>
                  <span className="text-sport-accent font-mono font-bold">{m.homeScore}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2 text-sport-secondary font-semibold group-hover:text-white transition-colors">
                    {renderFlag(m.awayFlag)}
                    <span>{m.away}</span>
                  </div>
                  <span className="text-white/40 font-mono">{m.awayScore}</span>
                </div>
                <div className="border-t border-white/5 pt-2 mt-1 flex items-center justify-between text-[9px] font-bold text-sport-secondary">
                  <span className="flex items-center gap-1"><CheckCircle className="h-2.5 w-2.5 text-sport-secondary/50" /> FINISHED</span>
                  <span className="text-sport-accent/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                    <Play className="h-2 w-2 fill-current" /> STREAM REPLAY
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Column 4: SVG Connectors 2 */}
        <div className="col-span-1 h-full flex flex-col justify-center select-none pointer-events-none z-10">
          <svg className="w-full h-[320px] stroke-white/10" viewBox="0 0 100 320" fill="none">
            <path d="M 0 65 L 50 65 L 50 160 L 100 160" strokeWidth="1.5" />
            <path d="M 0 255 L 50 255 L 50 160 L 100 160" strokeWidth="1.5" />
            <circle cx="50" cy="160" r="3.5" fill="#FFD700" className="shadow-lg" />
          </svg>
        </div>

        {/* Column 5: Championship Final */}
        <div className="col-span-1 flex flex-col gap-12 z-10">
          <div className="text-[10px] font-extrabold uppercase text-yellow-400 tracking-widest pl-2 border-l-2 border-yellow-400 mb-2">
            Championship Final
          </div>
          <div 
            onClick={handlePlayMatch}
            className="bg-gradient-to-b from-[#0F1E36] to-[#0D1626] border-2 border-yellow-400/30 hover:border-yellow-400 p-5 rounded-3xl cursor-pointer flex flex-col gap-3.5 shadow-xl shadow-yellow-500/5 transition-all duration-300 group"
          >
            <div className="flex justify-between items-center text-sm">
              <div className="flex items-center gap-2.5 text-white font-black">
                {renderFlag(finalMatch.homeFlag)}
                <span>{finalMatch.home}</span>
              </div>
              <span className="text-yellow-400 font-mono font-black">{finalMatch.homeScore}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <div className="flex items-center gap-2.5 text-sport-secondary/70 font-bold group-hover:text-white transition-colors">
                {renderFlag(finalMatch.awayFlag)}
                <span>{finalMatch.away}</span>
              </div>
              <span className="text-white/40 font-mono font-semibold">{finalMatch.awayScore}</span>
            </div>
            <div className="border-t border-white/5 pt-3 mt-1 flex items-center justify-between text-[10px] font-extrabold text-yellow-400">
              <span className="flex items-center gap-1.5">🏆 CHAMPION: ARG</span>
              <span className="text-yellow-400 animate-pulse flex items-center gap-0.5">
                <Play className="h-2.5 w-2.5 fill-current" /> PLAY STREAM
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default TournamentBracket;
