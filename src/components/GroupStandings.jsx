import React from 'react';
import { motion } from 'framer-motion';
import { Shield, TrendingUp } from 'lucide-react';

const renderFlag = (flag) => {
  if (!flag) return <Shield className="h-3.5 w-3.5 text-sport-secondary/40" />;

  if (typeof flag === 'string' && flag.startsWith('http')) {
    return (
      <img
        src={flag}
        alt=""
        className="h-3.5 w-5 object-cover rounded-sm border border-white/10"
        onError={(e) => { e.target.style.display = 'none'; }}
      />
    );
  }

  // legacy emoji flag fallback
  return <span className="text-sm leading-none">{flag}</span>;
};

const GroupStandings = ({ matches = [] }) => {
  // 1. Initialize stats for all teams found in matches
  const teamStats = {};

  matches.forEach(m => {
    // Only count group stage matches for standings
    if (!m.group || !m.group.toLowerCase().includes('group')) return;

    const groupName = m.group; // e.g. "Group A"

    if (!teamStats[m.homeTeam]) {
      teamStats[m.homeTeam] = { name: m.homeTeam, flag: m.homeFlag, mp: 0, w: 0, d: 0, l: 0, gd: 0, pts: 0, group: groupName };
    }
    if (!teamStats[m.awayTeam]) {
      teamStats[m.awayTeam] = { name: m.awayTeam, flag: m.awayFlag, mp: 0, w: 0, d: 0, l: 0, gd: 0, pts: 0, group: groupName };
    }

    // Update flags in case they were missing in one entry
    if (m.homeFlag && !teamStats[m.homeTeam].flag) teamStats[m.homeTeam].flag = m.homeFlag;
    if (m.awayFlag && !teamStats[m.awayTeam].flag) teamStats[m.awayTeam].flag = m.awayFlag;

    // If match is finished or live, compute stats
    if ((m.status === 'finished' || m.status === 'live') && m.score) {
      const scores = m.score.split('-');
      if (scores.length === 2) {
        const homeScore = parseInt(scores[0].trim());
        const awayScore = parseInt(scores[1].trim());

        if (!isNaN(homeScore) && !isNaN(awayScore)) {
          teamStats[m.homeTeam].mp += 1;
          teamStats[m.awayTeam].mp += 1;

          const gd = homeScore - awayScore;
          teamStats[m.homeTeam].gd += gd;
          teamStats[m.awayTeam].gd -= gd;

          if (homeScore > awayScore) {
            teamStats[m.homeTeam].w += 1;
            teamStats[m.homeTeam].pts += 3;
            teamStats[m.awayTeam].l += 1;
          } else if (homeScore < awayScore) {
            teamStats[m.awayTeam].w += 1;
            teamStats[m.awayTeam].pts += 3;
            teamStats[m.homeTeam].l += 1;
          } else {
            teamStats[m.homeTeam].d += 1;
            teamStats[m.homeTeam].pts += 1;
            teamStats[m.awayTeam].d += 1;
            teamStats[m.awayTeam].pts += 1;
          }
        }
      }
    }
  });

  // 2. Group teams by their group name
  const groups = {};
  Object.values(teamStats).forEach(team => {
    if (!groups[team.group]) {
      groups[team.group] = [];
    }
    groups[team.group].push(team);
  });

  // 3. Sort teams in each group: PTS desc, GD desc, Name asc
  Object.keys(groups).forEach(groupName => {
    groups[groupName].sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts;
      if (b.gd !== a.gd) return b.gd - a.gd;
      return a.name.localeCompare(b.name);
    });
  });

  // Sort groups alphabetically (Group A, Group B, etc.)
  const sortedGroupNames = Object.keys(groups).sort();

  if (sortedGroupNames.length === 0) {
    return (
      <div className="text-center py-12 bg-sport-card/30 border border-white/5 rounded-2xl">
        <TrendingUp className="h-10 w-10 text-sport-secondary/40 mx-auto mb-3" />
        <h4 className="font-bold text-white">Standings Not Available</h4>
        <p className="text-xs text-sport-secondary mt-1">Group stage matches have not started or are not loaded.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full mt-2">
      {sortedGroupNames.map((groupName, gIdx) => (
        <motion.div
          key={groupName}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: gIdx * 0.05 }}
          className="bg-sport-card/40 border border-white/5 rounded-2xl p-4 backdrop-blur-md hover:border-sport-accent/25 transition-all duration-300 flex flex-col justify-between"
        >
          <div>
            {/* Group Title */}
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/5">
              <h3 className="text-sm font-extrabold text-white tracking-wider uppercase">{groupName}</h3>
              <span className="text-[9px] font-bold text-sport-accent bg-sport-accent/10 border border-sport-accent/20 px-2 py-0.5 rounded-full uppercase tracking-widest">
                Stage 1
              </span>
            </div>

            {/* Standings Table */}
            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="text-[10px] text-sport-secondary uppercase tracking-wider font-extrabold border-b border-white/5">
                    <th className="py-2 pl-1">#</th>
                    <th className="py-2">Team</th>
                    <th className="py-2 text-center">MP</th>
                    <th className="py-2 text-center">W</th>
                    <th className="py-2 text-center">GD</th>
                    <th className="py-2 text-right pr-1">PTS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {groups[groupName].map((team, idx) => {
                    const isTopTwo = idx < 2; // Qualifiers
                    return (
                      <tr
                        key={team.name}
                        className={`hover:bg-white/5 transition-colors ${
                          isTopTwo ? 'text-white font-medium' : 'text-sport-secondary/70'
                        }`}
                      >
                        <td className="py-2.5 pl-1">
                          <span
                            className={`inline-flex items-center justify-center h-5 w-5 rounded-md text-[10px] font-black ${
                              isTopTwo
                                ? 'bg-sport-accent/15 text-sport-accent border border-sport-accent/20'
                                : 'bg-white/5 text-sport-secondary border border-white/5'
                            }`}
                          >
                            {idx + 1}
                          </span>
                        </td>
                        <td className="py-2.5">
                          <div className="flex items-center gap-2 font-bold max-w-[120px] truncate">
                            {renderFlag(team.flag)}
                            <span className="truncate">{team.name}</span>
                          </div>
                        </td>
                        <td className="py-2.5 text-center font-semibold text-white/90">{team.mp}</td>
                        <td className="py-2.5 text-center">{team.w}</td>
                        <td className={`py-2.5 text-center font-mono font-semibold ${
                          team.gd > 0 ? 'text-emerald-400' : team.gd < 0 ? 'text-red-400' : 'text-sport-secondary/50'
                        }`}>
                          {team.gd > 0 ? `+${team.gd}` : team.gd}
                        </td>
                        <td className="py-2.5 text-right pr-1 font-extrabold text-white">{team.pts}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-4 pt-2.5 border-t border-white/5 flex items-center justify-between text-[9px] text-sport-secondary font-bold uppercase tracking-wider">
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-sport-accent inline-block"></span>
              Top 2 Advance to KO
            </span>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export default GroupStandings;
