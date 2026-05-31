from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.deps import get_db, get_current_user
from app.models.user import User
from app.models.folder import Folder
from app.models.file import File
from app.schemas.folder import FolderCreate, FolderOut

router = APIRouter(prefix="/folders", tags=["folders"])


def _recursive_soft_delete(db: Session, folder_id: int) -> None:
    now = datetime.now(timezone.utc)
    db.query(File).filter(File.folder_id == folder_id).update(
        {"is_deleted": True, "deleted_at": now}, synchronize_session=False
    )
    sub_folders = db.query(Folder).filter(Folder.parent_folder_id == folder_id).all()
    for sub in sub_folders:
        _recursive_soft_delete(db, sub.id)
    db.query(Folder).filter(Folder.id == folder_id).delete(synchronize_session=False)


@router.post("", response_model=FolderOut, status_code=status.HTTP_201_CREATED)
def create_folder(
    payload: FolderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if payload.parent_folder_id:
        parent = db.query(Folder).filter(
            Folder.id == payload.parent_folder_id,
            Folder.owner_id == current_user.id,
        ).first()
        if not parent:
            raise HTTPException(status_code=404, detail="Parent folder not found")

    folder = Folder(
        name=payload.name,
        parent_folder_id=payload.parent_folder_id,
        owner_id=current_user.id,
    )
    db.add(folder)
    db.commit()
    db.refresh(folder)
    return folder


@router.get("", response_model=List[FolderOut])
def list_folders(
    parent_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Folder).filter(Folder.owner_id == current_user.id)
    if parent_id is not None:
        query = query.filter(Folder.parent_folder_id == parent_id)
    else:
        query = query.filter(Folder.parent_folder_id.is_(None))
    return query.all()


@router.get("/{folder_id}", response_model=FolderOut)
def get_folder(
    folder_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    folder = db.query(Folder).filter(
        Folder.id == folder_id, Folder.owner_id == current_user.id
    ).first()
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")
    return folder


@router.delete("/{folder_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_folder(
    folder_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    folder = db.query(Folder).filter(
        Folder.id == folder_id, Folder.owner_id == current_user.id
    ).first()
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")
    _recursive_soft_delete(db, folder_id)
    db.commit()
