import os
import re
from fastapi import FastAPI, UploadFile, File, HTTPException, Body
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import shutil
from pathlib import Path
from typing import Optional, List, Dict, Any

app = FastAPI(title="SpeechAlignViz")

# CORS for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Utils
CACHE_DIR = Path.home() / ".cache" / "speech_align_viz"
CACHE_DIR.mkdir(parents=True, exist_ok=True)

class PathInput(BaseModel):
    path: str


# --- Parsers ---

def parse_srt(content: str) -> List[Dict[str, Any]]:
    """Parse SRT subtitle format."""
    segments = []
    blocks = re.split(r'\n\n+', content.strip())
    
    for block in blocks:
        lines = block.strip().split('\n')
        if len(lines) >= 3:
            # Line 0: index (ignored)
            # Line 1: timestamps
            # Line 2+: text
            timestamp_line = lines[1]
            text_lines = lines[2:]
            
            # Parse timestamps: 00:00:01,000 --> 00:00:02,500
            match = re.match(
                r'(\d{2}):(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})[,.](\d{3})',
                timestamp_line
            )
            if match:
                h1, m1, s1, ms1, h2, m2, s2, ms2 = match.groups()
                start_time = int(h1) * 3600 + int(m1) * 60 + int(s1) + int(ms1) / 1000
                end_time = int(h2) * 3600 + int(m2) * 60 + int(s2) + int(ms2) / 1000
                text = ' '.join(text_lines).strip()
                
                # Remove HTML tags if any
                text = re.sub(r'<[^>]+>', '', text)
                
                segments.append({
                    "text": text,
                    "start_time": start_time,
                    "end_time": end_time
                })
    
    return segments


def parse_vtt(content: str) -> List[Dict[str, Any]]:
    """Parse WebVTT subtitle format."""
    segments = []
    
    # Remove WEBVTT header and any metadata
    content = re.sub(r'^WEBVTT.*?\n\n', '', content, flags=re.DOTALL)
    
    blocks = re.split(r'\n\n+', content.strip())
    
    for block in blocks:
        lines = block.strip().split('\n')
        if len(lines) >= 2:
            # Find the timestamp line (might have optional cue identifier before it)
            timestamp_line = None
            text_start_idx = 0
            
            for i, line in enumerate(lines):
                if '-->' in line:
                    timestamp_line = line
                    text_start_idx = i + 1
                    break
            
            if timestamp_line and text_start_idx < len(lines):
                text_lines = lines[text_start_idx:]
                
                # Parse timestamps: 00:00:01.000 --> 00:00:02.500
                match = re.match(
                    r'(\d{2}):(\d{2}):(\d{2})\.(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})\.(\d{3})',
                    timestamp_line
                )
                # Also try format without hours
                if not match:
                    match = re.match(
                        r'(\d{2}):(\d{2})\.(\d{3})\s*-->\s*(\d{2}):(\d{2})\.(\d{3})',
                        timestamp_line
                    )
                    if match:
                        m1, s1, ms1, m2, s2, ms2 = match.groups()
                        start_time = int(m1) * 60 + int(s1) + int(ms1) / 1000
                        end_time = int(m2) * 60 + int(s2) + int(ms2) / 1000
                        text = ' '.join(text_lines).strip()
                        text = re.sub(r'<[^>]+>', '', text)
                        segments.append({
                            "text": text,
                            "start_time": start_time,
                            "end_time": end_time
                        })
                else:
                    h1, m1, s1, ms1, h2, m2, s2, ms2 = match.groups()
                    start_time = int(h1) * 3600 + int(m1) * 60 + int(s1) + int(ms1) / 1000
                    end_time = int(h2) * 3600 + int(m2) * 60 + int(s2) + int(ms2) / 1000
                    text = ' '.join(text_lines).strip()
                    text = re.sub(r'<[^>]+>', '', text)
                    segments.append({
                        "text": text,
                        "start_time": start_time,
                        "end_time": end_time
                    })
    
    return segments


def parse_textgrid(content: str) -> List[Dict[str, Any]]:
    """Parse Praat TextGrid format (simplified parser for interval tiers)."""
    segments = []
    
    # Find all intervals with text
    # TextGrid format has: xmin, xmax, text for each interval
    
    # Simple regex-based parsing for interval tiers
    interval_pattern = re.compile(
        r'xmin\s*=\s*([\d.]+)\s*\n\s*xmax\s*=\s*([\d.]+)\s*\n\s*text\s*=\s*"([^"]*)"',
        re.MULTILINE
    )
    
    matches = interval_pattern.findall(content)
    
    for xmin, xmax, text in matches:
        text = text.strip()
        if text:  # Only include non-empty intervals
            segments.append({
                "text": text,
                "start_time": float(xmin),
                "end_time": float(xmax)
            })
    
    return segments


def parse_json(content: str) -> List[Dict[str, Any]]:
    """Parse JSON transcript format."""
    import json
    data = json.loads(content)
    
    # Validate expected format
    if isinstance(data, list):
        # Validate each item has required fields
        for item in data:
            if not all(k in item for k in ['text', 'start_time', 'end_time']):
                raise ValueError("Each JSON item must have 'text', 'start_time', 'end_time' fields")
        return data
    else:
        raise ValueError("JSON must be a list of transcript segments")


def parse_transcript(content: str, filename: str) -> List[Dict[str, Any]]:
    """Parse transcript based on file extension."""
    ext = Path(filename).suffix.lower()
    
    if ext == '.srt':
        return parse_srt(content)
    elif ext == '.vtt':
        return parse_vtt(content)
    elif ext == '.textgrid':
        return parse_textgrid(content)
    elif ext == '.json':
        return parse_json(content)
    else:
        raise ValueError(f"Unsupported file format: {ext}")


@app.get("/api/health")
def health_check():
    return {"status": "ok"}


# --- Audio Endpoints ---

@app.post("/api/audio/upload")
async def upload_audio(file: UploadFile = File(...)):
    temp_path = CACHE_DIR / file.filename
    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    return {"url": f"/api/files/{file.filename}", "filename": file.filename, "source": "upload"}


@app.post("/api/audio/local")
def get_local_audio(input: PathInput):
    p = Path(input.path)
    if not p.exists():
        raise HTTPException(status_code=404, detail="File not found")
    return {"url": f"/api/stream_local?path={input.path}", "filename": p.name, "source": "local"}


@app.get("/api/files/{filename}")
def serve_cached_file(filename: str):
    return FileResponse(CACHE_DIR / filename)


@app.get("/api/stream_local")
def stream_local_file(path: str):
    p = Path(path)
    if not p.exists():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(p)


# --- Transcript Endpoints ---

@app.post("/api/transcript/upload")
async def upload_transcript(file: UploadFile = File(...)):
    content = await file.read()
    content_str = content.decode('utf-8')
    
    try:
        data = parse_transcript(content_str, file.filename)
        return data
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse transcript: {str(e)}")


@app.post("/api/transcript/local")
def get_local_transcript(input: PathInput):
    p = Path(input.path)
    if not p.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    try:
        with open(p, 'r', encoding='utf-8') as f:
            content = f.read()
        data = parse_transcript(content, p.name)
        return data
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse transcript: {str(e)}")


# Serve Frontend (Static Files)
static_dir = Path(__file__).parent / "static"
if static_dir.exists():
    app.mount("/", StaticFiles(directory=static_dir, html=True), name="static")
