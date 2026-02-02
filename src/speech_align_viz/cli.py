import click
import uvicorn
import os

import click
import uvicorn
import os
from pathlib import Path
from speech_align_viz.app import parse_transcript

@click.group()
def main():
    """SpeechAlignViz CLI tool."""
    pass

@main.command()
@click.option('--host', default='127.0.0.1', help='Host to bind to.')
@click.option('--port', default=8000, help='Port to bind to.')
@click.option('--reload', is_flag=True, help='Enable auto-reload.')
def serve(host, port, reload):
    """Start the SpeechAlignViz server."""
    click.echo(f"Starting SpeechAlignViz on http://{host}:{port}")
    
    # If we are running from source and want reload, we need to pass the import string
    if reload:
        uvicorn.run("speech_align_viz.app:app", host=host, port=port, reload=True)
    else:
        from speech_align_viz.app import app
        uvicorn.run(app, host=host, port=port)

@main.command()
@click.option('--audio', required=True, help='Path to audio file (wav, mp3, etc).')
@click.option('--subtitle', required=True, help='Path to subtitle file (srt, vtt, json, textgrid).')
@click.option('--output-fig', required=True, help='Path to output figure (png, jpg).')
@click.option('--width', default=None, type=float, help='Figure width in inches. If not specified, automatically calculated based on duration.')
@click.option('--height', default=4.0, help='Figure height in inches.')
def export(audio, subtitle, output_fig, width, height):
    """Export alignment visualization to a static figure."""
    from speech_align_viz.figure import generate_figure
    
    if not os.path.exists(audio):
        click.echo(f"Error: Audio file not found: {audio}", err=True)
        return
        
    if not os.path.exists(subtitle):
        click.echo(f"Error: Subtitle file not found: {subtitle}", err=True)
        return
    
    click.echo(f"Parsing transcript: {subtitle}")
    try:
        with open(subtitle, 'r', encoding='utf-8') as f:
            content = f.read()
        
        transcript_data = parse_transcript(content, subtitle)
    except Exception as e:
        click.echo(f"Error parsing transcript: {e}", err=True)
        return
    
    click.echo("Generating figure...")
    try:
        generate_figure(
            audio_path=audio,
            transcript_data=transcript_data,
            output_path=output_fig,
            width=width,
            height=height
        )
        click.echo(f"Successfully saved figure to {output_fig}")
    except Exception as e:
        click.echo(f"Error generating figure: {e}", err=True)

if __name__ == '__main__':
    main()
