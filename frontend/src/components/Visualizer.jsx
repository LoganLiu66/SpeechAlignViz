import React, { useEffect, useRef, useState, useCallback } from 'react';
import WaveSurfer from 'wavesurfer.js';
import TimelinePlugin from 'wavesurfer.js/dist/plugins/timeline.esm.js';
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.esm.js';

const Visualizer = ({ audioUrl, transcript, onReady }) => {
  const containerRef = useRef(null);
  const wavesurferRef = useRef(null);
  const regionsPluginRef = useRef(null);

  const [zoom, setZoom] = useState(100);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [scrollLeft, setScrollLeft] = useState(0);

  // Memoize syncScroll to fix the ReferenceError and allow safe reuse
  const syncScroll = useCallback(() => {
    if (wavesurferRef.current && wavesurferRef.current.renderer && wavesurferRef.current.renderer.scrollContainer) {
      setScrollLeft(wavesurferRef.current.renderer.scrollContainer.scrollLeft);
    }
  }, []);

  // Initialize WaveSurfer
  useEffect(() => {
    if (!containerRef.current || !audioUrl) return;

    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: '#433be8ff',
      progressColor: '#818CF8',
      cursorColor: '#333',
      barWidth: 2,
      barGap: 3,
      barRadius: 3,
      height: 128,
      minPxPerSec: zoom,
      fillParent: true,
      scrollParent: true,
      autoScroll: true,
      normalize: true,
    });

    // Register Plugins
    const wsRegions = ws.registerPlugin(RegionsPlugin.create());
    regionsPluginRef.current = wsRegions;

    // Initialize Timeline - by default it appends to the scrollable container
    ws.registerPlugin(TimelinePlugin.create());

    // Events
    ws.on('ready', () => {
      setIsReady(true);
      setDuration(ws.getDuration());
      if (onReady) onReady();
    });

    ws.on('audioprocess', (t) => setCurrentTime(t));
    ws.on('seek', (t) => setCurrentTime(t * ws.getDuration()));
    ws.on('play', () => setIsPlaying(true));
    ws.on('pause', () => setIsPlaying(false));

    // Play from click position to end if not clicking a region
    ws.on('interaction', () => {
      ws.play();
    });

    // Attach scroll listener
    let scrollContainer = null;
    const attachScrollListener = () => {
      if (ws.renderer && ws.renderer.scrollContainer) {
        scrollContainer = ws.renderer.scrollContainer;
        scrollContainer.addEventListener('scroll', syncScroll);
      }
    };
    setTimeout(attachScrollListener, 100);

    // Load audio
    const loadAudio = async () => {
      try {
        await ws.load(audioUrl);
      } catch (err) {
        if (err.name === 'AbortError' || err.message?.includes('aborted')) return;
        console.error("Error loading audio:", err);
      }
    };

    loadAudio();
    wavesurferRef.current = ws;

    return () => {
      if (scrollContainer) {
        scrollContainer.removeEventListener('scroll', syncScroll);
      }
      ws.destroy();
    };
  }, [audioUrl, syncScroll]);

  // Handle Zoom change
  useEffect(() => {
    if (wavesurferRef.current && isReady) {
      wavesurferRef.current.zoom(zoom);
    }
  }, [zoom, isReady]);

  // Update Regions when transcript changes
  useEffect(() => {
    if (!wavesurferRef.current || !transcript || !regionsPluginRef.current) return;

    regionsPluginRef.current.clearRegions();

    transcript.forEach((item, index) => {
      try {
        const isEven = index % 2 === 0;
        const regionColor = isEven ? 'rgba(53, 44, 227, 0.2)' : 'rgba(99, 102, 241, 0.2)';

        regionsPluginRef.current.addRegion({
          start: item.start_time,
          end: item.end_time,
          color: regionColor,
          drag: false,
          resize: false,
          id: `segment-${index}`,
        });
      } catch (e) {
        console.error("Error creating region for item:", item, e);
      }
    });

    // Interaction handling
    const onRegionClick = (region, e) => {
      e.stopPropagation();
      wavesurferRef.current.play(region.start, region.end);
    };

    regionsPluginRef.current.on('region-clicked', onRegionClick);

    // Immediately sync scroll for labels
    syncScroll();

    return () => {
      if (regionsPluginRef.current) {
        regionsPluginRef.current.un('region-clicked', onRegionClick);
      }
    };
  }, [transcript, syncScroll]);

  // Handle segment click from React overlay
  const handleLabelClick = (start, end) => {
    if (wavesurferRef.current && isReady) {
      wavesurferRef.current.play(start, end);
    }
  };

  // Calculate widths for manual labels
  const containerWidth = containerRef.current?.clientWidth || 800;
  const effectiveZoom = (isReady && duration > 0)
    ? Math.max(zoom, containerWidth / duration)
    : zoom;

  const totalWidth = duration * effectiveZoom;

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Controls */}
      <div className="flex items-center gap-4 p-2 bg-gray-50 rounded border">
        <button
          className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 font-medium disabled:bg-gray-400"
          onClick={() => isReady && wavesurferRef.current?.playPause()}
          disabled={!isReady}
        >
          {isPlaying ? 'Pause' : 'Play'}
        </button>

        <div className="flex items-center gap-2 flex-1">
          <label className="text-sm font-medium text-gray-700">Zoom:</label>
          <input
            type="range"
            min="10"
            max="500"
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
        </div>
        <div className="text-sm font-mono text-gray-600">
          {currentTime.toFixed(2)}s / {duration.toFixed(2)}s
        </div>
      </div>

      {/* Waveform Area */}
      <div className="relative border rounded bg-white shadow-sm overflow-hidden flex flex-col">
        {/* Unified Waveform & Timeline Container */}
        {/* height 160px: 128px for wave + ~32px for timeline */}
        <div ref={containerRef} className="w-full relative" style={{ height: '160px' }}>
          {/* WaveSurfer will render here */}

          {/* TEXT OVERLAY - Rendered separately from WaveSurfer DOM */}
          {/* pointer-events-none ensures you can still drag/scroll the waveform */}
          <div
            className="absolute top-0 left-0 pointer-events-none w-full"
            style={{
              height: '128px', // Covers only the waveform part
              zIndex: 10,
            }}
          >
            {/* Inner relative container that follows the audio scroll */}
            <div
              className="relative h-full"
              style={{
                width: `${totalWidth}px`,
                transform: `translateX(-${scrollLeft}px)`
              }}
            >
              {transcript && transcript.map((item, index) => {
                const left = item.start_time * effectiveZoom;
                const width = (item.end_time - item.start_time) * effectiveZoom;

                return (
                  <div
                    key={index}
                    className="absolute top-0 flex items-start"
                    style={{
                      left: `${left}px`,
                      width: `${width}px`,
                      height: '100%',
                    }}
                  >
                    <span
                      className="transcription-label"
                      style={{
                        position: 'absolute',
                        top: '2px',
                        left: '2px',
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLabelClick(item.start_time, item.end_time);
                      }}
                      title={item.text}
                    >
                      {item.text}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Visualizer;
