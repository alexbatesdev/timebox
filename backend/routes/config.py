from fastapi import APIRouter, Request

router = APIRouter()

@router.get("/api/config")
async def get_config(request: Request):
    settings = request.app.state.settings
    return settings.load_schedule_config()
