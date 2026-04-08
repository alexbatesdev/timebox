from pydantic_settings import BaseSettings
import json
from pathlib import Path

class Settings(BaseSettings):
    adapter: str = "notion"
    notion_token: str = ""
    notion_database_id: str = ""
    notion_parent_page: str = ""
    notion_date_prop: str = "date"
    notion_title_prop: str = "Name"
    notion_custom_emoji_id: str = ""
    notion_loose_ends_db: str = ""
    schedule_config_path: str = "schedule-config.json"
    host: str = "0.0.0.0"
    port: int = 8000

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8", "extra": "ignore"}

    def load_schedule_config(self) -> dict:
        p = Path(self.schedule_config_path)
        if p.exists():
            return json.loads(p.read_text())
        return {"defaultType": "noStandup", "days": {}, "schedules": {}}
