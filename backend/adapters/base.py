from typing import Protocol, Optional, runtime_checkable
from backend.models import LooseEndItem

@runtime_checkable
class ScheduleAdapter(Protocol):
    async def load_today(self) -> Optional[dict]:
        ...
    async def save_schedule(self, page_id: Optional[str], sched_type: str, blocks: list[dict], tasks: dict[str, str], wrapup: dict[str, str]) -> str:
        ...

@runtime_checkable
class LooseEndsAdapter(Protocol):
    async def list_items(self) -> list[LooseEndItem]:
        ...
    async def add_item(self, title: str) -> LooseEndItem:
        ...
    async def complete_item(self, item_id: str) -> None:
        ...
    async def delete_item(self, item_id: str) -> None:
        ...
