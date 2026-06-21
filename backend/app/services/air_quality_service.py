from app.models.air_quality import AirQuality

# EPA/WAQI breakpoints: 0-50 Good, 51-100 Moderate, 101-150 Unhealthy for
# Sensitive Groups, 151-200 Unhealthy, 201-300 Very Unhealthy, 301+ Hazardous.
UNHEALTHY_THRESHOLD = 151
HAZARDOUS_THRESHOLD = 301


class AirQualityService:

    @staticmethod
    def get_stats(db):
        stations = db.query(AirQuality).all()
        total = len(stations)

        avg_aqi = (
            sum(s.aqi for s in stations) / total
            if total else 0
        )

        unhealthy = len([s for s in stations if s.aqi >= UNHEALTHY_THRESHOLD])
        hazardous = len([s for s in stations if s.aqi >= HAZARDOUS_THRESHOLD])

        return {
            "total_stations": total,
            "average_aqi": round(avg_aqi, 2),
            "unhealthy_stations": unhealthy,
            "hazardous_stations": hazardous,
        }

    @staticmethod
    def get_map_data(db):
        stations = db.query(AirQuality).all()
        return [
            {
                "latitude": s.latitude,
                "longitude": s.longitude,
                "aqi": s.aqi,
                "station_name": s.station_name,
                "dominant_pollutant": s.dominant_pollutant,
                "pm25": s.pm25,
                "pm10": s.pm10,
                "o3": s.o3,
                "no2": s.no2,
                "so2": s.so2,
                "co": s.co,
                "station_time": s.station_time,
            }
            for s in stations
        ]

    @staticmethod
    def get_top(db, limit=10):
        return (
            db.query(AirQuality)
            .order_by(AirQuality.aqi.desc())
            .limit(limit)
            .all()
        )
