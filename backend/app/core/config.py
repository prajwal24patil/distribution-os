from functools import lru_cache
from os import getenv


class Settings:
    def __init__(self) -> None:
        self.app_env = getenv("APP_ENV", "local")
        self.app_name = getenv("APP_NAME", "DistributionOS API")
        self.allowed_origins = self._parse_origins(
            getenv("ALLOWED_ORIGINS", "http://localhost:3000")
        )

    @staticmethod
    def _parse_origins(value: str) -> list[str]:
        return [origin.strip() for origin in value.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
