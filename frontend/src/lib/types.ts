export interface GenerationResult {
  success: boolean;
  simulated?: boolean;
  filename: string;
  url: string;
  local_path: string;
  model: string;
  error?: string;
  enhanced_prompt?: string | null;
  revised_prompt?: string;
}

export interface VideoResult extends GenerationResult {
  duration: number;
  motion_type: string;
  engine: string;
}

export interface VoiceResult extends GenerationResult {}

export interface PipelineScene {
  scene: number;
  title: string;
  image: GenerationResult;
  video: VideoResult;
  voice: VoiceResult;
  merged: { filename: string; url: string; local_path: string };
}

export interface PipelineResult {
  success: boolean;
  job_id: string;
  elapsed_seconds: number;
  scenes: PipelineScene[];
  final_video: { filename: string; url: string; local_path: string };
  storyboard: StoryboardScene[];
}

export interface StoryboardScene {
  scene_number: number;
  title: string;
  visual_prompt: string;
  camera_motion: string;
  narration: string;
  duration: number;
}

export interface AssetFile {
  filename: string;
  url: string;
  local_path: string;
  size_bytes: number;
  size_mb: number;
  modified: number;
  type: string;
}

export interface KeyStatus {
  openai: boolean;
  elevenlabs: boolean;
  replicate: boolean;
  gemini: boolean;
  edge_tts: boolean;
  ffmpeg: boolean;
}

export interface HealthStatus {
  status: string;
  ffmpeg: { available: boolean; version?: string };
  keys: KeyStatus;
}
