import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Volume2, VolumeX, Maximize2, Activity, RefreshCw, Info, X, ShieldAlert, Tv, Settings } from 'lucide-react';

const VideoPlayer = ({ channel, onClose, isTheaterMode, onToggleTheater }) => {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const shakaRef = useRef(null);

  const loadShakaPlayer = () => {
    return new Promise((resolve, reject) => {
      if (window.shaka) {
        resolve(window.shaka);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/shaka-player/4.3.5/shaka-player.compiled.js';
      script.onload = () => resolve(window.shaka);
      script.onerror = (e) => reject(new Error('Failed to load Shaka Player: ' + e.message));
      document.head.appendChild(script);
    });
  };

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [showStats, setShowStats] = useState(false);
  const [stats, setStats] = useState({
    resolution: 'N/A',
    bufferLength: '0.0s',
    latency: '0.0s',
    bitrate: 'N/A',
    streamType: 'HLS'
  });
  const [errorMsg, setErrorMsg] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [logoUrl, setLogoUrl] = useState(null);
  const [levels, setLevels] = useState([]);
  const [currentLevelIndex, setCurrentLevelIndex] = useState(-1);
  const [activeLevelIndex, setActiveLevelIndex] = useState(-1);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [isPipSupported, setIsPipSupported] = useState(false);

  const [customStreamUrl, setCustomStreamUrl] = useState(null);
  const [showCorsHelper, setShowCorsHelper] = useState(false);
  const [copied, setCopied] = useState(false);
  const [useProxy, setUseProxy] = useState(true);

  useEffect(() => {
    if (channel) {
      setLogoUrl(channel.logo && channel.logo.trim().length > 0 ? channel.logo : null);
      setUseProxy(true);
    }
    setCustomStreamUrl(null);
    setShowCorsHelper(false);
    setLevels([]);
    setCurrentLevelIndex(-1);
    setActiveLevelIndex(-1);
    setShowQualityMenu(false);
  }, [channel]);

  useEffect(() => {
    const closeMenu = () => setShowQualityMenu(false);
    document.addEventListener('click', closeMenu);
    return () => document.removeEventListener('click', closeMenu);
  }, []);

  useEffect(() => {
    if (typeof document !== 'undefined' && 'pictureInPictureEnabled' in document) {
      setIsPipSupported(document.pictureInPictureEnabled);
    }
  }, []);

  const handleLogoError = () => {
    setLogoUrl(null);
  };

  useEffect(() => {
    const video = videoRef.current;
    if (channel?.isIframe) {
      setIsLoading(false);
      setErrorMsg(null);
      return;
    }
    if (!video || !channel) return;

    setErrorMsg(null);
    setIsPlaying(false);
    setIsLoading(true);

    let streamUrl = customStreamUrl || channel.streamUrl;
    const shouldProxy = useProxy && !channel.bypassProxy;
    if (shouldProxy && streamUrl && streamUrl.startsWith('http')) {
      if (streamUrl.startsWith('https://')) {
        streamUrl = `/cors-proxy/https/${streamUrl.slice(8)}`;
      } else if (streamUrl.startsWith('http://')) {
        streamUrl = `/cors-proxy/http/${streamUrl.slice(7)}`;
      }
    }

    let loadingTimeout = setTimeout(() => {
      if (video && (video.paused || video.ended) && !video.currentTime) {
        setIsLoading(false);
        setShowCorsHelper(true);
        setErrorMsg('Playback blocked or stream is offline. This public feed is likely restricted by CORS policies or geoblocking.');
      }
    }, 8500); // 8.5 seconds timeout

    const handleLoadStart = () => {
      setIsLoading(true);
      setErrorMsg(null);
    };
    const handleCanPlay = () => {
      setIsLoading(false);
      setShowCorsHelper(false);
      clearTimeout(loadingTimeout);
    };
    const handlePlaying = () => {
      setIsLoading(false);
      setShowCorsHelper(false);
      clearTimeout(loadingTimeout);
    };
    const handleWaiting = () => setIsLoading(true);
    const handleStalled = () => setIsLoading(true);
    const handleError = () => {
      setIsLoading(false);
      setShowCorsHelper(true);
      clearTimeout(loadingTimeout);
      setErrorMsg('Failed to establish stream connection.');
    };

    video.addEventListener('loadstart', handleLoadStart);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('playing', handlePlaying);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('stalled', handleStalled);
    video.addEventListener('error', handleError);

    const cleanUpListeners = () => {
      video.removeEventListener('loadstart', handleLoadStart);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('playing', handlePlaying);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('stalled', handleStalled);
      video.removeEventListener('error', handleError);
    };

    // Clean up previous HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    // Clean up previous Shaka instance
    if (shakaRef.current) {
      shakaRef.current.destroy();
      shakaRef.current = null;
    }

    const isDash = streamUrl && (streamUrl.includes('.mpd') || channel.drm);

    if (isDash) {
      let shakaPlayerInstance = null;
      let interval = null;

      loadShakaPlayer()
        .then((shaka) => {
          if (!videoRef.current) return;

          shaka.polyfill.installAll();

          if (!shaka.Player.isBrowserSupported()) {
            setErrorMsg('DASH DRM playback is not supported by this browser.');
            setIsLoading(false);
            return;
          }

          const player = new shaka.Player(video);
          shakaRef.current = player;
          shakaPlayerInstance = player;

          // Configure ClearKey DRM if present
          if (channel.drm && channel.drm.clearKeys) {
            player.configure({
              drm: {
                clearKeys: channel.drm.clearKeys,
                keySystemsMapping: {
                  'com.widevine.alpha': 'org.w3.clearkey'
                }
              },
              manifest: {
                dash: {
                  ignoreDrmInfo: true
                }
              }
            });
          }

          player.addEventListener('error', (event) => {
            console.error('Shaka player error:', event.detail);
            if (event.detail && event.detail.severity === 2) {
              setIsLoading(false);
              setShowCorsHelper(true);
              clearTimeout(loadingTimeout);
              setErrorMsg('Playback error: ' + (event.detail.code || 'DRM decryption or network failure.'));
            }
          });

          player.addEventListener('adaptation', () => {
            const tracks = player.getVariantTracks();
            const activeTrack = tracks.find(t => t.active);
            if (activeTrack) {
              const matchingLevel = levels.find(l => l.index === activeTrack.id);
              if (matchingLevel) {
                setCurrentLevelIndex(matchingLevel.index);
              }
            }
          });

          player.load(streamUrl)
            .then(() => {
              setIsLoading(false);
              setShowCorsHelper(false);
              clearTimeout(loadingTimeout);

              const tracks = player.getVariantTracks();
              const uniqueHeights = new Set();
              const mappedLevels = [];

              tracks.forEach(t => {
                if (t.height && !uniqueHeights.has(t.height)) {
                  uniqueHeights.add(t.height);
                  mappedLevels.push({
                    index: t.id,
                    label: `${t.height}p`
                  });
                }
              });

              mappedLevels.sort((a, b) => {
                const hA = parseInt(a.label);
                const hB = parseInt(b.label);
                return hB - hA;
              });

              setLevels([{ index: -1, label: 'Auto' }, ...mappedLevels]);

              video.play()
                .then(() => setIsPlaying(true))
                .catch((e) => {
                  console.log("Play blocked:", e);
                  setIsPlaying(false);
                });
            })
            .catch((err) => {
              console.error('Shaka load error:', err);
              setIsLoading(false);
              setShowCorsHelper(true);
              clearTimeout(loadingTimeout);
              setErrorMsg('Failed to load DASH stream. Feeds are likely offline or blocked by CORS.');
            });
        })
        .catch((err) => {
          console.error(err);
          setIsLoading(false);
          setErrorMsg('Failed to load Shaka Player engine.');
        });

      interval = setInterval(() => {
        if (!shakaPlayerInstance || !video) return;
        try {
          const statsInfo = shakaPlayerInstance.getStats();

          let bufferLen = 0;
          const currentPlayTime = video.currentTime;
          if (video.buffered.length > 0) {
            for (let i = 0; i < video.buffered.length; i++) {
              if (video.buffered.start(i) <= currentPlayTime && video.buffered.end(i) >= currentPlayTime) {
                bufferLen = video.buffered.end(i) - currentPlayTime;
                break;
              }
            }
          }

          const width = statsInfo.width || video.videoWidth;
          const height = statsInfo.height || video.videoHeight;
          const bitrateVal = statsInfo.streamBandwidth || 0;
          const bitrate = bitrateVal ? `${(bitrateVal / 1000000).toFixed(2)} Mbps` : 'N/A';

          setStats({
            resolution: `${width}x${height}`,
            bufferLength: `${bufferLen.toFixed(1)}s`,
            latency: 'N/A',
            bitrate,
            streamType: 'Shaka Player DASH'
          });
        } catch (e) {
          // stats might not be ready
        }
      }, 1000);

      return () => {
        cleanUpListeners();
        clearInterval(interval);
        clearTimeout(loadingTimeout);
        if (shakaRef.current) {
          shakaRef.current.destroy();
          shakaRef.current = null;
        }
      };
    } else if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 30,
        maxBufferLength: 20,            // Limit buffer size to avoid loading too many chunks
        maxMaxBufferLength: 40,
        maxBufferSize: 30 * 1000 * 1000, // 30MB max buffer size to save memory and avoid stalls
        liveSyncDurationCount: 4,       // Buffer 4 segments before starting (improves stability/reduces buffering)
        liveMaxLatencyDurationCount: 10, // Max buffer lag
        capLevelToPlayerSize: true,     // Cap quality based on the player size (massive bandwidth savings)
        abrBandwidthFactor: 0.85,       // Safer estimate to avoid buffer stalls from aggressive up-switches
        abrBandwidthUpFactor: 0.70,     // Be conservative about upgrading quality
        stretchShortVideoTrack: true,   // Stretch short video segments to sync with audio
        maxFragLookUpTolerance: 0.25,   // Higher lookup tolerance for fragment gaps
      });
      hlsRef.current = hls;

      hls.loadSource(streamUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (hls.levels && hls.levels.length > 0) {
          const mappedLevels = hls.levels.map((level, idx) => ({
            index: idx,
            label: level.height ? `${level.height}p` : `Level ${idx + 1}`
          }));
          mappedLevels.sort((a, b) => b.index - a.index);
          setLevels([{ index: -1, label: 'Auto' }, ...mappedLevels]);
        }

        video.play()
          .then(() => setIsPlaying(true))
          .catch((e) => {
            console.log("Auto-play blocked, waiting for user interaction:", e);
            setIsPlaying(false);
          });
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
        setCurrentLevelIndex(data.level);
      });

      hls.on(Hls.Events.LEVEL_LOADED, (event, data) => {
        if (hls.levels && hls.levels.length > 0) {
          const mappedLevels = hls.levels.map((level, idx) => {
            const height = level.height || (idx === data.level ? video.videoHeight : 0);
            return {
              index: idx,
              label: height ? `${height}p` : `Level ${idx + 1}`
            };
          });
          mappedLevels.sort((a, b) => b.index - a.index);
          setLevels([{ index: -1, label: 'Auto' }, ...mappedLevels]);
        }
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error('HLS error:', data);
        
        if (data.details === Hls.ErrorDetails.MANIFEST_LOAD_ERROR || 
            data.details === Hls.ErrorDetails.MANIFEST_LOAD_TIMEOUT ||
            data.details === Hls.ErrorDetails.LEVEL_LOAD_ERROR) {
          setIsLoading(false);
          setShowCorsHelper(true);
          clearTimeout(loadingTimeout);
          setErrorMsg('CORS Restrictions or Stream Server Offline. This stream is blocked from web playback by the broadcaster.');
        }

        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.log('Fatal network error, trying to recover...');
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.log('Fatal media error, trying to recover...');
              hls.recoverMediaError();
              break;
            default:
              console.log('Fatal error, reloading stream...');
              setIsLoading(false);
              clearTimeout(loadingTimeout);
              setErrorMsg('Stream connection failed.');
              break;
          }
        }
      });

      // Track live statistics
      const interval = setInterval(() => {
        if (hls.levels && hls.currentLevel !== -1) {
          const currentLevel = hls.levels[hls.currentLevel];
          if (currentLevel) {
            const width = currentLevel.width || video.videoWidth;
            const height = currentLevel.height || video.videoHeight;
            const bitrate = currentLevel.bitrate ? `${(currentLevel.bitrate / 1000000).toFixed(2)} Mbps` : 'N/A';
            
            let bufferLen = 0;
            if (video.buffered.length > 0) {
              const currentPlayTime = video.currentTime;
              for (let i = 0; i < video.buffered.length; i++) {
                if (video.buffered.start(i) <= currentPlayTime && video.buffered.end(i) >= currentPlayTime) {
                  bufferLen = video.buffered.end(i) - currentPlayTime;
                  break;
                }
              }
            }

            setStats({
              resolution: `${width}x${height}`,
              bufferLength: `${bufferLen.toFixed(1)}s`,
              latency: hls.latency ? `${hls.latency.toFixed(1)}s` : 'N/A',
              bitrate,
              streamType: 'HLS.js Live'
            });
          }
        } else {
          // Native fallback values
          setStats({
            resolution: `${video.videoWidth}x${video.videoHeight}` || 'Detecting...',
            bufferLength: 'N/A',
            latency: 'N/A',
            bitrate: 'N/A',
            streamType: 'HTML5 Native'
          });
        }
      }, 1000);

      return () => {
        cleanUpListeners();
        clearInterval(interval);
        clearTimeout(loadingTimeout);
        hls.destroy();
        hlsRef.current = null;
      };
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native support (Safari/iOS)
      video.src = streamUrl;
      video.addEventListener('loadedmetadata', () => {
        video.play()
          .then(() => setIsPlaying(true))
          .catch((e) => console.log(e));
      });

      const interval = setInterval(() => {
        setStats({
          resolution: `${video.videoWidth}x${video.videoHeight}`,
          bufferLength: 'N/A',
          latency: 'N/A',
          bitrate: 'N/A',
          streamType: 'Apple Native HLS'
        });
      }, 2000);

      return () => {
        cleanUpListeners();
        clearTimeout(loadingTimeout);
        clearInterval(interval);
      };
    } else {
      setErrorMsg('HLS playback is not supported in this browser.');
      setIsLoading(false);
      return () => {
        cleanUpListeners();
      };
    }
  }, [channel, customStreamUrl, useProxy]);

  // Sync video element states
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
      videoRef.current.volume = volume;
    }
  }, [isMuted, volume]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
    } else {
      video.play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const handleVolumeChange = (e) => {
    const vol = parseFloat(e.target.value);
    setVolume(vol);
    setIsMuted(vol === 0);
  };

  const togglePip = async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await video.requestPictureInPicture();
      }
    } catch (e) {
      console.error("Failed to toggle PiP mode:", e);
    }
  };

  const toggleFullscreen = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.requestFullscreen) {
      video.requestFullscreen();
    } else if (video.webkitRequestFullscreen) {
      video.webkitRequestFullscreen();
    } else if (video.msRequestFullscreen) {
      video.msRequestFullscreen();
    }
  };

  const reloadStream = () => {
    if (hlsRef.current && channel) {
      setErrorMsg('Reloading stream...');
      let url = channel.streamUrl;
      const shouldProxy = useProxy && !channel.bypassProxy;
      if (shouldProxy && url && url.startsWith('http')) {
        if (url.startsWith('https://')) {
          url = `/cors-proxy/https/${url.slice(8)}`;
        } else if (url.startsWith('http://')) {
          url = `/cors-proxy/http/${url.slice(7)}`;
        }
      }
      hlsRef.current.loadSource(url);
      hlsRef.current.startLoad();
      setTimeout(() => setErrorMsg(null), 1500);
    } else if (shakaRef.current && channel) {
      setErrorMsg('Reloading stream...');
      let url = channel.streamUrl;
      const shouldProxy = useProxy && !channel.bypassProxy;
      if (shouldProxy && url && url.startsWith('http')) {
        if (url.startsWith('https://')) {
          url = `/cors-proxy/https/${url.slice(8)}`;
        } else if (url.startsWith('http://')) {
          url = `/cors-proxy/http/${url.slice(7)}`;
        }
      }
      setIsLoading(true);
      shakaRef.current.load(url)
        .then(() => {
          setIsLoading(false);
          setErrorMsg(null);
        })
        .catch((err) => {
          console.error(err);
          setIsLoading(false);
          setErrorMsg('Failed to reload stream.');
        });
    }
  };

  const getCurrentQualityLabel = () => {
    if (activeLevelIndex === -1) {
      if (currentLevelIndex !== -1 && levels.length > 0) {
        const currentLvl = levels.find(l => l.index === currentLevelIndex);
        return `Auto (${currentLvl ? currentLvl.label : '...'})`;
      }
      return 'Auto';
    }
    const currentLvl = levels.find(l => l.index === activeLevelIndex);
    return currentLvl ? currentLvl.label : 'Auto';
  };

  const handleQualityChange = (index) => {
    if (hlsRef.current) {
      hlsRef.current.currentLevel = index;
      setActiveLevelIndex(index);
      setShowQualityMenu(false);
    } else if (shakaRef.current) {
      if (index === -1) {
        shakaRef.current.configure({ abr: { enabled: true } });
      } else {
        shakaRef.current.configure({ abr: { enabled: false } });
        const tracks = shakaRef.current.getVariantTracks();
        const selectedTrack = tracks.find(t => t.id === index);
        if (selectedTrack) {
          shakaRef.current.selectVariantTrack(selectedTrack, true);
        }
      }
      setActiveLevelIndex(index);
      setShowQualityMenu(false);
    }
  };

  if (!channel) {
    return (
      <div className="w-full aspect-video rounded-2xl bg-sport-card border border-white/5 flex flex-col items-center justify-center p-8 shadow-2xl relative overflow-hidden">
        <div className="stadium-grid opacity-10 pointer-events-none" />
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="flex flex-col items-center text-center"
        >
          <div className="h-16 w-16 rounded-full bg-white/5 border border-white/5 flex items-center justify-center text-sport-secondary/40 mb-4 shadow-inner">
            <Activity className="h-7 w-7 text-sport-secondary" />
          </div>
          <h3 className="text-lg font-bold text-white tracking-wide">Select a Channel to Stream</h3>
          <p className="text-xs text-sport-secondary max-w-sm mt-2">
            Pick from World Cup feeds, trending sports matches, or search the directory below to tune in live.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-4">
      {/* Player Header */}
      <div className="flex justify-between items-center bg-sport-card/40 border border-white/5 px-4 py-3 rounded-xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-white/5 border border-white/5 p-1.5 flex items-center justify-center">
            {logoUrl ? (
              <img 
                src={logoUrl} 
                alt={channel.name} 
                className="max-h-full max-w-full object-contain"
                onError={handleLogoError}
              />
            ) : (
              <Tv className="h-4.5 w-4.5 text-white/20" />
            )}
          </div>
          <div>
            <h3 className="text-sm font-bold text-white leading-none tracking-wide">{channel.name}</h3>
            <span className="text-[10px] font-bold text-sport-secondary uppercase tracking-wider mt-1 block">
              {channel.country ? channel.country : 'GLOBAL'} • {channel.languages?.[0]?.toUpperCase() || 'ENG'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!channel?.isIframe && (
            <>
              {/* CORS Proxy Toggle */}
              <button 
                onClick={() => {
                  setUseProxy(prev => !prev);
                  setErrorMsg(null);
                  setIsLoading(true);
                }} 
                className={`text-[9px] font-extrabold uppercase tracking-widest px-2.5 py-2 rounded-lg border transition-all cursor-pointer ${
                  useProxy
                    ? 'bg-sport-accent/10 border-sport-accent/20 text-sport-accent'
                    : 'bg-white/5 border-white/5 text-sport-secondary hover:text-white hover:border-white/10'
                }`}
                title={useProxy ? "CORS Proxy is ON. Click to disable if stream is geoblocked locally." : "CORS Proxy is OFF. Click to enable if stream fails to play."}
              >
                Proxy: {useProxy ? 'ON' : 'OFF'}
              </button>

              <button 
                onClick={() => setShowStats(!showStats)} 
                className={`p-2 rounded-lg border transition-all ${
                  showStats ? 'bg-sport-accent/10 border-sport-accent/20 text-sport-accent' : 'bg-white/5 border-white/5 text-sport-secondary hover:text-white'
                }`}
                title="Toggle Stream Diagnostics"
              >
                <Activity className="h-4 w-4" />
              </button>
              <button 
                onClick={reloadStream} 
                className="p-2 rounded-lg bg-white/5 border border-white/5 text-sport-secondary hover:text-white transition-all"
                title="Reload Feed"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </>
          )}
          {onClose && (
            <button 
              onClick={onClose} 
              className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-black transition-all ml-1"
              title="Close Player"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Screen Player */}
      <div className="relative w-full aspect-video rounded-2xl bg-black overflow-hidden border border-white/5 shadow-2xl group">
        {channel?.isIframe ? (
          <iframe
            src={channel.streamUrl}
            className="w-full h-full border-0"
            allowFullScreen
            scrolling="no"
            allow="autoplay; fullscreen"
          />
        ) : (
          <video
            ref={videoRef}
            className="w-full h-full object-contain"
            playsInline
            preload="auto"
            onClick={togglePlay}
          />
        )}

        {/* Play Button Overlay (when autoplay is blocked or paused) */}
        {!channel?.isIframe && !isPlaying && !isLoading && !errorMsg && (
          <div 
            onClick={togglePlay}
            className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/45 cursor-pointer transition-all duration-300 z-10"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              whileHover={{ scale: 1.1 }}
              className="h-16 w-16 md:h-20 md:w-20 rounded-full bg-sport-accent text-black flex items-center justify-center shadow-2xl shadow-sport-accent/40 cursor-pointer"
            >
              <Play className="h-8 w-8 md:h-10 md:w-10 fill-current translate-x-0.5" />
            </motion.div>
            <div className="absolute bottom-16 text-center text-[10px] md:text-xs font-black text-white uppercase tracking-widest pointer-events-none bg-black/60 px-3 py-1.5 rounded-full border border-white/10 shadow-lg">
              Click to Start Stream
            </div>
          </div>
        )}

        {/* Loading Overlay */}
        <AnimatePresence>
          {(isLoading || errorMsg) && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/95 backdrop-blur-sm flex items-center justify-center z-20"
            >
              <div className="text-center p-6 flex flex-col items-center w-full h-full max-h-[85%] overflow-y-auto no-scrollbar">
                {errorMsg ? (
                  <div className="flex flex-col items-center max-w-md bg-[#050B14]/90 border border-white/10 p-6 rounded-2xl shadow-2xl mx-4 my-2">
                    <div className="h-12 w-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 mb-4">
                      <ShieldAlert className="h-6 w-6" />
                    </div>
                    <h4 className="text-sm font-extrabold text-white uppercase tracking-wider mb-2">Stream Playback Blocked / Offline</h4>
                    <p className="text-[11px] text-sport-secondary leading-relaxed mb-4 text-center">
                      Public IPTV feeds frequently restrict embedding on third-party sites due to **CORS (Cross-Origin Resource Sharing)** security policies or geoblocks.
                    </p>

                    {/* Copy Link Input group */}
                    <div className="w-full flex items-center gap-2 bg-white/5 border border-white/5 px-3 py-2 rounded-xl mb-4 text-left">
                      <input 
                        type="text" 
                        readOnly 
                        value={channel.streamUrl} 
                        className="bg-transparent text-[10px] text-sport-secondary outline-none flex-1 font-mono truncate"
                      />
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          navigator.clipboard.writeText(channel.streamUrl);
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2000);
                        }}
                        className="bg-sport-accent/15 hover:bg-sport-accent text-sport-accent hover:text-black text-[9px] font-bold px-2.5 py-1 rounded transition-all duration-300"
                      >
                        {copied ? 'COPIED!' : 'COPY URL'}
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-2.5 justify-center w-full">
                      <button 
                        onClick={() => window.open(channel.streamUrl, '_blank')} 
                        className="bg-white/5 hover:bg-white/10 text-white font-bold text-[10px] px-4 py-2 rounded-lg border border-white/10 transition-all"
                      >
                        OPEN IN NEW TAB
                      </button>
                      <button 
                        onClick={() => {
                          setCustomStreamUrl('https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8');
                          setErrorMsg(null);
                          setIsLoading(true);
                        }} 
                        className="bg-sport-accent hover:bg-sport-accent/90 text-black font-extrabold text-[10px] px-4 py-2 rounded-lg shadow-lg shadow-sport-accent/10 transition-all"
                      >
                        PLAY TEST DEMO
                      </button>
                      <button 
                        onClick={reloadStream} 
                        className="bg-white/10 hover:bg-white/20 text-white font-bold text-[10px] px-4 py-2 rounded-lg border border-white/10 transition-all"
                      >
                        RETRY
                      </button>
                    </div>

                    <div className="mt-4 pt-3 border-t border-white/5 w-full text-left">
                      <span className="text-[9px] font-extrabold text-sport-secondary uppercase tracking-widest block mb-1">Alternative Playback Options:</span>
                      <ul className="list-disc list-inside text-[9px] text-sport-secondary/80 space-y-1">
                        <li>Copy the URL above and stream it in **VLC Media Player** (Open Network Stream).</li>
                        <li>Install a browser extension like **"Allow CORS: Access-Control-Allow-Origin"** and toggle it on to play all feeds directly.</li>
                      </ul>
                    </div>
                  </div>
                ) : (
                  <>
                    <RefreshCw className="h-10 w-10 text-sport-accent animate-spin mb-4" />
                    <p className="text-xs font-bold text-white tracking-widest uppercase">TUNING STREAM...</p>
                    <p className="text-[10px] text-sport-secondary mt-1.5 max-w-xs font-semibold">
                      Establishing handshake connection to {channel.name}
                    </p>
                    {customStreamUrl && (
                      <span className="text-[9px] text-sport-accent/80 font-bold mt-2 uppercase tracking-wider animate-pulse">Loading CORS-enabled Test Demo</span>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Diagnostic Overlay */}
        <AnimatePresence>
          {showStats && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="absolute top-4 right-4 bg-[#050B14]/95 border border-sport-accent/30 p-4 rounded-xl font-mono text-[10px] text-sport-accent z-10 shadow-2xl flex flex-col gap-2 min-w-[200px]"
            >
              <div className="border-b border-sport-accent/20 pb-1.5 font-bold tracking-wider flex items-center gap-1.5">
                <Info className="h-3 w-3" /> STREAM DIAGNOSTICS
              </div>
              <div className="flex justify-between"><span>Format:</span><span className="text-white font-bold">{stats.streamType}</span></div>
              <div className="flex justify-between"><span>Resolution:</span><span className="text-white font-bold">{stats.resolution}</span></div>
              <div className="flex justify-between"><span>Bitrate:</span><span className="text-white font-bold">{stats.bitrate}</span></div>
              <div className="flex justify-between"><span>Buffer Length:</span><span className="text-white font-bold">{stats.bufferLength}</span></div>
              <div className="flex justify-between"><span>Stream Latency:</span><span className="text-white font-bold">{stats.latency}</span></div>
              <div className="border-t border-sport-accent/10 pt-1.5 flex justify-between text-sport-secondary">
                <span>Handshake Ping:</span><span className="font-bold text-sport-accent">{channel.latency}ms</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Custom HUD Overlays controls */}
        {!channel?.isIframe && (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col gap-3 z-10 justify-end">
          <div className="flex justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <button 
                onClick={togglePlay} 
                className="text-white hover:text-sport-accent transition-colors p-1"
                title={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 fill-current" />}
              </button>

              <div className="flex items-center gap-2">
                <button 
                  onClick={toggleMute} 
                  className="text-white hover:text-sport-accent transition-colors p-1"
                  title={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-16 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-sport-accent"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-[10px] font-bold bg-sport-accent text-black px-2 py-0.5 rounded uppercase animate-pulse">
                LIVE
              </span>

              {/* Quality Settings Dropdown */}
              {levels.length > 1 && (
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowQualityMenu(!showQualityMenu);
                    }}
                    className="flex items-center gap-1 bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 text-white font-bold text-[10px] px-2.5 py-1 rounded-lg transition-all"
                    title="Change Stream Quality"
                  >
                    <Settings className="h-3.5 w-3.5 text-sport-secondary" />
                    <span>{getCurrentQualityLabel()}</span>
                  </button>

                  <AnimatePresence>
                    {showQualityMenu && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute bottom-full right-0 mb-2 bg-[#050B14]/95 border border-white/10 rounded-xl p-1.5 flex flex-col gap-0.5 z-30 shadow-2xl min-w-[120px]"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="text-[8px] font-extrabold text-sport-secondary tracking-widest uppercase block px-2.5 py-1 border-b border-white/5 mb-1 text-center">
                          Quality
                        </span>
                        {levels.map((lvl) => {
                          const isSelected = activeLevelIndex === lvl.index;
                          return (
                            <button
                              key={lvl.index}
                              onClick={() => handleQualityChange(lvl.index)}
                              className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all flex justify-between items-center ${
                                isSelected
                                  ? 'bg-sport-accent/15 text-sport-accent'
                                  : 'text-sport-secondary hover:bg-white/5 hover:text-white'
                              }`}
                            >
                              <span>{lvl.label}</span>
                              {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-sport-accent" />}
                            </button>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
              {onToggleTheater && (
                <button 
                  onClick={onToggleTheater} 
                  className="text-white hover:text-sport-accent transition-colors p-1 hidden lg:block"
                  title={isTheaterMode ? "Default View" : "Theater Mode"}
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    {isTheaterMode ? (
                      <rect x="4" y="6" width="16" height="12" rx="2" ry="2" />
                    ) : (
                      <rect x="2" y="4" width="20" height="16" rx="2" ry="2" />
                    )}
                  </svg>
                </button>
              )}
              {isPipSupported && (
                <button
                  onClick={togglePip}
                  className="text-white hover:text-sport-accent transition-colors p-1"
                  title="Picture-in-Picture"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M8 4.5h11.5a1.5 1.5 0 0 1 1.5 1.5v11.5a1.5 1.5 0 0 1-1.5 1.5H8a1.5 1.5 0 0 1-1.5-1.5V6a1.5 1.5 0 0 1 1.5-1.5z" />
                    <path d="M13 10.5h5a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-5a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1z" />
                  </svg>
                </button>
              )}
              <button 
                onClick={toggleFullscreen} 
                className="text-white hover:text-sport-accent transition-colors p-1"
                title="Fullscreen"
              >
                <Maximize2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
        )}
      </div>
    </div>
  );
};

export default VideoPlayer;
