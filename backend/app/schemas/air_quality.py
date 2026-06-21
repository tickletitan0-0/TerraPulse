from pydantic import BaseModel
from typing import Optional


class AirQualityCreate(BaseModel):
    station_uid: int
    station_name: Optional[str] = None

    latitude: float
    longitude: float

    aqi: int

    pm25: Optional[float] = None
    pm10: Optional[float] = None
    o3: Optional[float] = None
    no2: Optional[float] = None
    so2: Optional[float] = None
    co: Optional[float] = None

    dominant_pollutant: Optional[str] = None
    station_time: Optional[str] = None


class AirQualityResponse(AirQualityCreate):
    id: int

    class Config:
        from_attributes = True
