"""Task queue using Redis + RQ for async video generation."""

import logging
from redis import Redis
from rq import Queue

from app.config import settings
from app.engine.pipeline import VideoEngine, PipelineConfig, VariantResult

logger = logging.getLogger(__name__)

redis_conn = Redis.from_url(settings.redis_url)
task_queue = Queue("scaleswap", connection=redis_conn, default_timeout=600)

# In-memory job store (replace with DB in production)
_job_store: dict[str, dict] = {}


def enqueue_generation(
    project_id: str,
    source_path: str,
    config: PipelineConfig,
) -> str:
    """Enqueue a variant generation job."""
    job = task_queue.enqueue(
        run_generation,
        project_id,
        source_path,
        config,
        job_timeout=600,
    )

    _job_store[job.id] = {
        "project_id": project_id,
        "status": "queued",
        "progress": 0,
        "completed": 0,
        "total": config.count,
        "variants": [],
    }

    return job.id


def run_generation(
    project_id: str,
    source_path: str,
    config: PipelineConfig,
) -> list[dict]:
    """Worker function: runs the full generation pipeline."""
    from rq import get_current_job

    job = get_current_job()
    job_id = job.id if job else "local"

    if job_id in _job_store:
        _job_store[job_id]["status"] = "processing"

    engine = VideoEngine(source_path, project_id, config)

    def on_progress(current: int, total: int, result: VariantResult):
        if job_id in _job_store:
            _job_store[job_id]["completed"] = current
            _job_store[job_id]["progress"] = current / total
            _job_store[job_id]["variants"].append({
                "variant_id": result.variant_id,
                "output_path": result.output_path,
                "success": result.success,
                "ssim": result.ssim,
                "phash_distance": result.phash_distance,
                "md5": result.md5,
            })
        if job:
            job.meta["progress"] = current / total
            job.meta["completed"] = current
            job.save_meta()

    results = engine.generate_all(on_progress=on_progress)

    if job_id in _job_store:
        _job_store[job_id]["status"] = "completed"
        _job_store[job_id]["progress"] = 1.0

    return [
        {
            "variant_id": r.variant_id,
            "output_path": r.output_path,
            "success": r.success,
            "ssim": r.ssim,
            "phash_distance": r.phash_distance,
            "md5": r.md5,
        }
        for r in results
    ]


def get_job_status(job_id: str) -> dict:
    """Get the status of a generation job."""
    return _job_store.get(job_id, {"status": "not_found"})
