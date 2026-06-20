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