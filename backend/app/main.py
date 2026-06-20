from fastapi import FastAPI

from app.database import Base
from app.database import engine

from app.routers.fires import router as fire_router

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Terrapulse")

app.include_router(fire_router)


@app.get("/")
def root():
    return {"status": "running"}