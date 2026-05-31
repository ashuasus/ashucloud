from pydantic import BaseModel, ConfigDict
from datetime import datetime


class SharedLinkCreate(BaseModel):
    expires_in_hours: int = 24


class SharedLinkOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    file_id: int
    token: str
    expires_at: datetime
    created_at: datetime
    share_url: str
