import secrets
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.config import settings
from app.deps import get_db, get_current_user
from app.models.user import User
from app.models.file import File as DBFile
from app.models.shared_link import SharedLink
from app.schemas.shared_link import SharedLinkCreate, SharedLinkOut
from app.services import r2

router = APIRouter(tags=["shared"])


@router.post("/files/{file_id}/share", response_model=SharedLinkOut)
def create_share_link(
    file_id: int,
    payload: SharedLinkCreate,
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

    token = secrets.token_urlsafe(16)
    expires_at = datetime.now(timezone.utc) + timedelta(hours=payload.expires_in_hours)

    link = SharedLink(file_id=file_id, token=token, expires_at=expires_at)
    db.add(link)
    db.commit()
    db.refresh(link)

    return {
        "id": link.id,
        "file_id": link.file_id,
        "token": link.token,
        "expires_at": link.expires_at,
        "created_at": link.created_at,
        "share_url": f"{settings.FRONTEND_URL}/share/{token}",
    }


@router.get("/share/{token}")
def access_shared_file(token: str, db: Session = Depends(get_db)):
    link = db.query(SharedLink).filter(SharedLink.token == token).first()
    if not link:
        raise HTTPException(status_code=404, detail="Link not found")
    if link.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(status_code=410, detail="Link has expired")

    db_file = db.query(DBFile).filter(
        DBFile.id == link.file_id, DBFile.is_deleted.is_(False)
    ).first()
    if not db_file:
        raise HTTPException(status_code=404, detail="File not found")

    url = r2.generate_presigned_url(db_file.r2_key)
    return {"filename": db_file.name, "url": url, "expires_in": 3600}
