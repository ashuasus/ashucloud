from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional


class FileOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    folder_id: Optional[int]
    owner_id: int
    size: int
    mime_type: str
    version: int
    created_at: datetime


class FileDownloadResponse(BaseModel):
    url: str
    expires_in: int
