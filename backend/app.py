from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pathlib import Path
from backend.config import Settings
from backend.routes import config, schedule, loose_ends

def create_app() -> FastAPI:
    settings = Settings()
    app = FastAPI()

    # Adapter setup
    if settings.adapter == "notion":
        from backend.adapters.notion import NotionAdapter
        adapter = NotionAdapter(settings)
    else:
        raise ValueError(f"Unknown adapter: {settings.adapter}")

    app.state.schedule_adapter = adapter
    app.state.loose_ends_adapter = adapter
    app.state.settings = settings

    app.include_router(config.router)
    app.include_router(schedule.router)
    app.include_router(loose_ends.router)

    # Serve built Vite output
    dist_dir = Path(__file__).resolve().parent.parent / "dist"
    if dist_dir.exists():
        # Mount assets directory for hashed files
        assets_dir = dist_dir / "assets"
        if assets_dir.exists():
            app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

        # Catch-all: serve static files or fallback to index.html
        @app.get("/{path:path}")
        async def serve_spa(path: str):
            file_path = dist_dir / path
            if file_path.is_file():
                return FileResponse(file_path)
            return FileResponse(dist_dir / "index.html")

    return app
