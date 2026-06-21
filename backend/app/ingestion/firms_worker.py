import os
import csv
import requests
from io import StringIO
from dotenv import load_dotenv
from app.models.fire import Fire
from app.database import SessionLocal

load_dotenv()
API_KEY = os.getenv("FIRMS_API_KEY")


class FIRMSWorker:

    def fetch(self):
        url = (
            f"https://firms.modaps.eosdis.nasa.gov"
            f"/api/area/csv/{API_KEY}"
            f"/MODIS_NRT/world/1"
        )

        response = requests.get(url)
        response.raise_for_status()

        return response.text

    def transform(self, raw_csv):

        reader = csv.DictReader(StringIO(raw_csv))
        fires = []

        for row in reader:
            try:
                fires.append({
                    "latitude": float(row["latitude"]),
                    "longitude": float(row["longitude"]),
                    "confidence": 100,
                    "brightness": float(row.get("brightness") or row.get("bright_ti4") or 0),
                    "satellite": row.get("satellite"),
                    "acquisition_date": row.get("acq_date"),
                    "acquisition_time": row.get("acq_time")
                })
            except Exception:
                continue

        return fires

    def store(self, fires):
        if not fires:
            print("No new data, keeping existing records.")
            return

        db = SessionLocal()

        try:
            db.query(Fire).delete()
            db.commit()

            fire_objects = [
                Fire(
                    latitude=fire["latitude"],
                    longitude=fire["longitude"],
                    confidence=fire["confidence"],
                    brightness=fire["brightness"],
                    satellite=fire.get("satellite"),
                    acquisition_date=fire.get("acquisition_date"),
                    acquisition_time=fire.get("acquisition_time")
                )
                for fire in fires
            ]

            db.bulk_save_objects(fire_objects)
            db.commit()

            print(f"Inserted {len(fire_objects)} fires")

        except Exception as e:
            db.rollback()
            print(f"Error: {e}")

        finally:
            db.close()

    def run(self):
        raw_data = self.fetch()
        transformed = self.transform(raw_data)
        print(f"Fetched {len(transformed)} fires")
        self.store(transformed)


if __name__ == "__main__":
    worker = FIRMSWorker()
    worker.run()