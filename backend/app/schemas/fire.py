from pydantic import BaseModel


class FireCreate(BaseModel):
    latitude: float
    longitude: float
    confidence: int
    brightness: float


class FireResponse(FireCreate):
    id: int

    class Config:
        from_attributes = True