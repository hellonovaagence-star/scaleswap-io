"""Project CRUD endpoints."""

import os
import uuid
from datetime import datetime

import aiofiles
from fastapi import APIRouter, HTTPException, UploadFile, File

from app.config import settings
from app.models.schemas import ProjectCreate, ProjectResponse, ProjectStatus

router = APIRouter()

# In-memory project store (replace with DB in production)
_projects: dict[str, dict] = {}


@router.get("/", response_model=list[ProjectResponse])
async def list_projects():
    return [
        ProjectResponse(**p)
        for p in _projects.values()
    ]


@router.post("/", response_model=ProjectResponse)
async def create_project(req: ProjectCreate):
    project_id = str(uuid.uuid4())[:8]
    project = {
        "id": project_id,
        "name": req.name,
        "description": req.description,
        "status": ProjectStatus.pending,
        "source_file": None,
        "variant_count": 0,
        "created_at": datetime.utcnow().isoformat(),
    }
    _projects[project_id] = project
    return ProjectResponse(**project)


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(project_id: str):
    project = _projects.get(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return ProjectResponse(**project)


@router.post("/{project_id}/upload")
async def upload_video(project_id: str, file: UploadFile = File(...)):
    project = _projects.get(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Save uploaded file
    project_dir = os.path.join(settings.upload_dir, project_id)
    os.makedirs(project_dir, exist_ok=True)

    file_path = os.path.join(project_dir, file.filename)
    async with aiofiles.open(file_path, "wb") as f:
        content = await file.read()
        await f.write(content)

    project["source_file"] = file_path
    project["status"] = ProjectStatus.pending

    return {"filename": file.filename, "path": file_path, "size": len(content)}


@router.delete("/{project_id}")
async def delete_project(project_id: str):
    if project_id not in _projects:
        raise HTTPException(status_code=404, detail="Project not found")
    del _projects[project_id]
    return {"deleted": True}


def get_project_store() -> dict:
    """Access the project store from other modules."""
    return _projects
