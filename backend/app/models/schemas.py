from pydantic import BaseModel, Field
from typing import Optional
from enum import Enum
from datetime import datetime


class ProjectStatus(str, Enum):
    pending = "pending"
    processing = "processing"
    completed = "completed"
    failed = "failed"


class VariantStatus(str, Enum):
    pending = "pending"
    processing = "processing"
    valid = "valid"
    invalid = "invalid"


class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None


class ProjectResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    status: ProjectStatus = ProjectStatus.pending
    source_file: Optional[str] = None
    variant_count: int = 0
    created_at: str = ""


class GenerateRequest(BaseModel):
    count: int = Field(default=5, ge=1, le=100)
    crf: int = Field(default=18, ge=15, le=28)
    preset: str = Field(default="veryfast")
    enable_audio: bool = True
    enable_metadata_spoof: bool = True
    enable_binary_layer: bool = True


class VariantResponse(BaseModel):
    id: str
    project_id: str
    filename: str
    status: VariantStatus = VariantStatus.pending
    ssim: Optional[float] = None
    phash_distance: Optional[int] = None
    file_size: Optional[int] = None
    md5: Optional[str] = None


class ValidationResult(BaseModel):
    ssim: float
    phash_distance: int
    is_valid: bool
    md5: str


class JobStatus(BaseModel):
    job_id: str
    status: str
    progress: float = 0.0
    completed: int = 0
    total: int = 0
    variants: list[VariantResponse] = []
