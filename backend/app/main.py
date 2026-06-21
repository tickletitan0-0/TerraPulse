from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import Base, engine
from app.routers.fires import router as fire_router

from apscheduler.schedulers.background import BackgroundScheduler
from app.ingestion.firms_worker import FIRMSWorker

def run_worker():
    worker = FIRMSWorker()
    worker.run()

scheduler = BackgroundScheduler()
scheduler.add_job(run_worker, "interval", minutes=60)
scheduler.start()

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Terrapulse")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(fire_router)

@app.get("/")
def root():
    return {"status": "running"}