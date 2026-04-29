"""Variant generation + download endpoints."""

import os

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from app.config import settings
from app.models.schemas import GenerateRequest, JobStatus, VariantResponse
from app.engine.pipeline import VideoEngine, PipelineConfig
from app.routers.projects import get_project_store

router = APIRouter()

# In-memory variant store
_variants: dict[str, list[dict]] = {}


@router.post("/{project_id}/generate", response_model=JobStatus)
async def generate_variants(project_id: str, req: GenerateRequest):
    projects = get_project_store()
    project = projects.get(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if not project.get("source_file"):
        raise HTTPException(status_code=400, detail="No source video uploaded")

    source_path = project["source_file"]
    if not os.path.exists(source_path):
        raise HTTPException(status_code=400, detail="Source file not found on disk")

    # Try async queue first, fallback to sync
    try:
        from app.workers.queue import enqueue_generation
        config = PipelineConfig(
            count=req.count,
            crf=req.crf,
            preset=req.preset,
            enable_audio=req.enable_audio,
            enable_metadata_spoof=req.enable_metadata_spoof,
            enable_binary_layer=req.enable_binary_layer,
        )
        job_id = enqueue_generation(project_id, source_path, config)
        project["status"] = "processing"
        return JobStatus(
            job_id=job_id,
            status="queued",
            total=req.count,
        )
    except Exception:
        # Redis not available — run synchronously
        config = PipelineConfig(
            count=req.count,
            crf=req.crf,
            preset=req.preset,
            enable_audio=req.enable_audio,
            enable_metadata_spoof=req.enable_metadata_spoof,
            enable_binary_layer=req.enable_binary_layer,
        )
        engine = VideoEngine(source_path, project_id, config)
        results = engine.generate_all()

        variant_list = []
        for r in results:
            variant_list.append({
                "id": r.variant_id,
                "project_id": project_id,
                "filename": os.path.basename(r.output_path) if r.output_path else "",
                "status": "valid" if r.ssim and r.ssim >= 0.995 and r.phash_distance and r.phash_distance >= 10 else "invalid",
                "ssim": r.ssim,
                "phash_distance": r.phash_distance,
                "file_size": os.path.getsize(r.output_path) if r.output_path and os.path.exists(r.output_path) else None,
                "md5": r.md5,
            })

        _variants[project_id] = variant_list
        project["variant_count"] = len([v for v in variant_list if v["status"] == "valid"])
        project["status"] = "completed"

        return JobStatus(
            job_id="sync",
            status="completed",
            progress=1.0,
            completed=len(results),
            total=req.count,
            variants=[VariantResponse(**v) for v in variant_list],
        )


@router.get("/{project_id}/variants", response_model=list[VariantResponse])
async def list_variants(project_id: str):
    projects = get_project_store()
    if project_id not in projects:
        raise HTTPException(status_code=404, detail="Project not found")
    return [VariantResponse(**v) for v in _variants.get(project_id, [])]


@router.get("/{project_id}/variants/{variant_id}/download")
async def download_variant(project_id: str, variant_id: str):
    variants = _variants.get(project_id, [])
    variant = next((v for v in variants if v["id"] == variant_id), None)
    if not variant:
        raise HTTPException(status_code=404, detail="Variant not found")

    output_dir = os.path.join(settings.output_dir, project_id)
    # Find file by variant_id in filename
    for f in os.listdir(output_dir):
        if variant_id in f:
            return FileResponse(
                os.path.join(output_dir, f),
                media_type="video/mp4",
                filename=f,
            )

    raise HTTPException(status_code=404, detail="Variant file not found")


@router.get("/jobs/{job_id}/status", response_model=JobStatus)
async def job_status(job_id: str):
    from app.workers.queue import get_job_status
    status = get_job_status(job_id)
    if status["status"] == "not_found":
        raise HTTPException(status_code=404, detail="Job not found")
    return JobStatus(
        job_id=job_id,
        **status,
    )
