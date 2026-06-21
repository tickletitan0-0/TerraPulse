from sqlalchemy import Column, Integer, Float, String, DateTime
from sqlalchemy.sql import func
from sqlalchemy import UniqueConstraint
from app.database import Base


class AirQuality(Base):
    __tablename__ = "air_quality"

    __table_args__ = (
        UniqueConstraint("station_uid", name="uq_air_quality_station"),
    )

    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # WAQI's own station id — stable across requests, used to dedupe and to
    # fetch the per-pollutant detail call for this station.
    station_uid = Column(Integer, nullable=False)
    station_name = Column(String, nullable=True)

    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)

    aqi = Column(Integer, nullable=False)

    # Per-pollutant breakdown — only populated for the top-N worst stations
    # each cycle (see WAQIWorker), since WAQI's bulk bounds endpoint doesn't
    # include this and it costs one extra API call per station to fetch.
    pm25 = Column(Float, nullable=True)
    pm10 = Column(Float, nullable=True)
    o3 = Column(Float, nullable=True)
    no2 = Column(Float, nullable=True)
    so2 = Column(Float, nullable=True)
    co = Column(Float, nullable=True)
    dominant_pollutant = Column(String, nullable=True)

    station_time = Column(String, nullable=True)
