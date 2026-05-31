from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File as FastAPIFile
from fastapi.encoders import jsonable_encoder
from sqlalchemy.orm import Session
from app.deps import get_db, get_current_user
from app.models.user import User
from app.models.file import File as DBFile
from app.models.folder import Folder
from app.schemas.file import FileOut, FileDownloadResponse
from app.services import r2, cache

router = APIRouter(prefix="/files", tags=["files"])


def _build_r2_key(owner_id: int, filename: str, version: int) -> str:
    if "." in filename:
        name, ext = filename.rsplit(".", 1)
        return f"users/{owner_id}/{name}_v{version}.{ext}"
    return f"users/{owner_id}/{filename}_v{version}"


@router.post("/upload", response_model=FileOut)
async def upload_file(
    file: UploadFile = FastAPIFile(...),
    folder_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if folder_id is not None:
        folder = db.query(Folder).filter(
            Folder.id == folder_id, Folder.owner_id == current_user.id
        ).first()
        if not folder:
            raise HTTPException(status_code=404, detail="Folder not found")

    latest = (
        db.query(DBFile)
        .filter(
            DBFile.name == file.filename,
            DBFile.owner_id == current_user.id,
            DBFile.folder_id == folder_id,
            DBFile.is_deleted.is_(False),
        )
        .order_by(DBFile.version.desc())
        .first()
    )
    version = (latest.version + 1) if latest else 1

    content = await file.read()
    mime = file.content_type or "application/octet-stream"
    r2_key = _build_r2_key(current_user.id, file.filename, version)
    r2.upload_file(content, r2_key, mime)

    db_file = DBFile(
        name=file.filename,
        folder_id=folder_id,
        owner_id=current_user.id,
        r2_key=r2_key,
        size=len(content),
        mime_type=mime,
        version=version,
    )
    db.add(db_file)
    db.commit()
    db.refresh(db_file)
    return db_file


@router.get("", response_model=List[FileOut])
def list_files(
    folder_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(DBFile).filter(
        DBFile.owner_id == current_user.id,
        DBFile.is_deleted.is_(False),
    )
    if folder_id is not None:
        query = query.filter(DBFile.folder_id == folder_id)
    else:
        query = query.filter(DBFile.folder_id.is_(None))
    return query.all()


# /files/search must be declared before /files/{file_id} to avoid path conflict
@router.get("/search", response_model=List[FileOut])
def search_files(
    q: str = Query(..., min_length=1),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(DBFile)
        .filter(
            DBFile.owner_id == current_user.id,
            DBFile.is_deleted.is_(False),
            DBFile.name.ilike(f"%{q}%"),
        )
        .all()
    )


@router.get("/{file_id}", response_model=FileOut)
def get_file(
    file_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    cached = cache.cache_get(f"file:{file_id}:{current_user.id}")
    if cached:
        return cached

    db_file = db.query(DBFile).filter(
        DBFile.id == file_id,
        DBFile.owner_id == current_user.id,
        DBFile.is_deleted.is_(False),
    ).first()
    if not db_file:
        raise HTTPException(status_code=404, detail="File not found")

    cache.cache_set(f"file:{file_id}:{current_user.id}", jsonable_encoder(FileOut.model_validate(db_file)))
    return db_file


@router.get("/{file_id}/download", response_model=FileDownloadResponse)
def download_file(
    file_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db_file = db.query(DBFile).filter(
        DBFile.id == file_id,
        DBFile.owner_id == current_user.id,
        DBFile.is_deleted.is_(False),
    ).first()
    if not db_file:
        raise HTTPException(status_code=404, detail="File not found")

    url = r2.generate_presigned_url(db_file.r2_key)
    return {"url": url, "expires_in": 3600}


@router.delete("/{file_id}", status_code=204)
def delete_file(
    file_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db_file = db.query(DBFile).filter(
        DBFile.id == file_id,
        DBFile.owner_id == current_user.id,
        DBFile.is_deleted.is_(False),
    ).first()
    if not db_file:
        raise HTTPException(status_code=404, detail="File not found")

    db_file.is_deleted = True
    db_file.deleted_at = datetime.now(timezone.utc)
    db.commit()
    cache.cache_delete(f"file:{file_id}:{current_user.id}")
