from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
import app.models.user  # noqa: F401 – register models with Base
import app.models.folder  # noqa: F401
import app.models.file  # noqa: F401
import app.models.shared_link  # noqa: F401
from app.routers import auth, folders, files, shared

Base.metadata.create_all(bind=engine)

app = FastAPI(title="VaultBox API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(folders.router)
app.include_router(files.router)
app.include_router(shared.router)


@app.get("/health")
def health():
    return {"status": "ok"}
