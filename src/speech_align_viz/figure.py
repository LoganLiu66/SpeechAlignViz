import matplotlib.pyplot as plt
import librosa
import librosa.display
import numpy as np
from pathlib import Path
from typing import List, Dict, Any

def generate_figure(
    audio_path: str,
    transcript_data: List[Dict[str, Any]],
    output_path: str,
    width: float = None,
    height: float = 4
):
    """
    Generate a static figure showing the audio waveform and text alignment.
    
    Args:
        audio_path: Path to the audio file.
        transcript_data: List of transcript segments with 'start_time', 'end_time', and 'text'.
        output_path: Path to save the output image (e.g., .png).
        width: Figure width in inches. If None, calculated based on duration.
        height: Figure height in inches.
    """
    # Load audio
    y, sr = librosa.load(audio_path, sr=None)
    duration = librosa.get_duration(y=y, sr=sr)
    
    # Calculate width if not provided
    # Heuristic: 0.5 inches per second, minimum 16 inches
    if width is None:
        width = min(300.0, duration)
    
    # Create plot
    plt.figure(figsize=(width, height))
    
    # Plot waveform
    librosa.display.waveshow(y, sr=sr, alpha=0.6, color='#433be8')
    
    # Plot text segments
    # usage of alternating colors or height to avoid overlapping text if possible
    # For simplicity, we'll plot regions and place text above
    
    for i, segment in enumerate(transcript_data):
        start = segment['start_time']
        end = segment['end_time']
        text = segment['text']
        
        # Draw a shaded region
        color = 'rgba(53, 44, 227, 0.2)' if i % 2 == 0 else 'rgba(99, 102, 241, 0.2)'
        # matplotlib expects hex or name, let's use blue/indigo variation
        mpl_color = '#e0e7ff' if i % 2 == 0 else '#c7d2fe'
        
        plt.axvspan(start, end, color=mpl_color, alpha=0.5)
        
        # Add text label
        # We place it slightly above the waveform or centered in the region
        mid_point = (start + end) / 2
        
        # Simple text placement
        plt.text(
            mid_point, 
            0.8 * float(np.max(np.abs(y))), # Valid y position
            text, 
            horizontalalignment='center',
            verticalalignment='center',
            rotation=0,
            fontsize=9,
            color='#1e1b4b',
            clip_on=True,
            bbox=dict(facecolor='white', alpha=0.7, edgecolor='none', pad=1)
        )
        
    plt.xlim(0, duration)
    plt.title(f"Audio Alignment: {Path(audio_path).name}")
    plt.xlabel("Time (s)")
    plt.tight_layout()
    
    # Save figure
    plt.savefig(output_path, dpi=300)
    plt.close()
    print(f"Figure saved to {output_path}")
