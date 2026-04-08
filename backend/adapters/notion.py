from __future__ import annotations

import json
import re
from datetime import date
from typing import Any, Optional
from urllib.parse import quote

import httpx

from backend.config import Settings
from backend.models import LooseEndItem

NOTION_VERSION = "2022-06-28"
TIMEBOX_STATE_LABEL = "_timebox_state"


class NotionAdapter:
    """Notion-backed adapter implementing ScheduleAdapter and LooseEndsAdapter protocols."""

    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._client = httpx.AsyncClient(
            base_url="https://api.notion.com/v1",
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {settings.notion_token}",
                "Notion-Version": NOTION_VERSION,
            },
            timeout=30.0,
        )

    # ── Protocol: ScheduleAdapter ────────────────────────────────────

    async def load_today(self) -> Optional[dict]:
        page = await self._query_today_entry()
        if page is None:
            return None
        page_id: str = page["id"]
        children = await self._fetch_all_block_children(page_id)
        full_children = await self._fetch_block_children_recursive(children)
        return {
            "pageId": page_id,
            "snapshot": self._extract_snapshot_from_blocks(full_children),
        }

    async def save_schedule(
        self,
        page_id: Optional[str],
        sched_type: str,
        blocks: list[dict],
        tasks: dict[str, str],
        wrapup: dict[str, str],
    ) -> str:
        payload = self._build_notion_payload(page_id, sched_type, blocks, tasks, wrapup)
        if page_id:
            children = payload.pop("children", [])
            await self._replace_page_content(page_id, children)
            # Update properties on existing page
            res = await self._client.patch(f"/pages/{page_id}", json={
                "properties": payload.get("properties", {}),
            })
            if res.status_code >= 400:
                body = self._safe_json(res)
                raise RuntimeError(body.get("message", f"Failed to update page ({res.status_code})"))
            return page_id
        else:
            res = await self._client.post("/pages", json=payload)
            if res.status_code >= 400:
                body = self._safe_json(res)
                raise RuntimeError(body.get("message", f"Failed to create page ({res.status_code})"))
            data = res.json()
            return data["id"]

    # ── Protocol: LooseEndsAdapter ───────────────────────────────────

    async def list_items(self) -> list[LooseEndItem]:
        db_id = self._settings.notion_loose_ends_db
        res = await self._client.post(f"/databases/{db_id}/query", json={
            "filter": {
                "property": "Done",
                "checkbox": {"equals": False},
            },
            "sorts": [{"timestamp": "created_time", "direction": "ascending"}],
        })
        if res.status_code >= 400:
            raise RuntimeError(f"Failed to fetch loose ends ({res.status_code})")
        data = res.json()
        items: list[LooseEndItem] = []
        for page in data.get("results", []):
            name_prop = page.get("properties", {}).get("Name", {}).get("title", [])
            title = ""
            if name_prop:
                title = name_prop[0].get("plain_text") or name_prop[0].get("text", {}).get("content", "")
            items.append(LooseEndItem(id=page["id"], title=title))
        return items

    async def add_item(self, title: str) -> LooseEndItem:
        db_id = self._settings.notion_loose_ends_db
        res = await self._client.post("/pages", json={
            "parent": {"database_id": db_id},
            "properties": {
                "Name": {"title": [{"type": "text", "text": {"content": title}}]},
                "Done": {"checkbox": False},
            },
        })
        if res.status_code >= 400:
            raise RuntimeError(f"Failed to add loose end ({res.status_code})")
        data = res.json()
        return LooseEndItem(id=data["id"], title=title)

    async def complete_item(self, item_id: str) -> None:
        res = await self._client.patch(f"/pages/{item_id}", json={
            "properties": {"Done": {"checkbox": True}},
        })
        if res.status_code >= 400:
            raise RuntimeError(f"Failed to complete loose end ({res.status_code})")

    async def delete_item(self, item_id: str) -> None:
        res = await self._client.patch(f"/pages/{item_id}", json={
            "archived": True,
        })
        if res.status_code >= 400:
            raise RuntimeError(f"Failed to delete loose end ({res.status_code})")

    # ── HTTP helpers ─────────────────────────────────────────────────

    @staticmethod
    def _safe_json(res: httpx.Response) -> dict:
        try:
            return res.json()
        except Exception:
            return {}

    async def _fetch_all_block_children(self, block_id: str) -> list[dict]:
        results: list[dict] = []
        cursor: Optional[str] = None
        while True:
            params: dict[str, str] = {}
            if cursor:
                params["start_cursor"] = cursor
            res = await self._client.get(f"/blocks/{block_id}/children", params=params)
            if res.status_code >= 400:
                body = self._safe_json(res)
                raise RuntimeError(
                    body.get("message", f"Failed to fetch block children ({res.status_code})")
                )
            data = res.json()
            results.extend(data.get("results", []))
            if data.get("has_more"):
                cursor = data.get("next_cursor")
            else:
                break
        return results

    async def _fetch_block_children_recursive(self, notion_blocks: list[dict]) -> list[dict]:
        out: list[dict] = []
        for block in notion_blocks:
            if not block.get("has_children"):
                out.append(block)
            else:
                children = await self._fetch_all_block_children(block["id"])
                block_copy = {**block, "children": await self._fetch_block_children_recursive(children)}
                out.append(block_copy)
        return out

    async def _query_today_entry(self) -> Optional[dict]:
        db_id = self._settings.notion_database_id
        token = self._settings.notion_token
        if not token or not db_id:
            return None
        date_prop = self._settings.notion_date_prop
        today_iso = date.today().isoformat()
        res = await self._client.post(f"/databases/{db_id}/query", json={
            "filter": {
                "property": date_prop,
                "date": {"equals": today_iso},
            },
            "page_size": 1,
        })
        if res.status_code >= 400:
            body = self._safe_json(res)
            raise RuntimeError(body.get("message", f"Failed to query Notion ({res.status_code})"))
        data = res.json()
        results = data.get("results", [])
        return results[0] if results else None

    async def _replace_page_content(self, page_id: str, children: list[dict]) -> None:
        existing = await self._fetch_all_block_children(page_id)
        for child in existing:
            res = await self._client.delete(f"/blocks/{child['id']}")
            if res.status_code >= 400:
                body = self._safe_json(res)
                raise RuntimeError(
                    body.get("message", f"Failed to clear page content ({res.status_code})")
                )
        res = await self._client.patch(f"/blocks/{page_id}/children", json={"children": children})
        if res.status_code >= 400:
            body = self._safe_json(res)
            raise RuntimeError(
                body.get("message", f"Failed to append page content ({res.status_code})")
            )

    # ── Rich-text helpers ────────────────────────────────────────────

    @staticmethod
    def _to_rich_text(content: str) -> list[dict]:
        content = content or ""
        chunks = re.findall(r"[\s\S]{1,2000}", content)
        if not chunks:
            return [{"type": "text", "text": {"content": ""}}]
        return [{"type": "text", "text": {"content": c}} for c in chunks]

    @staticmethod
    def _emoji_icon(emoji: str) -> dict:
        return {"type": "emoji", "emoji": emoji}

    @staticmethod
    def _custom_emoji_icon(emoji_id: str) -> dict:
        return {"type": "custom_emoji", "custom_emoji": {"id": emoji_id}}

    def _work_icon(self) -> dict:
        eid = self._settings.notion_custom_emoji_id
        if eid:
            return self._custom_emoji_icon(eid)
        return self._emoji_icon("💻")

    def _notion_callout(self, icon: dict, text: str) -> dict:
        return {
            "object": "block",
            "type": "callout",
            "callout": {
                "icon": icon,
                "color": "gray_background",
                "rich_text": self._to_rich_text(text),
            },
        }

    @staticmethod
    def _build_timebox_snapshot(
        sched_type: str, blocks: list[dict], tasks: dict[str, str], wrapup: dict[str, str]
    ) -> dict:
        return {
            "schedType": sched_type,
            "blocks": blocks,
            "tasks": tasks,
            "wrapup": wrapup,
        }

    # ── Time helpers (ported from utils/time.js) ─────────────────────

    @staticmethod
    def _workday_hour(h: int) -> int:
        """Hours 1-8 are PM (add 12)."""
        return h + 12 if 1 <= h <= 8 else h

    @staticmethod
    def _fmt_time_short(mins: int) -> str:
        """12-hour format without AM/PM."""
        h = (mins // 60) % 24
        m = mins % 60
        h12 = 12 if h == 0 else (h - 12 if h > 12 else h)
        return f"{h12}:{m:02d}"

    @staticmethod
    def _to_min(h: int, m: int) -> int:
        return h * 60 + m

    # ── Parsing helpers (ported from parsing.js) ─────────────────────

    @staticmethod
    def _notion_rich_text_to_plain(rich_text: list[dict] | None) -> str:
        if not rich_text:
            return ""
        return "".join(
            item.get("plain_text") or item.get("text", {}).get("content", "")
            for item in rich_text
        )

    @staticmethod
    def _parse_snapshot_text(text: str) -> Optional[dict]:
        try:
            parsed = json.loads(text)
        except (json.JSONDecodeError, TypeError):
            return None
        if not isinstance(parsed, dict):
            return None
        if parsed.get("schedType") not in ("standup", "noStandup"):
            return None
        wrapup_raw = parsed.get("wrapup")
        if isinstance(wrapup_raw, dict):
            wrapup = {"left": wrapup_raw.get("left", ""), "next": wrapup_raw.get("next", "")}
        else:
            wrapup = {"left": "", "next": ""}
        return {
            "schedType": parsed["schedType"],
            "blocks": parsed.get("blocks") if isinstance(parsed.get("blocks"), list) else [],
            "tasks": parsed.get("tasks") if isinstance(parsed.get("tasks"), dict) else {},
            "wrapup": wrapup,
        }

    def _parse_time_range(self, text: str) -> Optional[dict]:
        m = re.match(r"^(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2}):\s*(.+)$", text)
        if not m:
            return None
        sh, sm, eh, em, label = m.groups()
        return {
            "start": self._workday_hour(int(sh)) * 60 + int(sm),
            "end": self._workday_hour(int(eh)) * 60 + int(em),
            "label": label.strip(),
        }

    @staticmethod
    def _infer_sched_type_from_blocks(parsed_blocks: list[dict]) -> str:
        plan = next((b for b in parsed_blocks if b.get("id") == "plan"), None)
        if plan and plan["end"] - plan["start"] == 30:
            return "standup"
        return "noStandup"

    @staticmethod
    def _infer_block_type(label: str, child_text: str) -> str:
        if label == "Wrap up":
            return "wrapup"
        if label == "Away":
            return "away"
        if label in ("Lunch", "Break"):
            return "break"
        if "Flex" in label:
            return "flex-work"
        if child_text.startswith("Notes:"):
            return "meeting"
        return "work"

    def _parse_legacy_notion_blocks(self, notion_blocks: list[dict]) -> Optional[dict]:
        parsed_blocks: list[dict] = []
        tasks: dict[str, str] = {}
        wrapup: dict[str, str] = {"left": "", "next": ""}

        id_map = {
            "Plan the day": "plan",
            "Standup": "sdup",
            "Block A": "A",
            "Block B": "B",
            "Block C": "C",
            "Lunch": "lunch",
            "Wrap up": "wrap",
        }

        for block in notion_blocks:
            if block.get("type") != "toggle":
                continue
            title = self._notion_rich_text_to_plain(block.get("toggle", {}).get("rich_text"))
            if title == TIMEBOX_STATE_LABEL:
                continue
            parsed_title = self._parse_time_range(title)
            if parsed_title is None:
                continue

            children = block.get("children", [])
            child_text = "\n".join(
                self._notion_rich_text_to_plain(c.get("callout", {}).get("rich_text"))
                for c in children
                if c.get("type") == "callout"
            )
            block_type = self._infer_block_type(parsed_title["label"], child_text)

            fallback_break_id = "brk1" if parsed_title["start"] < self._to_min(12, 0) else "brk2"

            if block_type == "meeting" and parsed_title["label"] != "Standup":
                block_id = f"mtg_{parsed_title['start']}_{parsed_title['end']}_{parsed_title['label']}"
            elif "Block D" in parsed_title["label"]:
                block_id = "D"
            else:
                block_id = id_map.get(parsed_title["label"], fallback_break_id)

            parsed_blocks.append({
                "id": block_id,
                "label": parsed_title["label"],
                "start": parsed_title["start"],
                "end": parsed_title["end"],
                "type": block_type,
            })

            if block_type in ("work", "flex-work"):
                tasks[block_id] = child_text
            elif block_type == "meeting":
                tasks[block_id] = re.sub(r"^Notes:\n?", "", child_text)
            elif block_type == "wrapup":
                left_match = re.search(r"Where I left off:\n([\s\S]*?)(?:\nWhat's next:|$)", child_text)
                next_match = re.search(r"What's next:\n([\s\S]*)$", child_text)
                wrapup["left"] = (left_match.group(1).strip() if left_match else "")
                wrapup["next"] = (next_match.group(1).strip() if next_match else "")

        if not parsed_blocks:
            return None
        return {
            "schedType": self._infer_sched_type_from_blocks(parsed_blocks),
            "blocks": parsed_blocks,
            "tasks": tasks,
            "wrapup": wrapup,
        }

    def _extract_snapshot_from_blocks(self, notion_blocks: list[dict]) -> Optional[dict]:
        state_toggle = next(
            (
                b for b in notion_blocks
                if b.get("type") == "toggle"
                and self._notion_rich_text_to_plain(b.get("toggle", {}).get("rich_text")) == TIMEBOX_STATE_LABEL
            ),
            None,
        )
        code_block = None
        if state_toggle:
            code_block = next(
                (c for c in state_toggle.get("children", []) if c.get("type") == "code"),
                None,
            )
        snapshot = None
        if code_block:
            snapshot = self._parse_snapshot_text(
                self._notion_rich_text_to_plain(code_block.get("code", {}).get("rich_text"))
            )
        return snapshot if snapshot is not None else self._parse_legacy_notion_blocks(notion_blocks)

    # ── Payload building (ported from payload.js) ────────────────────

    def _build_state_block(self, snapshot: dict) -> dict:
        return {
            "object": "block",
            "type": "toggle",
            "toggle": {
                "rich_text": [{"type": "text", "text": {"content": TIMEBOX_STATE_LABEL}}],
                "children": [
                    {
                        "object": "block",
                        "type": "code",
                        "code": {
                            "rich_text": self._to_rich_text(json.dumps(snapshot)),
                            "language": "json",
                        },
                    }
                ],
            },
        }

    def _build_notion_payload(
        self,
        parent_page_id: Optional[str],
        sched_type: str,
        blocks: list[dict],
        tasks: dict[str, str],
        wrapup: dict[str, str],
    ) -> dict:
        mode_label = "M" if sched_type == "standup" else "T"
        snapshot = self._build_timebox_snapshot(sched_type, blocks, tasks, wrapup)
        children: list[dict] = [self._build_state_block(snapshot)]

        for b in blocks:
            time_str = f"{self._fmt_time_short(b['start'])}-{self._fmt_time_short(b['end'])}"
            task = tasks.get(b.get("id", ""), "")
            callouts: list[dict] = []

            btype = b.get("type", "")
            if btype in ("work", "flex-work"):
                callouts.append(self._notion_callout(self._work_icon(), task or ""))
            elif btype == "meeting":
                callouts.append(
                    self._notion_callout(
                        self._emoji_icon("✏️"),
                        f"Notes:\n{task}" if task else "Notes:",
                    )
                )
            elif btype == "wrapup":
                callouts.append(
                    self._notion_callout(
                        self._emoji_icon("💻"),
                        f"Where I left off:\n{wrapup.get('left', '')}",
                    )
                )
                callouts.append(
                    self._notion_callout(
                        self._emoji_icon("💾"),
                        f"What's next:\n{wrapup.get('next', '')}",
                    )
                )
            elif btype == "away":
                callouts.append(self._notion_callout(self._emoji_icon("⏸️"), "Away"))
            # break blocks get no callouts

            item: dict[str, Any] = {
                "object": "block",
                "type": "toggle",
                "toggle": {
                    "rich_text": [
                        {"type": "text", "text": {"content": f"{time_str}: {b['label']}"}}
                    ],
                },
            }
            if callouts:
                item["toggle"]["children"] = callouts
            children.append(item)

        db_id = self._settings.notion_database_id
        today_iso = date.today().isoformat()
        title_rich_text: list[dict] = [
            {"type": "mention", "mention": {"type": "date", "date": {"start": today_iso}}},
            {"type": "text", "text": {"content": f"'s Schedule ({mode_label})"}},
        ]

        if db_id:
            title_prop = self._settings.notion_title_prop
            date_prop = self._settings.notion_date_prop
            return {
                "parent": {"database_id": db_id},
                "properties": {
                    title_prop: {"title": title_rich_text},
                    date_prop: {"date": {"start": today_iso}},
                },
                "children": children,
            }

        return {
            "parent": {"page_id": parent_page_id},
            "properties": {
                "title": title_rich_text,
            },
            "children": children,
        }
