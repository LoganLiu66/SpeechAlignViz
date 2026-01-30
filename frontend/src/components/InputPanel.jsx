import React, { useState } from 'react';
import { Upload, Folder, FileText, Music } from 'lucide-react';

const API_BASE = import.meta.env.DEV ? 'http://localhost:8000' : '';

const InputPanel = ({ onAudioChange, onTranscriptChange }) => {
    const [activeAudioTab, setActiveAudioTab] = useState('upload'); // upload, local
    const [activeTranscriptTab, setActiveTranscriptTab] = useState('upload'); // upload, local

    const [audioPathInput, setAudioPathInput] = useState('');
    const [transcriptPathInput, setTranscriptPathInput] = useState('');

    const handleAudioUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch(`${API_BASE}/api/audio/upload`, {
                method: 'POST',
                body: formData,
            });
            const data = await res.json();
            onAudioChange({ url: `${API_BASE}${data.url}`, name: data.filename });
        } catch (err) {
            alert('Upload failed: ' + err.message);
        }
    };

    const handleAudioLocal = async () => {
        if (!audioPathInput) return;
        try {
            const res = await fetch(`${API_BASE}/api/audio/local`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path: audioPathInput }),
            });
            if (!res.ok) throw new Error('Failed to access local file');
            const data = await res.json();
            onAudioChange({ url: `${API_BASE}${data.url}`, name: data.filename });
        } catch (err) {
            alert('Error: ' + err.message);
        }
    };

    const handleTranscriptUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const formData = new FormData();
        formData.append('file', file);
        try {
            const res = await fetch(`${API_BASE}/api/transcript/upload`, {
                method: 'POST',
                body: formData,
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.detail || 'Upload failed');
            }
            const data = await res.json();
            onTranscriptChange({ data: data, name: file.name });
        } catch (err) {
            alert('Upload failed: ' + err.message);
        }
    };

    const handleTranscriptLocal = async () => {
        if (!transcriptPathInput) return;
        try {
            const res = await fetch(`${API_BASE}/api/transcript/local`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path: transcriptPathInput }),
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.detail || 'Load failed');
            }
            const data = await res.json();
            onTranscriptChange({ data: data, name: transcriptPathInput });
        } catch (err) {
            alert('Error: ' + err.message);
        }
    };

    const TabButton = ({ active, label, icon: Icon, onClick }) => (
        <button
            className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-t-lg transition-colors ${active
                ? 'bg-white text-indigo-600 border-t border-x border-gray-200'
                : 'bg-gray-50 text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
            onClick={onClick}
        >
            <Icon size={16} />
            {label}
        </button>
    );

    return (
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-8">

            {/* Audio Section */}
            <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <Music size={20} className="text-indigo-600" /> Audio Source
                </h3>
                <div className="flex border-b border-gray-200 mb-4">
                    <TabButton active={activeAudioTab === 'upload'} label="Upload" icon={Upload} onClick={() => setActiveAudioTab('upload')} />
                    <TabButton active={activeAudioTab === 'local'} label="Local Path" icon={Folder} onClick={() => setActiveAudioTab('local')} />
                </div>

                <div className="h-24">
                    {activeAudioTab === 'upload' && (
                        <div className="flex flex-col gap-2">
                            <input type="file" accept="audio/*" onChange={handleAudioUpload} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" />
                            <p className="text-xs text-gray-400">Supported formats: mp3, wav, ogg</p>
                        </div>
                    )}
                    {activeAudioTab === 'local' && (
                        <div className="flex gap-2">
                            <input type="text" placeholder="/absolute/path/to/audio.mp3" className="flex-1 p-2 border rounded text-sm" value={audioPathInput} onChange={e => setAudioPathInput(e.target.value)} />
                            <button className="px-4 py-2 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700" onClick={handleAudioLocal}>Load</button>
                        </div>
                    )}
                </div>
            </div>

            {/* Transcript Section */}
            <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <FileText size={20} className="text-indigo-600" /> Transcript Source
                </h3>
                <div className="flex border-b border-gray-200 mb-4">
                    <TabButton active={activeTranscriptTab === 'upload'} label="Upload" icon={Upload} onClick={() => setActiveTranscriptTab('upload')} />
                    <TabButton active={activeTranscriptTab === 'local'} label="Local Path" icon={Folder} onClick={() => setActiveTranscriptTab('local')} />
                </div>

                <div className="h-24">
                    {activeTranscriptTab === 'upload' && (
                        <div className="flex flex-col gap-2">
                            <input
                                type="file"
                                accept=".json,.srt,.vtt,.TextGrid"
                                onChange={handleTranscriptUpload}
                                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                            />
                            <p className="text-xs text-gray-400">Supported formats: JSON, SRT, VTT, TextGrid</p>
                        </div>
                    )}
                    {activeTranscriptTab === 'local' && (
                        <div className="flex gap-2">
                            <input type="text" placeholder="/path/to/transcript.srt" className="flex-1 p-2 border rounded text-sm" value={transcriptPathInput} onChange={e => setTranscriptPathInput(e.target.value)} />
                            <button className="px-4 py-2 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700" onClick={handleTranscriptLocal}>Load</button>
                        </div>
                    )}
                </div>
            </div>

        </div>
    );
};

export default InputPanel;
