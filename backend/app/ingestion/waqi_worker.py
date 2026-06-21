import os
from dotenv import load_dotenv
import requests
from app.models.air_quality import AirQuality
from app.database import SessionLocal

load_dotenv()
API_KEY = os.getenv("WAQI_API_KEY")

# Whole-world bounding box: "lat1,lng1,lat2,lng2" = southwest corner, then
# northeast corner. WAQI's /map/bounds/ endpoint needs an actual box, not a
# keyword like "world", so this is the single box that covers everywhere.
WORLD_BOUNDS = "-90,-180,90,180"

# WAQI's bulk bounds call gives AQI + coordinates + station name for every
# station in one request, but not the per-pollutant breakdown (PM2.5/PM10/
# O3/etc) — that needs one /feed/ call per station. Rather than doing that
# for every station (could be thousands worldwide), we only fetch full detail
# for the worst N stations, since those are what the detail panel cares about.
TOP_N_DETAILED = 15


class WAQIWorker:

    def fetch_bounds(self):
        url = (
            f"https://api.waqi.info/map/bounds/"
            f"?latlng={WORLD_BOUNDS}&token={API_KEY}"
        )

        response = requests.get(url)
        response.raise_for_status()
        payload = response.json()

        if payload.get("status") != "ok":
            raise RuntimeError(f"WAQI bounds request failed: {payload}")

        return payload.get("data", [])

    def fetch_station_detail(self, station_uid):
        url = f"https://api.waqi.info/feed/@{station_uid}/?token={API_KEY}"

        try:
            response = requests.get(url)
            response.raise_for_status()
            payload = response.json()
        except Exception:
            return None

        if payload.get("status") != "ok":
            return None

        return payload.get("data")

    def transform(self, raw_stations):
        # Keyed by uid to silently de-duplicate — guards against the bounds
        # endpoint ever returning the same station twice in one response.
        stations = {}

        for entry in raw_stations:
            try:
                aqi_raw = entry.get("aqi")
                if aqi_raw in (None, "-", ""):
                    continue  # station has no current reading

                uid = int(entry["uid"])
                station_info = entry.get("station") or {}

                stations[uid] = {
                    "station_uid": uid,
                    "station_name": station_info.get("name"),
                    "latitude": float(entry["lat"]),
                    "longitude": float(entry["lon"]),
                    "aqi": int(float(aqi_raw)),
                    "station_time": station_info.get("time"),
                }
            except Exception:
                continue

        return list(stations.values())

    def attach_pollutant_detail(self, stations):
        worst = sorted(stations, key=lambda s: s["aqi"], reverse=True)[:TOP_N_DETAILED]

        for station in worst:
            detail = self.fetch_station_detail(station["station_uid"])
            if not detail:
                continue

            iaqi = detail.get("iaqi", {})
            station["pm25"] = (iaqi.get("pm25") or {}).get("v")
            station["pm10"] = (iaqi.get("pm10") or {}).get("v")
            station["o3"] = (iaqi.get("o3") or {}).get("v")
            station["no2"] = (iaqi.get("no2") or {}).get("v")
            station["so2"] = (iaqi.get("so2") or {}).get("v")
            station["co"] = (iaqi.get("co") or {}).get("v")
            station["dominant_pollutant"] = detail.get("dominentpol")

        return stations

    def store(self, stations):
        if not stations:
            print("No air quality data, keeping existing records.")
            return

        db = SessionLocal()

        try:
            # Delete and insert in the SAME transaction (single commit at the
            # end) — same reasoning as the fires worker: a separate commit
            # after the delete would let concurrent requests see an empty
            # table for the gap between the two commits.
            db.query(AirQuality).delete(synchronize_session=False)

            objects = [
                AirQuality(
                    station_uid=s["station_uid"],
                    station_name=s.get("station_name"),
                    latitude=s["latitude"],
                    longitude=s["longitude"],
                    aqi=s["aqi"],
                    pm25=s.get("pm25"),
                    pm10=s.get("pm10"),
                    o3=s.get("o3"),
                    no2=s.get("no2"),
                    so2=s.get("so2"),
                    co=s.get("co"),
                    dominant_pollutant=s.get("dominant_pollutant"),
                    station_time=s.get("station_time"),
                )
                for s in stations
            ]

            db.bulk_save_objects(objects)
            db.commit()

            print(f"Inserted {len(objects)} air quality stations")

        except Exception as e:
            db.rollback()
            print(f"Error: {e}")

        finally:
            db.close()

    def run(self):
        raw = self.fetch_bounds()
        stations = self.transform(raw)
        print(f"Fetched {len(stations)} air quality stations")

        stations = self.attach_pollutant_detail(stations)
        self.store(stations)


if __name__ == "__main__":
    # Running this file directly (e.g. python -m app.ingestion.waqi_worker)
    # skips main.py's startup, which is normally what creates the tables.
    # create_all() is a no-op for tables that already exist, so this is safe
    # to call here too — it just makes standalone runs self-sufficient.
    from app.database import Base, engine
    Base.metadata.create_all(bind=engine)

    worker = WAQIWorker()
    worker.run()