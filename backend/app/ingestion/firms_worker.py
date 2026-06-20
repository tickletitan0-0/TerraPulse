import json
from pathlib import Path

from app.database import SessionLocal
from app.schemas.fire import FireCreate
from app.services.fire_service import FireService


class FIRMSWorker:

    def fetch(self):
        file_path = Path("data/fires.json")

        with open(file_path, "r") as file:
            data = json.load(file)

        return data

    def transform(self, data):
        return data

    def store(self, data):

        db = SessionLocal()

        try:

            for fire in data:

                exists = FireService.fire_exists(
                    db,
                    fire["latitude"],
                    fire["longitude"]
                )

                if exists:
                    continue

                fire_data = FireCreate(
                    latitude=fire["latitude"],
                    longitude=fire["longitude"],
                    confidence=fire["confidence"],
                    brightness=fire["brightness"]
                )

                FireService.create_fire(
                    db,
                    fire_data
                )

        finally:
            db.close()

    def run(self):
        data = self.fetch()

        transformed_data = self.transform(data)

        self.store(transformed_data)

        print(
            f"Imported {len(transformed_data)} fires"
        )


if __name__ == "__main__":
    worker = FIRMSWorker()

    worker.run()