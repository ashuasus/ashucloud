from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional


class FolderCreate(BaseModel):
    name: str
    parent_folder_id: Optional[int] = None


class FolderOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    parent_folder_id: Optional[int]
    owner_id: int
    created_at: datetime
