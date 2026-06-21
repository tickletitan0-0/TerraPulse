from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.air_quality_service import AirQualityService

router = APIRouter(prefix="/air-quality", tags=["air-quality"])


@router.get("/stats")
def get_stats(db: Session = Depends(get_db)):
    return AirQualityService.get_stats(db)


@router.get("/map")
def get_map_data(db: Session = Depends(get_db)):
    return AirQualityService.get_map_data(db)


@router.get("/top")
def get_top(db: Session = Depends(get_db)):
    return AirQualityService.get_top(db)
