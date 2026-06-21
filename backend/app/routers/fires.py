from fastapi import APIRouter
from fastapi import Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.fire import Fire
from app.schemas.fire import FireCreate
from app.services.fire_service import FireService

router = APIRouter(
    prefix="/fires",
    tags=["fires"]
)


@router.post("/")
def create_fire(
    fire: FireCreate,
    db: Session = Depends(get_db)
):
    return FireService.create_fire(db, fire)


@router.get("/")
def get_fires(
    db: Session = Depends(get_db)
):
    return FireService.get_all_fires(db)

@router.delete("/{fire_id}")
def delete_fire(
    fire_id: int,
    db: Session = Depends(get_db)
):
    return FireService.delete_fire(
        db,
        fire_id
    )

@router.get("/stats")
def get_stats(
    db: Session = Depends(get_db)
):
    return FireService.get_stats(db)

@router.get("/latest")
def get_latest_fires(
    db: Session = Depends(get_db)
):
    return FireService.get_latest_fires(db)

@router.get("/high-risk")
def get_high_risk_fires(
    db: Session = Depends(get_db)
):
    return FireService.get_high_risk_fires(db)

@router.get("/confidence/{value}")
def get_by_confidence(
    value: int,
    db: Session = Depends(get_db)
):
    return FireService.get_by_confidence(
        db,
        value
    )

@router.get("/map")
def get_map_data(
    db: Session = Depends(get_db)
):
    return FireService.get_map_data(db)

@router.get("/top")
def get_top_fires(
    db: Session = Depends(get_db)
):

    fires = (
        FireService
        .get_top_hottest_fires(db)
    )

    return [
        {
            "brightness": fire.brightness,
            "latitude": fire.latitude,
            "longitude": fire.longitude,
            "satellite": fire.satellite,
            "date": fire.acquisition_date,
            "acquisition_time": fire.acquisition_time
        }
        for fire in fires
    ]