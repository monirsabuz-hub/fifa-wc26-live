import React from 'react';
import { motion } from 'framer-motion';
import { Star, Globe, Play, Tv } from 'lucide-react';
import { COUNTRY_MAP } from '../utils/countryMap';

const getFlagEmoji = (countryCode) => {
  if (!countryCode || countryCode.length !== 2) return '🏳️';
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  try {
    return String.fromCodePoint(...codePoints);
  } catch (e) {
    return '🏳️';
  }
};

const getCountryName = (countryCode) => {
  if (!countryCode) return 'Global';
  return COUNTRY_MAP[countryCode.toLowerCase()]?.name || countryCode.toUpperCase();
};

const PremiumCard = ({ channel, isActive, onSelect, isFavorite, onToggleFavorite, isFeatured }) => {
  const { id, name, country, languages, categories, logo, isWorldCupBroadcaster, latency } = channel;

  const [logoUrl, setLogoUrl] = React.useState(logo && logo.trim().length > 0 ? logo : null);
  
  const handleLogoError = () => {
    setLogoUrl(null);
  };

  const handleFavoriteClick = (e) => {
    e.stopPropagation();
    onToggleFavorite(id);
  };

  return (
    <motion.div
      whileHover={{ y: -6, scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      onClick={() => onSelect(channel)}
      className={`glass-panel glass-panel-hover rounded-xl p-3 flex flex-col gap-3 cursor-pointer relative overflow-hidden transition-all duration-300 ${
        isActive ? 'ring-2 ring-sport-accent border-transparent bg-sport-card/90 shadow-lg shadow-sport-accent/10' : ''
      } ${isFeatured ? 'col-span-1 md:col-span-2' : 'col-span-1'}`}
    >
      {/* Thumbnail / Logo Area */}
      <div 
        className={`relative w-full rounded-lg overflow-hidden bg-gradient-to-br from-black/60 to-sport-card border border-white/5 flex items-center justify-center p-4 group ${
          isFeatured ? 'aspect-[21/9]' : 'aspect-video'
        }`}
      >
        {/* Stadium line markers overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.01)_0%,transparent_100%)]" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
        
        {/* Large Centered Logo */}
        <div className="w-full h-full flex items-center justify-center z-10 transition-transform duration-500 group-hover:scale-110">
          {logoUrl ? (
            <img 
              src={logoUrl} 
              alt={`${name} Logo`} 
              className="object-contain max-h-[70%] max-w-[70%] filter drop-shadow-[0_4px_10px_rgba(0,0,0,0.6)]"
              onError={handleLogoError}
            />
          ) : (
            <Tv className="h-10 w-10 text-sport-secondary/20" />
          )}
        </div>

        {/* Dynamic Center Play Button Overlay */}
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center z-20">
          <motion.div
            initial={{ scale: 0.8 }}
            whileHover={{ scale: 1.1 }}
            className="h-12 w-12 rounded-full bg-sport-accent flex items-center justify-center shadow-lg shadow-sport-accent/20 cursor-pointer"
          >
            <Play className="h-5 w-5 fill-black text-black ml-0.5" />
          </motion.div>
        </div>

        {/* Floating Bookmark Star Button */}
        <button 
          onClick={handleFavoriteClick}
          className="absolute top-2.5 right-2.5 bg-black/60 hover:bg-black/90 hover:scale-110 border border-white/5 hover:border-white/10 rounded-full h-7 w-7 flex items-center justify-center z-30 text-sport-secondary hover:text-yellow-400 transition-all duration-300"
          title={isFavorite ? "Remove Bookmark" : "Bookmark Channel"}
        >
          <Star className={`h-3.5 w-3.5 ${isFavorite ? 'fill-yellow-400 text-yellow-400' : ''}`} />
        </button>

        {/* World Cup Broadcaster Badge overlay */}
        {isWorldCupBroadcaster && (
          <span className="absolute bottom-2.5 left-2.5 bg-yellow-400/90 text-black font-extrabold text-[8px] uppercase tracking-wider px-2 py-0.5 rounded z-20 shadow-md">
            World Cup
          </span>
        )}
      </div>

      {/* Channel details */}
      <div className="flex flex-col gap-1 z-10 px-1">
        <h4 className="text-sm font-bold text-white tracking-wide truncate group-hover:text-sport-accent transition-colors" title={name}>
          {name}
        </h4>
        
        <div className="flex items-center gap-2 text-[10px] font-bold text-sport-secondary">
          <Globe className="h-3 w-3 text-sport-secondary/60" />
          <span className="uppercase flex items-center gap-1.5 min-w-0">
            <img 
              src={`https://flagcdn.com/w40/${country.toLowerCase()}.png`} 
              alt="" 
              className="h-2.5 w-3.5 object-cover rounded-sm flex-shrink-0 border border-white/10"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'inline';
              }}
            />
            <span className="hidden text-xs">🏳️</span>
            <span className="truncate max-w-[100px]">{getCountryName(country)}</span>
          </span>
          <span>•</span>
          <span className="uppercase">{languages && languages.length > 0 ? languages[0] : 'ENG'}</span>
        </div>
        
        <div className="flex gap-1.5 mt-1.5">
          <span className="bg-white/5 border border-white/5 text-sport-secondary text-[9px] font-bold px-2 py-0.5 rounded uppercase">
            {categories && categories.length > 0 ? categories[0] : 'Sports'}
          </span>
          <span className="bg-sport-accent/5 border border-sport-accent/10 text-sport-accent text-[9px] font-bold px-2 py-0.5 rounded uppercase">
            HD Stream
          </span>
        </div>
      </div>

      {/* Latency & Status Footer */}
      <div className="mt-auto pt-2 border-t border-white/5 flex justify-between items-center text-[10px] font-bold text-sport-secondary px-1">
        <span className="flex items-center gap-1.5 text-sport-accent/90">
          <span className="h-1.5 w-1.5 rounded-full bg-sport-accent animate-pulse-accent" />
          ONLINE
        </span>
        <span>
          {latency}ms
        </span>
      </div>
    </motion.div>
  );
};

export default PremiumCard;
