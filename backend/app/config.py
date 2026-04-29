from pydantic_settings import BaseSettings
from pathlib import Path


class Settings(BaseSettings):
    app_name: str = "Scaleswap API"
    debug: bool = False
    redis_url: str = "redis://localhost:6379/0"
    upload_dir: str = "/tmp/scaleswap/uploads"
    output_dir: str = "/tmp/scaleswap/outputs"
    ffmpeg_path: str = "ffmpeg"
    ffprobe_path: str = "ffprobe"
    max_variants: int = 100
    default_crf: int = 18
    jwt_secret: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"

    class Config:
        env_prefix = "SCALESWAP_"

    def ensure_dirs(self):
        Path(self.upload_dir).mkdir(parents=True, exist_ok=True)
        Path(self.output_dir).mkdir(parents=True, exist_ok=True)


settings = Settings()
