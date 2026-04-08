from pydantic import BaseModel
from typing import Optional

class Block(BaseModel):
    id: str
    label: str
    start: int
    end: int
    type: str

class Wrapup(BaseModel):
    left: str = ""
    next: str = ""

class ScheduleSnapshot(BaseModel):
    schedType: str
    blocks: list[Block]
    tasks: dict[str, str]
    wrapup: Wrapup

class LoadTodayResponse(BaseModel):
    pageId: Optional[str] = None
    snapshot: Optional[ScheduleSnapshot] = None

class SaveScheduleRequest(BaseModel):
    pageId: Optional[str] = None
    snapshot: ScheduleSnapshot

class SaveScheduleResponse(BaseModel):
    pageId: str

class LooseEndItem(BaseModel):
    id: str
    title: str

class AddLooseEndRequest(BaseModel):
    title: str
