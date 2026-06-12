import React from 'react';
import { Star, Tv, Globe, Play } from 'lucide-react';

const ChannelCard = ({ channel, isActive, onSelect, isFavorite, onToggleFavorite, isFeatured }) => {
  const { id, name, country, languages, categories, logo, isWorldCupBroadcaster, latency } = channel;

  const handleFavoriteClick = (e) => {
    e.stopPropagation();
    onToggleFavorite(id);
  };

  const getLogo = () => {
    if (logo && logo.trim().length > 0) return logo;
    return `https://iptv-org.github.io/images/languages/globe.png`;
  };

  return (
    <div 
      className={`channel-card ${isActive ? 'active' : ''} ${isFeatured ? 'featured' : ''}`}
      onClick={() => onSelect(channel)}
    >
      {/* Video Stream Mock Thumbnail */}
      <div 
        className="channel-thumbnail-wrapper" 
        style={{ 
          background: 'var(--bg-tertiary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}
      >
        {/* Stadium line markers overlay */}
        <div className="thumbnail-field-lines" />
        
        {/* Large Centered Logo */}
        <div className="channel-logo-centered">
          <img 
            src={getLogo()} 
            alt={`${name} Logo`} 
            className="channel-thumbnail-logo"
            onError={(e) => {
              e.target.onerror = null;
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
          />
          <div style={{ display: 'none', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', color: 'var(--text-muted)' }}>
            <Tv style={{ width: '38px', height: '38px' }} />
          </div>
        </div>

        {/* Dynamic Center Play Button Overlay */}
        <div className="play-button-overlay">
          <div className="play-icon-circle">
            <Play className="play-icon-svg" />
          </div>
        </div>

        {/* Floating Bookmark Star Button */}
        <button 
          className={`channel-fav-btn overlaid ${isFavorite ? 'active' : ''}`}
          onClick={handleFavoriteClick}
          title={isFavorite ? "Remove from Bookmarks" : "Add to Bookmarks"}
        >
          <Star style={{ width: '14px', height: '14px', fill: isFavorite ? 'var(--gold)' : 'none' }} />
        </button>
      </div>

      {/* Channel metadata details */}
      <div className="channel-details">
        <h4 className="channel-name" title={name}>{name}</h4>
        
        <div className="channel-meta-row">
          <Globe style={{ width: '12px', height: '12px', color: 'var(--text-muted)' }} />
          <span>{country ? country.toUpperCase() : 'Global'}</span>
          <span style={{ color: 'var(--text-muted)' }}>•</span>
          <span>{languages && languages.length > 0 ? languages[0].toUpperCase() : 'ENG'}</span>
        </div>
        
        <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
          {isWorldCupBroadcaster && (
            <span className="channel-badge wc">World Cup</span>
          )}
          <span className="channel-badge">
            {categories && categories.length > 0 ? categories[0] : 'Sports'}
          </span>
        </div>
      </div>

      <div className="channel-card-footer">
        <span className="channel-status">
          <span className="status-dot" />
          Online
        </span>
        <span className="channel-latency">
          {latency}ms
        </span>
      </div>
    </div>
  );
};

export default ChannelCard;
