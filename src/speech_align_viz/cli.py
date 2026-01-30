import click
import uvicorn
import os

@click.command()
@click.option('--host', default='127.0.0.1', help='Host to bind to.')
@click.option('--port', default=8000, help='Port to bind to.')
@click.option('--reload', is_flag=True, help='Enable auto-reload.')
def main(host, port, reload):
    """Start the SpeechAlignViz server."""
    click.echo(f"Starting SpeechAlignViz on http://{host}:{port}")
    
    # If we are running from source and want reload, we need to pass the import string
    if reload:
        uvicorn.run("speech_align_viz.app:app", host=host, port=port, reload=True)
    else:
        from speech_align_viz.app import app
        uvicorn.run(app, host=host, port=port)

if __name__ == '__main__':
    main()
