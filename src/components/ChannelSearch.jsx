import React from 'react';
import { Search, X } from 'lucide-react';

const ChannelSearch = ({ searchQuery, setSearchQuery, inputRef }) => {
  return (
    <div className="relative w-full">
      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-sport-secondary" />
      <input
        ref={inputRef}
        type="text"
        placeholder="Search channel or country..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="w-full bg-white/5 border border-white/5 hover:border-white/10 focus:border-sport-accent focus:ring-1 focus:ring-sport-accent outline-none rounded-xl pl-10 pr-10 py-2.5 text-xs font-semibold text-white placeholder-sport-secondary transition-all duration-300 shadow-inner"
      />
      {searchQuery && (
        <button
          onClick={() => setSearchQuery('')}
          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sport-secondary hover:text-white transition-colors cursor-pointer"
          title="Clear search"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};

export default ChannelSearch;
