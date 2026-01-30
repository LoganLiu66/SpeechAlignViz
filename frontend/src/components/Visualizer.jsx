import React, { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import TimelinePlugin from 'wavesurfer.js/dist/plugins/timeline.esm.js';
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.esm.js';

const Visualizer = ({ audioUrl, transcript, onReady }) => {
  const containerRef = useRef(null);
  const textOverlayRef = useRef(null);
  const wavesurferRef = useRef(null);
  const regionsRef = useRef(null);
  const [zoom, setZoom] = useState(100); // px per second
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [scrollLeft, setScrollLeft] = useState(0);

  // Initialize Wavesurfer
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
      scrollParent: true,
      autoScroll: true,
      normalize: true,
    });

    // Register Plugins
    const wsRegions = ws.registerPlugin(RegionsPlugin.create());
    regionsRef.current = wsRegions;

    ws.registerPlugin(TimelinePlugin.create({
      container: '#timeline',
    }));

    // Events
    ws.on('ready', () => {
      setIsReady(true);
      setDuration(ws.getDuration());
      if (onReady) onReady();
    });

    ws.on('audioprocess', (t) => {
      setCurrentTime(t);
    });

    ws.on('seek', (t) => {
      setCurrentTime(t * ws.getDuration());
    });

    ws.on('play', () => setIsPlaying(true));
    ws.on('pause', () => setIsPlaying(false));

    // Sync scroll position for text overlay
    const syncScroll = () => {
      if (ws.renderer && ws.renderer.scrollContainer) {
        setScrollLeft(ws.renderer.scrollContainer.scrollLeft);
      }
    };

    // Listen to scroll events
    if (ws.renderer && ws.renderer.scrollContainer) {
      ws.renderer.scrollContainer.addEventListener('scroll', syncScroll);
    }

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
      try {
        if (ws.renderer && ws.renderer.scrollContainer) {
          ws.renderer.scrollContainer.removeEventListener('scroll', syncScroll);
        }
        ws.destroy();
      } catch (e) {
        console.warn("Error destroying wavesurfer instance:", e);
      }
    };
  }, [audioUrl]);

  // Update Zoom
  useEffect(() => {
    if (wavesurferRef.current && isReady) {
      wavesurferRef.current.zoom(zoom);
    }
  }, [zoom, isReady]);

  // Update Regions/Segments when transcript changes (for background colors and click handling)
  useEffect(() => {
    if (!wavesurferRef.current || !transcript || !regionsRef.current) return;

    regionsRef.current.clearRegions();

    transcript.forEach((item, index) => {
      try {
        const isEven = index % 2 === 0;
        const regionColor = isEven ? 'rgba(53, 44, 227, 0.2)' : 'rgba(99, 102, 241, 0.2)';

        regionsRef.current.addRegion({
          start: item.start_time,
          end: item.end_time,
          color: regionColor,
          drag: false,
          resize: false,
          id: `segment-${index}`
        });
      } catch (e) {
        console.error("Error creating region for item:", item, e);
      }
    });

    // Listen to region clicks to play
    regionsRef.current.on('region-clicked', (region, e) => {
      e.stopPropagation();
      if (wavesurferRef.current) {
        wavesurferRef.current.play(region.start, region.end);
      }
    });

    // Enable click-to-play on empty waveform areas
    if (wavesurferRef.current) {
      wavesurferRef.current.on('interaction', () => {
        wavesurferRef.current.play();
      });
    }

  }, [transcript]);

  // Handle segment click from text overlay
  const handleSegmentClick = (start, end) => {
    if (wavesurferRef.current && isReady) {
      wavesurferRef.current.play(start, end);
    }
  };

  // Calculate effective zoom - WaveSurfer stretches short audio to fill container
  const containerWidth = containerRef.current?.clientWidth || 800;
  const effectiveZoom = (isReady && duration > 0)
    ? Math.max(zoom, containerWidth / duration)
    : zoom;

  // Calculate total width based on duration and effective zoom
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

      {/* Waveform Area with Text Overlay */}
      <div className="relative border rounded bg-white shadow-sm overflow-hidden">
        {/* Waveform */}
        <div id="waveform" ref={containerRef} className="w-full" style={{ height: '128px' }} />

        {/* Timeline */}
        <div id="timeline" className="w-full" style={{ height: '24px' }} />

        {/* TEXT OVERLAY - Rendered separately from WaveSurfer */}
        {/* This guarantees text visibility as it's outside WaveSurfer's DOM */}
        <div
          ref={textOverlayRef}
          className="absolute top-0 left-0 pointer-events-none"
          style={{
            width: `${Math.max(totalWidth, containerRef.current?.clientWidth || 800)}px`,
            height: '128px',
            transform: `translateX(-${scrollLeft}px)`,
          }}
        >
          {transcript && transcript.map((item, index) => {
            const left = item.start_time * effectiveZoom;
            const width = (item.end_time - item.start_time) * effectiveZoom;
            const isEven = index % 2 === 0;

            return (
              <div
                key={index}
                className="absolute top-0 flex items-start pointer-events-auto cursor-pointer"
                style={{
                  left: `${left}px`,
                  width: `${width}px`,
                  height: '100%',
                  borderLeft: '2px solid rgba(255, 255, 255, 0.9)',
                }}
                onClick={() => handleSegmentClick(item.start_time, item.end_time)}
                title={item.text}
              >
                <span
                  className="text-xs font-semibold px-1 py-0.5 rounded whitespace-nowrap"
                  style={{
                    color: '#1e1b4b',
                    textShadow: '0 0 4px white, 0 0 4px white, 0 0 2px white',
                    backgroundColor: 'rgba(255, 255, 255, 0.7)',
                  }}
                >
                  {item.text}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Visualizer;
