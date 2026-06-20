from sqlalchemy.orm import Session
from app.schemas.fire import FireCreate
from app.models.fire import Fire


class FireService:

    @staticmethod
    def create_fire(
        db: Session,
        fire: FireCreate
    ):
        db_fire = Fire(**fire.model_dump())

        db.add(db_fire)
        db.commit()
        db.refresh(db_fire)

        return db_fire

    @staticmethod
    def get_all_fires(
        db: Session
    ):
        return db.query(Fire).all()

    @staticmethod
    def delete_fire(
        db: Session,
        fire_id: int
    ):
        fire = (
            db.query(Fire)
            .filter(Fire.id == fire_id)
            .first()
        )

        if not fire:
            return None

        db.delete(fire)
        db.commit()

        return fire
    
    @staticmethod
    def fire_exists(
        db,
        latitude,
        longitude
    ):
        return (
            db.query(Fire)
            .filter(
                Fire.latitude == latitude,
                Fire.longitude == longitude
            )
            .first()
        )