import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Volume2, VolumeX, Maximize2, Minimize2, Activity, RefreshCw, Info, X, ShieldAlert, Tv, Settings } from 'lucide-react';
import MatchCountdown from './MatchCountdown';

const VideoPlayer = ({ channel, onClose, isTheaterMode, onToggleTheater, nextMatch }) => {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const shakaRef = useRef(null);
  const containerRef = useRef(null);
  const controlsTimeoutRef = useRef(null);
  const retryTimerRef = useRef(null);
  const touchStartPos = useRef({ x: 0, y: 0 });
  const touchStartTimestamp = useRef(0);

  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

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
  const [isMuted, setIsMuted] = useState(true);
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
  const [hasStartedPlaying, setHasStartedPlaying] = useState(false);
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
  const [isStreamOffline, setIsStreamOffline] = useState(false);
  const [retryCountdown, setRetryCountdown] = useState(0);
  const [retryKey, setRetryKey] = useState(0);

  const resetControlsTimeout = () => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  };

  useEffect(() => {
    if (showControls && isPlaying) {
      resetControlsTimeout();
    }
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [showControls, isPlaying]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFull = !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement);
      setIsFullscreen(isFull);

      if (isFull) {
        if (window.screen && window.screen.orientation && window.screen.orientation.lock) {
          window.screen.orientation.lock('landscape')
            .catch((err) => {
              console.log('Screen orientation lock failed:', err.message);
            });
        }
      } else {
        if (window.screen && window.screen.orientation && window.screen.orientation.unlock) {
          try {
            window.screen.orientation.unlock();
          } catch (err) {
            console.log('Screen orientation unlock failed:', err.message);
          }
        }
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  const handleContainerClick = (e) => {
    if (e.target.closest('button, input, [role="button"], .no-toggle')) {
      resetControlsTimeout();
      return;
    }
    setShowControls(prev => !prev);
  };

  const handleTouchStart = (e) => {
    const touch = e.touches[0];
    touchStartPos.current = { x: touch.clientX, y: touch.clientY };
    touchStartTimestamp.current = Date.now();
  };

  const handleTouchEnd = (e) => {
    if (e.target.closest('button, input, [role="button"], .no-toggle')) {
      resetControlsTimeout();
      return;
    }

    const touch = e.changedTouches[0];
    const dx = Math.abs(touch.clientX - touchStartPos.current.x);
    const dy = Math.abs(touch.clientY - touchStartPos.current.y);
    const dt = Date.now() - touchStartTimestamp.current;

    // If it's a drag/scroll (e.g. moved more than 10px or touch lasted more than 300ms), ignore it
    if (dx > 10 || dy > 10 || dt > 300) {
      return;
    }

    // Otherwise, treat as tap. Prevent default to avoid simulated mouse/click event double-toggle
    e.preventDefault();
    setShowControls(prev => !prev);
    resetControlsTimeout();
  };

  useEffect(() => {
    if (channel) {
      setLogoUrl(channel.logo && channel.logo.trim().length > 0 ? channel.logo : null);
      setUseProxy(true);
    }
    setCustomStreamUrl(null);
    setShowCorsHelper(false);
    setIsStreamOffline(false);
    setRetryCountdown(0);
    setLevels([]);
    setCurrentLevelIndex(-1);
    setActiveLevelIndex(-1);
    setShowQualityMenu(false);
    setShowControls(true);
    setHasStartedPlaying(false);
    // Clear any pending retry timer when switching channels
    if (retryTimerRef.current) {
      clearInterval(retryTimerRef.current);
      retryTimerRef.current = null;
    }
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

  const renderHeaderFlag = (flag, className = "h-3.5 w-5 object-cover rounded-sm border border-white/10") => {
    if (!flag) return null;
    if (typeof flag === 'string' && flag.startsWith('http')) {
      return (
        <img
          src={flag}
          alt=""
          className={className}
          onError={(e) => { e.target.style.display = 'none'; }}
        />
      );
    }
    return <span className="text-[10px]">{flag}</span>;
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
    setHasStartedPlaying(false);

    // Reset and clear the video element's source to clear any previous still frame
    video.src = '';
    try {
      video.removeAttribute('src');
      video.load();
    } catch (e) {
      // ignore
    }

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
      // Rely on handlePlaying to clear the loading screen so we don't show a frozen first frame
      setShowCorsHelper(false);
      clearTimeout(loadingTimeout);
    };
    const handlePlaying = () => {
      setIsLoading(false);
      setHasStartedPlaying(true);
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

          // Configure Shaka Player for fast initial loading & low latency DASH streaming
          const shakaConfig = {
            streaming: {
              bufferingGoal: 4,          // Reduces start latency by playing when 4s of video is loaded (default 10s)
              rebufferingGoal: 2,        // Recovers from buffer stalls faster (default 5s)
              lowLatencyMode: true,      // Tells player to optimize for lower end-to-end latency
            },
            manifest: {
              dash: {
                autoCorrectDrift: true,   // Adjusts live stream time drift
                ignoreDrmInfo: true       // Skips trying to parse default DRM systems if not required
              }
            }
          };

          // Merge ClearKey DRM configuration if present
          if (channel.drm && channel.drm.clearKeys) {
            shakaConfig.drm = {
              clearKeys: channel.drm.clearKeys,
              keySystemsMapping: {
                'com.widevine.alpha': 'org.w3.clearkey'
              }
            };
          }

          player.configure(shakaConfig);

          // Inject custom request headers (e.g. Referer/Origin) for CDN authentication
          if (channel.drm && channel.drm.requestHeaders) {
            const customHeaders = channel.drm.requestHeaders;
            player.getNetworkingEngine().registerRequestFilter((type, request) => {
              Object.entries(customHeaders).forEach(([key, value]) => {
                request.headers[key] = value;
              });
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
              // We rely on handlePlaying to clear the loading screen and mark playback as started.
              // This prevents a frozen first frame from showing while the player is loading.
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
                .then(() => {
                  setIsPlaying(true);
                  setIsLoading(false);
                  setHasStartedPlaying(true);
                })
                .catch((e) => {
                  console.log("Play blocked:", e);
                  setIsPlaying(false);
                  setIsLoading(false); // Clear loading overlay to show Play button
                });
            })
            .catch((err) => {
              console.error('Shaka load error:', err);
              setIsLoading(false);
              clearTimeout(loadingTimeout);

              // Detect HTTP 403 = stream is offline (not live yet)
              // Shaka error code 1001 = HTTP_ERROR, data[1] = HTTP status code
              const httpStatus = err?.data?.[1];
              const isOffline = httpStatus === 403 || httpStatus === 404;

              if (isOffline) {
                setIsStreamOffline(true);
                setErrorMsg('STREAM_OFFLINE');
                // Auto-retry every 30 seconds by incrementing retryKey (which re-triggers the useEffect)
                const RETRY_INTERVAL = 30;
                setRetryCountdown(RETRY_INTERVAL);
                if (retryTimerRef.current) clearInterval(retryTimerRef.current);
                let countdown = RETRY_INTERVAL;
                retryTimerRef.current = setInterval(() => {
                  countdown -= 1;
                  setRetryCountdown(countdown);
                  if (countdown <= 0) {
                    clearInterval(retryTimerRef.current);
                    retryTimerRef.current = null;
                    setIsStreamOffline(false);
                    setErrorMsg(null);
                    setIsLoading(true);
                    setHasStartedPlaying(false);
                    // Increment retryKey to re-trigger the main useEffect cleanly
                    setRetryKey(k => k + 1);
                  }
                }, 1000);
              } else {
                setIsStreamOffline(false);
                setShowCorsHelper(true);
                setErrorMsg('Failed to load DASH stream. Feed may be blocked by CORS or DRM.');
              }
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
        if (retryTimerRef.current) {
          clearInterval(retryTimerRef.current);
          retryTimerRef.current = null;
        }
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
          .then(() => {
            setIsPlaying(true);
            setIsLoading(false);
            setHasStartedPlaying(true);
          })
          .catch((e) => {
            console.log("Auto-play blocked, waiting for user interaction:", e);
            setIsPlaying(false);
            setIsLoading(false); // Clear loading overlay to show Play button
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
          .then(() => {
            setIsPlaying(true);
            setIsLoading(false);
            setHasStartedPlaying(true);
          })
          .catch((e) => {
            console.log("Native HLS autoplay blocked:", e);
            setIsPlaying(false);
            setIsLoading(false); // Clear loading overlay
          });
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
  }, [channel, customStreamUrl, useProxy, retryKey]);

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
      setShowControls(true);
    } else {
      video.play()
        .then(() => {
          setIsPlaying(true);
          setShowControls(true);
          resetControlsTimeout();
        })
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
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
      if (container.requestFullscreen) {
        container.requestFullscreen();
      } else if (container.webkitRequestFullscreen) {
        container.webkitRequestFullscreen();
      } else if (container.mozRequestFullScreen) {
        container.mozRequestFullScreen();
      } else if (container.msRequestFullscreen) {
        container.msRequestFullscreen();
      } else if (videoRef.current && videoRef.current.webkitEnterFullscreen) {
        videoRef.current.webkitEnterFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
    }
  };

  const reloadStream = () => {
    setHasStartedPlaying(false);
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
    <div className="w-full flex flex-col gap-3 sm:gap-4">
      {/* Player Header */}
      <div className="flex justify-between items-center bg-sport-card/40 border border-white/5 px-3 py-2 sm:px-4 sm:py-3 rounded-xl backdrop-blur-md">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg bg-white/5 border border-white/5 p-1 sm:p-1.5 flex-shrink-0 flex items-center justify-center">
            {logoUrl ? (
              <img 
                src={logoUrl} 
                alt={channel.name} 
                className="max-h-full max-w-full object-contain"
                onError={handleLogoError}
              />
            ) : (
              <Tv className="h-4 w-4 sm:h-4.5 sm:w-4.5 text-white/20" />
            )}
          </div>
          <div className="min-w-0">
            <h3 className="text-xs sm:text-sm font-bold text-white leading-tight tracking-wide truncate">{channel.name}</h3>
            <span className="text-[8px] sm:text-[10px] font-bold text-sport-secondary uppercase tracking-wider mt-0.5 sm:mt-1 block truncate">
              {channel.country ? channel.country : 'GLOBAL'} • {channel.languages?.[0]?.toUpperCase() || 'ENG'}
            </span>
          </div>
        </div>

        {/* Next Match Banner (Middle Area) */}
        {nextMatch && (
          <div className="hidden md:flex items-center gap-3 bg-white/5 border border-white/5 px-3 py-1.5 rounded-full text-[10px] font-bold mx-4 backdrop-blur-md">
            <div className="flex items-center gap-2">
              <span className="text-sport-secondary/70 uppercase text-[8px] font-black tracking-wider">Next Match:</span>
              <div className="flex items-center gap-1 text-white">
                {renderHeaderFlag(nextMatch.homeFlag, "h-3 w-4.5 object-cover rounded-sm border border-white/10")}
                <span className="font-extrabold">{nextMatch.homeTeam}</span>
              </div>
              <span className="text-sport-secondary/40 font-black font-mono">vs</span>
              <div className="flex items-center gap-1 text-white">
                {renderHeaderFlag(nextMatch.awayFlag, "h-3 w-4.5 object-cover rounded-sm border border-white/10")}
                <span className="font-extrabold">{nextMatch.awayTeam}</span>
              </div>
            </div>
            
            <div className="h-3.5 w-px bg-white/10" />
            
            <div className="flex items-center gap-1 text-amber-400 font-black">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-400"></span>
              </span>
              <MatchCountdown kickoffTime={nextMatch.kickoffTime} className="font-mono text-[10px] tracking-wide" />
            </div>
          </div>
        )}

        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          {!channel?.isIframe && (
            <>
              {/* CORS Proxy Toggle */}
              <button 
                onClick={() => {
                  setUseProxy(prev => !prev);
                  setErrorMsg(null);
                  setIsLoading(true);
                }} 
                className={`text-[8px] sm:text-[9px] font-extrabold uppercase tracking-widest px-2 py-1.5 sm:px-2.5 sm:py-2 rounded-lg border transition-all cursor-pointer ${
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
                className={`p-1.5 sm:p-2 rounded-lg border transition-all ${
                  showStats ? 'bg-sport-accent/10 border-sport-accent/20 text-sport-accent' : 'bg-white/5 border-white/5 text-sport-secondary hover:text-white'
                }`}
                title="Toggle Stream Diagnostics"
              >
                <Activity className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </button>
              <button 
                onClick={reloadStream} 
                className="p-1.5 sm:p-2 rounded-lg bg-white/5 border border-white/5 text-sport-secondary hover:text-white transition-all"
                title="Reload Feed"
              >
                <RefreshCw className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </button>
            </>
          )}
          {onClose && (
            <button 
              onClick={onClose} 
              className="p-1.5 sm:p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-black transition-all ml-0.5"
              title="Close Player"
            >
              <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </button>
          )}
        </div>
      </div>

      <div 
        ref={containerRef}
        className={`relative w-full aspect-video bg-black overflow-hidden shadow-2xl group transition-all duration-300 ${
          isFullscreen ? 'rounded-none border-0' : 'rounded-2xl border border-white/5'
        }`}
        onClick={handleContainerClick}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onMouseEnter={() => {
          setShowControls(true);
        }}
        onMouseMove={() => {
          setShowControls(true);
          resetControlsTimeout();
        }}
        onMouseLeave={() => {
          if (isPlaying) {
            setShowControls(false);
          }
        }}
      >
        {channel?.isIframe ? (
          <iframe
            key={channel.id}
            src={channel.streamUrl}
            className="w-full h-full border-0"
            allowFullScreen
            scrolling="no"
            referrerPolicy="no-referrer-when-downgrade"
            allow="autoplay; fullscreen; encrypted-media; picture-in-picture; accelerometer; gyroscope"
          />
        ) : (
          <video
            ref={videoRef}
            className="w-full h-full object-contain"
            playsInline
            preload="auto"
            autoPlay
            muted={isMuted}
          />
        )}

        {/* Loading & Buffering Overlays */}
        <AnimatePresence>
          {/* 1. Critical Error Overlay (Always dark and blocks player interaction) */}
          {errorMsg && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#050B14]/95 backdrop-blur-md flex items-center justify-center z-25 pointer-events-auto"
            >
              <div className="text-center p-6 flex flex-col items-center w-full h-full max-h-[85%] overflow-y-auto no-scrollbar">

                {/* ── OFFLINE STATE ── */}
                {isStreamOffline ? (
                  <div className="flex flex-col items-center max-w-md bg-[#050B14]/90 border border-amber-500/20 p-6 rounded-2xl shadow-2xl mx-4 my-2">
                    {/* Pulsing offline dot */}
                    <div className="relative h-14 w-14 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-4">
                      <div className="absolute inset-0 rounded-full border border-amber-500/20 animate-ping opacity-40" />
                      <Tv className="h-6 w-6 text-amber-400" />
                    </div>
                    <h4 className="text-sm font-extrabold text-white uppercase tracking-wider mb-1">Stream Not Live</h4>
                    <p className="text-[11px] text-amber-400/80 font-semibold mb-1">{channel?.name}</p>
                    <p className="text-[10px] text-sport-secondary leading-relaxed mb-5 text-center max-w-[280px]">
                      This channel is only available during live broadcasts. The stream will start automatically when it goes live.
                    </p>

                    {/* Auto-retry countdown ring */}
                    <div className="relative h-16 w-16 mb-4">
                      <svg className="h-16 w-16 -rotate-90" viewBox="0 0 64 64">
                        <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
                        <circle
                          cx="32" cy="32" r="28"
                          fill="none"
                          stroke="#f59e0b"
                          strokeWidth="4"
                          strokeLinecap="round"
                          strokeDasharray={`${2 * Math.PI * 28}`}
                          strokeDashoffset={`${2 * Math.PI * 28 * (1 - retryCountdown / 30)}`}
                          style={{ transition: 'stroke-dashoffset 1s linear' }}
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-lg font-black text-white leading-none">{retryCountdown}</span>
                        <span className="text-[8px] text-sport-secondary uppercase tracking-wider">retry</span>
                      </div>
                    </div>

                    <div className="flex gap-2.5 justify-center w-full">
                      <button
                        onClick={() => {
                          if (retryTimerRef.current) { clearInterval(retryTimerRef.current); retryTimerRef.current = null; }
                          setIsStreamOffline(false);
                          setErrorMsg(null);
                          setIsLoading(true);
                          setHasStartedPlaying(false);
                          setRetryKey(k => k + 1);
                        }}
                        className="bg-amber-500/15 hover:bg-amber-500/30 text-amber-400 font-extrabold text-[10px] px-5 py-2 rounded-lg border border-amber-500/30 transition-all flex items-center gap-1.5"
                      >
                        <RefreshCw className="h-3 w-3" /> RETRY NOW
                      </button>
                      <button
                        onClick={() => {
                          if (retryTimerRef.current) { clearInterval(retryTimerRef.current); retryTimerRef.current = null; }
                          setCustomStreamUrl('https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8');
                          setIsStreamOffline(false);
                          setErrorMsg(null);
                          setIsLoading(true);
                        }}
                        className="bg-white/5 hover:bg-white/10 text-white font-bold text-[10px] px-4 py-2 rounded-lg border border-white/10 transition-all"
                      >
                        TEST DEMO
                      </button>
                    </div>

                    <div className="mt-4 pt-3 border-t border-white/5 w-full text-center">
                      <span className="text-[9px] text-sport-secondary/60">
                        Auto-retrying every 30 seconds · Check back during scheduled match times
                      </span>
                    </div>
                  </div>
                ) : (
                  /* ── CORS / BLOCKED STATE ── */
                  <div className="flex flex-col items-center max-w-md bg-[#050B14]/90 border border-white/10 p-6 rounded-2xl shadow-2xl mx-4 my-2">
                    <div className="h-12 w-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 mb-4">
                      <ShieldAlert className="h-6 w-6" />
                    </div>
                    <h4 className="text-sm font-extrabold text-white uppercase tracking-wider mb-2">Stream Playback Blocked</h4>
                    <p className="text-[11px] text-sport-secondary leading-relaxed mb-4 text-center">
                      This feed is restricted by CORS policies or geoblocking and cannot play in-browser.
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
                        <li>Copy the URL above and play it in <strong>VLC</strong> (Media → Open Network Stream).</li>
                        <li>Use a browser CORS extension like <strong>"Allow CORS"</strong> to unblock feeds.</li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* 2. Initial Loading Overlay (Dark, Glassmorphic, shown when not started playing yet) */}
          {isLoading && !hasStartedPlaying && !errorMsg && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#050B14]/90 backdrop-blur-md flex items-center justify-center z-20 pointer-events-none"
            >
              <div className="text-center p-6 flex flex-col items-center justify-center">
                {/* Premium concentric loader */}
                <div className="relative h-16 w-16 mb-6 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-4 border-white/5" />
                  <div className="absolute inset-0 rounded-full border-4 border-t-sport-accent border-r-transparent border-b-transparent border-l-transparent animate-spin" />
                  <div className="absolute inset-2 rounded-full border-4 border-white/5" />
                  <div className="absolute inset-2 rounded-full border-4 border-b-sport-secondary border-t-transparent border-r-transparent border-l-transparent animate-[spin_1.5s_linear_infinite_reverse]" />
                  <Tv className="h-5 w-5 text-white/40 absolute" />
                </div>
                <h4 className="text-xs font-black text-white tracking-[0.2em] uppercase">Tuning Live Feed</h4>
                <p className="text-[10px] text-sport-secondary mt-2 max-w-[240px] font-medium leading-relaxed">
                  Establishing secure handshake connection to <span className="text-white font-bold">{channel.name}</span>
                </p>
                {customStreamUrl && (
                  <span className="text-[9px] text-sport-accent/80 font-bold mt-3 uppercase tracking-wider animate-pulse bg-sport-accent/10 px-2 py-0.5 rounded border border-sport-accent/20">
                    CORS Test Demo Mode
                  </span>
                )}
              </div>
            </motion.div>
          )}

          {/* 3. Mid-stream Buffering Overlay (Semi-transparent, preserves video visibility underneath) */}
          {isLoading && hasStartedPlaying && !errorMsg && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/30 backdrop-blur-[0.5px] flex items-center justify-center z-20 pointer-events-none"
            >
              <div className="text-center bg-black/60 px-5 py-4 rounded-2xl border border-white/10 backdrop-blur-md flex flex-col items-center shadow-2xl max-w-[180px]">
                {/* Micro double-ring spinner */}
                <div className="relative h-10 w-10 mb-3 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-[3px] border-white/5" />
                  <div className="absolute inset-0 rounded-full border-[3px] border-t-sport-accent border-r-transparent border-b-transparent border-l-transparent animate-spin" />
                  <div className="absolute inset-1.5 rounded-full border-[3px] border-white/5" />
                  <div className="absolute inset-1.5 rounded-full border-[3px] border-b-sport-secondary border-t-transparent border-r-transparent border-l-transparent animate-[spin_1.2s_linear_infinite_reverse]" />
                </div>
                <span className="text-[10px] font-black text-white uppercase tracking-wider block">Buffering</span>
                <span className="text-[8px] font-bold text-sport-secondary/80 mt-1 block">
                  {stats.bufferLength !== 'N/A' ? `Buffer: ${stats.bufferLength}` : 'Reconnecting...'}
                </span>
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
              className="absolute top-4 right-4 bg-[#050B14]/95 border border-sport-accent/30 p-4 rounded-xl font-mono text-[10px] text-sport-accent z-35 shadow-2xl flex flex-col gap-2 min-w-[200px] no-toggle"
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

        {/* Controls Overlay Background Dim */}
        {!channel?.isIframe && (
          <div 
            className={`absolute inset-0 bg-black/55 backdrop-blur-[0.5px] transition-opacity duration-300 z-10 pointer-events-none ${
              showControls ? 'opacity-100' : 'opacity-0'
            }`}
          />
        )}

        {/* Centered Controls Overlay (YouTube style) */}
        {!channel?.isIframe && !isLoading && !errorMsg && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-20 pointer-events-none">
            <AnimatePresence>
              {showControls && (
                <div className="flex flex-col items-center gap-3">
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePlay();
                    }}
                    className="pointer-events-auto h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-black/60 hover:bg-black/85 text-white hover:text-sport-accent flex items-center justify-center border border-white/15 hover:border-sport-accent/40 shadow-2xl transition-all cursor-pointer no-toggle"
                  >
                    {isPlaying ? (
                      <Pause className="h-5 w-5 sm:h-6 sm:w-6 fill-current" />
                    ) : (
                      <Play className="h-5 w-5 sm:h-6 sm:w-6 fill-current translate-x-0.5" />
                    )}
                  </motion.button>
                  
                  {!isPlaying && (
                    <motion.span
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-[9px] sm:text-[10px] font-black text-white bg-black/60 px-2.5 py-1 rounded-full border border-white/10 tracking-widest uppercase"
                    >
                      Click to Start Stream
                    </motion.span>
                  )}
                </div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Custom HUD Overlays controls */}
        {!channel?.isIframe && (
          <div className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/50 to-transparent p-3 sm:p-4 transition-opacity duration-300 flex flex-col gap-3 z-20 justify-end ${
            showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}>
            <div className="flex justify-between items-center gap-4">
              <div className="flex items-center gap-3">
                <button 
                  onClick={togglePlay} 
                  className="text-white hover:text-sport-accent transition-colors p-1.5 sm:p-1 cursor-pointer no-toggle"
                  title={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 fill-current" />}
                </button>

                <div className="flex items-center gap-2">
                  <button 
                    onClick={toggleMute} 
                    className="text-white hover:text-sport-accent transition-colors p-1.5 sm:p-1 cursor-pointer no-toggle"
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
                    className="hidden sm:block w-16 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-sport-accent no-toggle"
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
                      className="flex items-center gap-1 bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 text-white font-bold text-[9px] sm:text-[10px] px-2.5 py-1.5 rounded-lg transition-all cursor-pointer no-toggle"
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
                          className="absolute bottom-full right-0 mb-2 bg-[#050B14]/95 border border-white/10 rounded-xl p-1.5 flex flex-col gap-0.5 z-30 shadow-2xl min-w-[130px] no-toggle"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="text-[9px] font-extrabold text-sport-secondary tracking-widest uppercase block px-3 py-1.5 border-b border-white/5 mb-1.5 text-center">
                            Quality Settings
                          </span>
                          {levels.map((lvl) => {
                            const isSelected = activeLevelIndex === lvl.index;
                            return (
                              <button
                                key={lvl.index}
                                onClick={() => handleQualityChange(lvl.index)}
                                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all flex justify-between items-center cursor-pointer no-toggle ${
                                  isSelected
                                    ? 'bg-sport-accent/15 text-sport-accent'
                                    : 'text-sport-secondary hover:bg-white/5 hover:text-white'
                                }` }
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
                    className="text-white hover:text-sport-accent transition-colors p-1.5 sm:p-1 hidden lg:block cursor-pointer no-toggle"
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
                    className="text-white hover:text-sport-accent transition-colors p-1.5 sm:p-1 cursor-pointer no-toggle"
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
                  className="text-white hover:text-sport-accent transition-colors p-1.5 sm:p-1 cursor-pointer no-toggle"
                  title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                >
                  {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
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
