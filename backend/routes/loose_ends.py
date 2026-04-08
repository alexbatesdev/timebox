from fastapi import APIRouter, Request, HTTPException
from backend.models import LooseEndItem, AddLooseEndRequest

router = APIRouter()

@router.get("/api/loose-ends", response_model=list[LooseEndItem])
async def list_loose_ends(request: Request):
    adapter = request.app.state.loose_ends_adapter
    try:
        return await adapter.list_items()
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))

@router.post("/api/loose-ends", response_model=LooseEndItem)
async def add_loose_end(req: AddLooseEndRequest, request: Request):
    adapter = request.app.state.loose_ends_adapter
    try:
        return await adapter.add_item(req.title)
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))

@router.post("/api/loose-ends/{item_id}/complete")
async def complete_loose_end(item_id: str, request: Request):
    adapter = request.app.state.loose_ends_adapter
    try:
        await adapter.complete_item(item_id)
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))
    return {"ok": True}

@router.delete("/api/loose-ends/{item_id}")
async def delete_loose_end(item_id: str, request: Request):
    adapter = request.app.state.loose_ends_adapter
    try:
        await adapter.delete_item(item_id)
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))
    return {"ok": True}
