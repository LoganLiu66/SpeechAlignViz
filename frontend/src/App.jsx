import React, { useState } from 'react';
import Visualizer from './components/Visualizer';
import InputPanel from './components/InputPanel';
import { Activity } from 'lucide-react';

function App() {
  const [audioUrl, setAudioUrl] = useState(null);
  const [audioName, setAudioName] = useState(null);
  const [transcript, setTranscript] = useState(null);
  const [transcriptName, setTranscriptName] = useState(null);

  const handleAudioChange = ({ url, name }) => {
    setAudioUrl(url);
    setAudioName(name);
    // Clear old transcript when new audio is loaded
    setTranscript(null);
    setTranscriptName(null);
  };

  const handleTranscriptChange = ({ data, name }) => {
    setTranscript(data);
    setTranscriptName(name);
  };

  return (
    <div className="min-h-screen bg-gray-100 font-sans text-gray-900">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="p-2 bg-indigo-600 rounded-lg text-white">
            <Activity size={24} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">SpeechAlignViz</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 flex flex-col gap-6">

        <InputPanel
          onAudioChange={handleAudioChange}
          onTranscriptChange={handleTranscriptChange}
          isAudioLoaded={!!audioUrl}
        />

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 min-h-[400px]">
          {audioUrl ? (
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-end border-b pb-2">
                <div>
                  <h2 className="text-xl font-semibold text-gray-800">Visualization</h2>
                  <p className="text-sm text-gray-500">
                    {audioName && `Audio: ${audioName}`}
                    {transcriptName && ` • Transcript: ${transcriptName}`}
                  </p>
                </div>
              </div>
              <Visualizer audioUrl={audioUrl} transcript={transcript} />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              <Activity size={48} className="mb-4 text-gray-300" />
              <p className="text-lg">Please load an audio source to begin</p>
            </div>
          )}
        </div>

      </main>
    </div>
  );
}

export default App;
