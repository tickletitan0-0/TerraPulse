from sqlalchemy import Column
from sqlalchemy import Integer
from sqlalchemy import Float

from app.database import Base


class Fire(Base):
    __tablename__ = "fires"

    id = Column(Integer, primary_key=True, index=True)

    latitude = Column(Float)
    longitude = Column(Float)

    confidence = Column(Integer)

    brightness = Column(Float)