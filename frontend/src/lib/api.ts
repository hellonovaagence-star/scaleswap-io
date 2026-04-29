const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail || `API Error: ${res.status}`);
  }

  return res.json();
}

export const api = {
  // Projects
  listProjects: () => request<Project[]>("/projects"),
  createProject: (data: { name: string; description?: string }) =>
    request<Project>("/projects", { method: "POST", body: JSON.stringify(data) }),
  getProject: (id: string) => request<Project>(`/projects/${id}`),
  deleteProject: (id: string) =>
    request(`/projects/${id}`, { method: "DELETE" }),

  // Upload
  uploadVideo: async (projectId: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`${API_BASE}/projects/${projectId}/upload`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) throw new Error("Upload failed");
    return res.json();
  },

  // Variants
  generateVariants: (projectId: string, config: GenerateConfig) =>
    request<JobStatus>(`/projects/${projectId}/generate`, {
      method: "POST",
      body: JSON.stringify(config),
    }),
  listVariants: (projectId: string) =>
    request<Variant[]>(`/projects/${projectId}/variants`),
  getJobStatus: (jobId: string) =>
    request<JobStatus>(`/projects/jobs/${jobId}/status`),

  // Captions
  listCaptions: () => request<Caption[]>("/captions"),
  createCaption: (data: Omit<Caption, "id" | "created_at">) =>
    request<Caption>("/captions", { method: "POST", body: JSON.stringify(data) }),
  updateCaption: (id: string, data: Partial<Omit<Caption, "id" | "created_at">>) =>
    request<Caption>(`/captions/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteCaption: (id: string) =>
    request(`/captions/${id}`, { method: "DELETE" }),

  // Project Groups
  listProjectGroups: () => request<ProjectGroup[]>("/project-groups"),
  createProjectGroup: (data: Omit<ProjectGroup, "id" | "created_at">) =>
    request<ProjectGroup>("/project-groups", { method: "POST", body: JSON.stringify(data) }),
  updateProjectGroup: (id: string, data: Partial<Omit<ProjectGroup, "id" | "created_at">>) =>
    request<ProjectGroup>(`/project-groups/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteProjectGroup: (id: string) =>
    request(`/project-groups/${id}`, { method: "DELETE" }),

  // Caption Groups
  listCaptionGroups: () => request<CaptionGroup[]>("/caption-groups"),
  createCaptionGroup: (data: Omit<CaptionGroup, "id" | "created_at">) =>
    request<CaptionGroup>("/caption-groups", { method: "POST", body: JSON.stringify(data) }),
  updateCaptionGroup: (id: string, data: Partial<Omit<CaptionGroup, "id" | "created_at">>) =>
    request<CaptionGroup>(`/caption-groups/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteCaptionGroup: (id: string) =>
    request(`/caption-groups/${id}`, { method: "DELETE" }),
};

// Types
export interface Project {
  id: string;
  name: string;
  description?: string;
  status: "pending" | "processing" | "completed" | "failed";
  source_file?: string;
  variant_count: number;
  created_at: string;
}

export interface Variant {
  id: string;
  project_id: string;
  filename: string;
  status: "pending" | "processing" | "valid" | "invalid";
  ssim?: number;
  phash_distance?: number;
  file_size?: number;
  md5?: string;
}

export interface GenerateConfig {
  count: number;
  crf?: number;
  preset?: string;
  enable_audio?: boolean;
  enable_metadata_spoof?: boolean;
  enable_binary_layer?: boolean;
  caption_id?: string;
  caption_group_id?: string;
}

export interface Caption {
  id: string;
  text: string;
  position: "top" | "center" | "bottom";
  font_size: number;
  font_color: string;
  stroke_color: string;
  font_family: string;
  created_at: string;
}

export interface CaptionGroup {
  id: string;
  name: string;
  description?: string;
  caption_ids: string[];
  created_at: string;
}

export interface ProjectGroup {
  id: string;
  name: string;
  description?: string;
  project_ids: string[];
  created_at: string;
}

export interface JobStatus {
  job_id: string;
  status: string;
  progress: number;
  completed: number;
  total: number;
  variants: Variant[];
}
