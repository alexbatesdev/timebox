from fastapi import APIRouter, Request, HTTPException
from backend.models import LoadTodayResponse, SaveScheduleRequest, SaveScheduleResponse

router = APIRouter()

@router.get("/api/schedule/today", response_model=LoadTodayResponse)
async def load_today(request: Request):
    adapter = request.app.state.schedule_adapter
    try:
        result = await adapter.load_today()
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))
    if result is None:
        return LoadTodayResponse(pageId=None, snapshot=None)
    return LoadTodayResponse(pageId=result["page_id"], snapshot=result["snapshot"])

@router.post("/api/schedule/save", response_model=SaveScheduleResponse)
async def save_schedule(req: SaveScheduleRequest, request: Request):
    adapter = request.app.state.schedule_adapter
    try:
        page_id = await adapter.save_schedule(
            page_id=req.pageId,
            sched_type=req.snapshot.schedType,
            blocks=[b.model_dump() for b in req.snapshot.blocks],
            tasks=req.snapshot.tasks,
            wrapup=req.snapshot.wrapup.model_dump(),
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))
    return SaveScheduleResponse(pageId=page_id)
