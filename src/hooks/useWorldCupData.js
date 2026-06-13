import { useState, useEffect, useCallback, useRef } from 'react';
import fallbackMatches from '../data/matches.json';
import { formatToUserLocal, format24hTo12h } from '../utils/timeFormatter';

const GAMES_URL = '/api-games';
const TEAMS_URL = '/api-teams';
const DIRECT_GAMES_URL = 'https://worldcup26.ir/get/games';
const DIRECT_TEAMS_URL = 'https://worldcup26.ir/get/teams';
const POLL_INTERVAL_MS = 60_000; // refresh every 60 seconds

async function fetchJSON(proxyUrl, directUrl) {
  try {
    const res = await fetch(proxyUrl);
    if (!res.ok) throw new Error(`Proxy status ${res.status}`);
    return await res.json();
  } catch (e) {
    console.warn(`[useWorldCupData] Proxy fetch failed for ${proxyUrl}, falling back to direct URL:`, e.message);
    const res = await fetch(directUrl);
    if (!res.ok) throw new Error(`Direct status ${res.status}`);
    return await res.json();
  }
}

// Map team_id → team object for fast lookups
function buildTeamMap(teams) {
  const map = {};
  for (const t of teams) {
    map[t.id] = t;
  }
  return map;
}

// Derive a display status and minute from raw API fields
function deriveStatus(game) {
  if (game.finished === 'TRUE') {
    return { status: 'finished', minute: null, time: 'Finished' };
  }
  const elapsed = game.time_elapsed;
  if (!elapsed || elapsed === 'notstarted') {
    // Parse the local_date to a friendly time display
    const parts = game.local_date ? game.local_date.split(' ') : [];
    const timePart = parts[1] || '';
    return { status: 'upcoming', minute: null, time: timePart };
  }
  // Anything else (e.g. "45", "HT", "90+2") means the match is live
  const minuteLabel = isNaN(Number(elapsed)) ? elapsed : `${elapsed}'`;
  return { status: 'live', minute: minuteLabel, time: 'Live Now' };
}

// Normalize a raw API game + teamMap into our internal match shape
function normalizeGame(game, teamMap) {
  const home = teamMap[game.home_team_id] || null;
  const away = teamMap[game.away_team_id] || null;

  const homeTeam = home ? home.name_en : (game.home_team_name_en || game.home_team_label || 'TBD');
  const awayTeam = away ? away.name_en : (game.away_team_name_en || game.away_team_label || 'TBD');
  const homeFlag = home ? home.flag : null;
  const awayFlag = away ? away.flag : null;

  const score = `${game.home_score ?? 0} - ${game.away_score ?? 0}`;
  const { status, minute, time } = deriveStatus(game);

  // Determine a user-friendly group label
  const groupLabels = {
    R32: 'Round of 32',
    R16: 'Round of 16',
    QF: 'Quarter-Final',
    SF: 'Semi-Final',
    '3RD': 'Third Place',
    FINAL: 'Final',
  };
  const groupDisplay = groupLabels[game.group] || `Group ${game.group}`;

  // Format to user local timezone in 12-hour format
  const userLocal = formatToUserLocal(game.local_date, game.stadium_id);
  const kickoffTime = userLocal.jsDate ? userLocal.jsDate.getTime() : null;

  return {
    id: `wc26-${game.id}`,
    homeTeam,
    awayTeam,
    homeFlag,   // CDN URL or null
    awayFlag,   // CDN URL or null
    score,
    status,
    minute,
    time: status === 'upcoming' ? userLocal.time : time,
    date: userLocal.date,
    dateTime: userLocal.dateTime,
    kickoffTime,
    group: groupDisplay,
    type: game.type,
    localDate: game.local_date,
    stadiumId: game.stadium_id,
    broadcasters: [],  // API doesn't provide broadcaster info; keep empty
  };
}

// Build normalized fallback matches from static JSON (keeps app working offline)
function buildFallbackMatches() {
  return fallbackMatches.map((m, i) => {
    const timeFormatted = format24hTo12h(m.time);
    let dateVal = '';
    let timeVal = timeFormatted;
    let kickoffTime = null;

    try {
      const now = new Date();
      let matchDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      let rawTimeStr = m.time || '';
      let datePart = '';
      let timePart = '';
      
      if (rawTimeStr.includes(',')) {
        const parts = rawTimeStr.split(',');
        datePart = parts[0].trim(); // "Today" or "Tomorrow" or "Yesterday"
        timePart = parts[1].trim(); // "21:00"
      } else {
        timePart = rawTimeStr.trim();
      }
      
      if (datePart.toLowerCase() === 'tomorrow') {
        matchDate.setDate(matchDate.getDate() + 1);
      } else if (datePart.toLowerCase() === 'yesterday') {
        matchDate.setDate(matchDate.getDate() - 1);
      }
      
      const timeMatch = timePart.match(/(\d{1,2}):(\d{2})/);
      if (timeMatch) {
        const hours = parseInt(timeMatch[1], 10);
        const minutes = parseInt(timeMatch[2], 10);
        matchDate.setHours(hours, minutes, 0, 0);
        kickoffTime = matchDate.getTime();
      }
    } catch (e) {
      console.warn("Error parsing fallback kickoff time:", e);
    }

    if (m.time && m.time.includes(',')) {
      const parts = m.time.split(',');
      dateVal = parts[0].trim();
      timeVal = format24hTo12h(parts[1].trim());
    }

    return {
      ...m,
      id: m.id || `fallback-${i}`,
      time: timeVal,
      date: dateVal || (m.status === 'upcoming' ? 'Upcoming' : ''),
      dateTime: timeFormatted,
      kickoffTime,
    };
  });
}

export function useWorldCupData() {
  const [matches, setMatches] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [usingFallback, setUsingFallback] = useState(false);

  // Track previous matches for detecting live/goal transitions (for toast alerts)
  const prevMatchesRef = useRef([]);

  const fetchData = useCallback(async () => {
    try {
      const [gamesData, teamsData] = await Promise.all([
        fetchJSON(GAMES_URL, DIRECT_GAMES_URL),
        fetchJSON(TEAMS_URL, DIRECT_TEAMS_URL)
      ]);

      if (gamesData?.games && teamsData?.teams) {
        const teamMap = buildTeamMap(teamsData.teams);
        const normalized = gamesData.games.map(game => normalizeGame(game, teamMap));

        // Sort matches: live first, then upcoming, then finished
        normalized.sort((a, b) => {
          const statusOrder = { live: 0, upcoming: 1, finished: 2 };
          return statusOrder[a.status] - statusOrder[b.status];
        });

        setMatches(normalized);
        setTeams(teamsData.teams);
        setUsingFallback(false);
        setError(null);
      } else {
        throw new Error("Invalid API response format");
      }
    } catch (err) {
      console.warn('[useWorldCupData] Failed to fetch live data, using offline fallback:', err.message);
      try {
        const localMatches = buildFallbackMatches();
        setMatches(localMatches);
        setUsingFallback(true);
        setError(null);
      } catch (fallbackErr) {
        console.error('[useWorldCupData] Fallback parsing failed:', fallbackErr.message);
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Poll every 60 seconds for live score updates
  useEffect(() => {
    const interval = setInterval(fetchData, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Expose prev matches ref so App.jsx can detect score changes for toasts
  useEffect(() => {
    prevMatchesRef.current = matches;
  }, [matches]);

  return { matches, teams, loading, error, usingFallback, refetch: fetchData };
}
