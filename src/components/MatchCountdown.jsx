import React, { useState, useEffect } from 'react';

/**
 * Renders a dynamic, live countdown to match kickoff.
 * @param {object} props
 * @param {number} props.kickoffTime - UTC timestamp in milliseconds.
 * @param {string} [props.className] - CSS classes for styling.
 */
export function MatchCountdown({ kickoffTime, className = "" }) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    if (!kickoffTime) {
      setTimeLeft('');
      return;
    }

    const updateCountdown = () => {
      const now = Date.now();
      const diff = kickoffTime - now;

      if (diff <= 0) {
        setTimeLeft('Kickoff imminent');
        return;
      }

      const seconds = Math.floor(diff / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);

      let text = '';
      if (days > 0) {
        const remainingHours = hours % 24;
        text = `Kickoff in ${days}d ${remainingHours}h`;
      } else if (hours > 0) {
        const remainingMinutes = minutes % 60;
        text = `Kickoff in ${hours}h ${remainingMinutes}m`;
      } else {
        text = `Kickoff in ${minutes}m`;
      }
      setTimeLeft(text);
    };

    updateCountdown();
    // Update every 30 seconds for accuracy
    const interval = setInterval(updateCountdown, 30000);

    return () => clearInterval(interval);
  }, [kickoffTime]);

  if (!kickoffTime || !timeLeft) return null;

  return (
    <span className={className}>
      {timeLeft}
    </span>
  );
}

export default MatchCountdown;
