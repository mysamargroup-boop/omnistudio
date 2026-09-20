"use client";
import React from "react";
import { cn } from "@/lib/utils";
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  Pause,
  Clock,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  DollarSign,
  Timer,
} from "lucide-react";
import type { AgentNodeStatus } from "./AgentFlowChart";
import { AGENT_NODES, DEPARTMENTS } from "./AgentFlowChart";

interface AgentCardProps {
  agentId: string;
  status: AgentNodeStatus;
  output?: any;
  expanded?: boolean;
  onToggle?: () => void;
  onApprove?: () => void;
  onReject?: () => void;
  onRegenerate?: () => void;
  mode?: string;
}

export default function AgentCard({
  agentId,
  status,
  output,
  expanded = false,
  onToggle,
  onApprove,
  onReject,
  onRegenerate,
  mode = "autonomous",
}: AgentCardProps) {
  const agent = AGENT_NODES.find((a) => a.id === agentId);
  if (!agent) return null;

  const dept = DEPARTMENTS.find((d) => d.id === agent.departmentId);
  const Icon = agent.icon;
  const isActive = status.state === "running";
  const isDone = status.state === "complete";
  const isPaused = status.state === "paused";
  const isFailed = status.state === "failed";

  return (
    <div
      className={cn(
        "rounded-2xl border transition-all overflow-hidden bg-white dark:bg-[#11111a]",
        isActive && "ring-2 ring-emerald-500/30 shadow-lg shadow-emerald-500/5",
        isDone && "border-emerald-500/20 bg-emerald-500/[0.03]",
        isPaused && "border-amber-500/30 bg-amber-500/[0.03] animate-pulse",
        isFailed && "border-rose-500/30 bg-rose-500/[0.03]",
        !isActive && !isDone && !isPaused && !isFailed && "border-black/[0.08] dark:border-white/[0.08]"
      )}
    >
      {/* Header */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-3.5 cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
      >
        <div className={cn(
          "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border",
          isDone ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : dept ? `${dept.bgColor} ${dept.color} ${dept.borderColor}` : "bg-zinc-100 text-zinc-600 border-zinc-200"
        )}>
          {isActive ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Icon className="w-4 h-4" />
          )}
        </div>

        <div className="flex-1 min-w-0 text-left">
          <div className="flex items-center gap-2">
            <span className="text-sm font-heading font-bold text-zinc-900 dark:text-white truncate">
              {agent.name}
            </span>
            {isDone && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
            {isFailed && <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />}
            {isPaused && <Pause className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
          </div>
          <div className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
            {status.message || (isActive ? "Processing..." : isDone ? "Completed successfully" : isPaused ? "Waiting for your approval" : isFailed ? "Failed — click to retry" : "Waiting in queue")}
          </div>
        </div>

        {/* Meta */}
        <div className="flex items-center gap-3 shrink-0">
          {status.duration_sec !== undefined && status.duration_sec > 0 && (
            <div className="flex items-center gap-1 text-[10px] font-mono text-zinc-400">
              <Timer className="w-3 h-3" />
              {status.duration_sec.toFixed(1)}s
            </div>
          )}
          {status.cost_usd !== undefined && status.cost_usd > 0 && (
            <div className="flex items-center gap-1 text-[10px] font-mono text-zinc-400">
              <DollarSign className="w-3 h-3" />
              {status.cost_usd.toFixed(3)}
            </div>
          )}
          {expanded ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
        </div>
      </button>

      {/* Progress Bar */}
      {isActive && status.progress !== undefined && (
        <div className="h-0.5 bg-zinc-100 dark:bg-zinc-800">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all duration-500"
            style={{ width: `${status.progress}%` }}
          />
        </div>
      )}

      {/* Expanded Content */}
      {expanded && (isDone || isPaused || isFailed) && (
        <div className="border-t border-black/[0.06] dark:border-white/[0.06] p-4 space-y-4 bg-zinc-50/50 dark:bg-white/[0.01]">
          {/* 1. Creative Director Rich Breakdown */}
          {agentId === "creative_director" && output && (
            <div className="space-y-3">
              <div className="flex items-center justify-between font-mono text-xs pb-2 border-b border-black/[0.06] dark:border-white/[0.06]">
                <span className="font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider">
                  Directorial Concept & Architecture Decisions
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 font-bold font-mono">
                  {output.genre || "Cinematic Master"}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs font-mono">
                <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-black/[0.05] dark:border-white/[0.05]">
                  <span className="text-zinc-400 block text-[9px] uppercase font-bold">Concept / Title</span>
                  <span className="font-bold text-zinc-800 dark:text-zinc-200 truncate block mt-0.5">{output.title}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-black/[0.05] dark:border-white/[0.05]">
                  <span className="text-zinc-400 block text-[9px] uppercase font-bold">Diffusion Engine</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 truncate block mt-0.5">{output.diffusion_model}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-black/[0.05] dark:border-white/[0.05]">
                  <span className="text-zinc-400 block text-[9px] uppercase font-bold">Video Motion Engine</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400 truncate block mt-0.5">{output.video_model}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-black/[0.05] dark:border-white/[0.05]">
                  <span className="text-zinc-400 block text-[9px] uppercase font-bold">Production Pacing</span>
                  <span className="font-bold text-zinc-800 dark:text-zinc-200 truncate block mt-0.5">
                    {output.scene_count || 4} scenes (~{Math.round(output.scene_duration || 4)}s each)
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-black/[0.05] dark:border-white/[0.05]">
                  <span className="text-zinc-400 block text-[9px] uppercase font-bold">Aspect Ratio</span>
                  <span className="font-bold text-zinc-800 dark:text-zinc-200 truncate block mt-0.5">{output.aspect_ratio || "16:9"}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-black/[0.05] dark:border-white/[0.05]">
                  <span className="text-zinc-400 block text-[9px] uppercase font-bold">Execution Mode</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 truncate block mt-0.5">
                    {output.director_decisions?.autopilot_active ? "Full Autopilot (Zero Confirmation)" : "Directorial Review"}
                  </span>
                </div>
              </div>
              {output.director_decisions?.concept && (
                <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-black/[0.05] dark:border-white/[0.05] text-xs">
                  <span className="text-zinc-400 block text-[9px] uppercase font-mono font-bold mb-1">Director Vision Directive</span>
                  <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed font-sans">{output.director_decisions.concept}</p>
                </div>
              )}
            </div>
          )}

          {/* 2. Script Writer Screenplay & Dialogue Breakdown */}
          {agentId === "script_writer" && output?.scenes && (
            <div className="space-y-3">
              <div className="flex items-center justify-between font-mono text-xs pb-2 border-b border-black/[0.06] dark:border-white/[0.06]">
                <span className="font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                  Screenplay Scenes & Dialogue Scripts ({output.scenes.length})
                </span>
                <span className="text-[10px] text-zinc-400 font-mono">
                  Authentic Narration Ready for Neural Dubbing
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {output.scenes.map((sc: any, idx: number) => (
                  <div key={idx} className="p-3.5 rounded-2xl bg-white dark:bg-zinc-900 border border-black/[0.06] dark:border-white/[0.06] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-heading font-bold text-zinc-900 dark:text-white">
                        {sc.title || `Scene ${idx + 1}`}
                      </span>
                      <span className="text-[10px] font-mono text-emerald-500 font-bold">
                        {sc.duration_seconds || 4.0}s
                      </span>
                    </div>
                    {sc.description && (
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 italic">
                        Visual: {sc.description}
                      </p>
                    )}
                    <div className="p-2.5 rounded-xl bg-emerald-500/[0.04] border border-emerald-500/20 text-xs text-zinc-800 dark:text-zinc-200">
                      <span className="text-[9px] font-mono font-bold uppercase text-emerald-600 dark:text-emerald-400 block mb-0.5">Spoken Narration / Dialogue:</span>
                      <p className="font-serif italic text-zinc-800 dark:text-zinc-200 leading-relaxed">"{sc.script || "Cinematic visual sequence."}"</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. Brand Intelligence Guidelines Breakdown */}
          {agentId === "brand_intelligence" && output && (
            <div className="space-y-3">
              <div className="flex items-center justify-between font-mono text-xs pb-2 border-b border-black/[0.06] dark:border-white/[0.06]">
                <span className="font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                  Applied Brand Identity & Guidelines
                </span>
                <span className="text-[10px] text-zinc-400 font-mono">
                  {output.name || "Studio Master"}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs font-mono">
                <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-black/[0.05] dark:border-white/[0.05]">
                  <span className="text-zinc-400 block text-[9px] uppercase font-bold">Brand Voice</span>
                  <span className="font-bold text-zinc-800 dark:text-zinc-200 truncate block mt-0.5">{output.brand_voice || "Cinematic & Sophisticated"}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-black/[0.05] dark:border-white/[0.05]">
                  <span className="text-zinc-400 block text-[9px] uppercase font-bold">Palette Colors</span>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="w-4 h-4 rounded-md border" style={{ backgroundColor: output.primary_color || "#10b981" }} />
                    <span className="w-4 h-4 rounded-md border" style={{ backgroundColor: output.accent_color || "#06b6d4" }} />
                    <span className="text-[10px] text-zinc-500 font-mono">{output.primary_color || "#10b981"}</span>
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-black/[0.05] dark:border-white/[0.05]">
                  <span className="text-zinc-400 block text-[9px] uppercase font-bold">Typography</span>
                  <span className="font-bold text-zinc-800 dark:text-zinc-200 truncate block mt-0.5">{output.typography || "Inter"}</span>
                </div>
              </div>
              {output.style_guidelines && (
                <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-black/[0.05] dark:border-white/[0.05] text-xs">
                  <span className="text-zinc-400 block text-[9px] uppercase font-mono font-bold mb-1">Brand Style Rules</span>
                  <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed font-sans">{output.style_guidelines}</p>
                </div>
              )}
            </div>
          )}

          {/* 4. Diffusion & Video Scene Previews */}
          {(agentId === "image_generator" || agentId === "video_generator" || agentId === "voice_director") && output?.scenes && (
            <div className="space-y-3">
              <div className="flex items-center justify-between font-mono text-xs pb-2 border-b border-black/[0.06] dark:border-white/[0.06]">
                <span className="font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                  {agentId === "image_generator" ? "Keyframe Visuals Synthesized" : agentId === "video_generator" ? "Animated Video Motion Clips" : "Neural Voiceover Tracks"}
                </span>
                <span className="text-[10px] text-zinc-400 font-mono">
                  {output.scenes.length} Scenes Active
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {output.scenes.map((scene: any, idx: number) => (
                  <div key={idx} className="p-2 rounded-xl bg-white dark:bg-zinc-900 border border-black/[0.06] dark:border-white/[0.06] space-y-1.5">
                    <div className="aspect-video rounded-lg overflow-hidden bg-black/5 dark:bg-white/5 relative group">
                      {scene.image_path ? (
                        <img src={scene.image_path} alt={scene.title || `Scene ${idx + 1}`} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[10px] text-zinc-400 font-mono">
                          Generating Visual...
                        </div>
                      )}
                      {scene.video_path && (
                        <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded bg-emerald-500 text-white text-[8px] font-mono font-bold">
                          VIDEO READY
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] font-bold text-zinc-900 dark:text-white truncate">
                      {scene.title || `Scene ${idx + 1}`}
                    </div>
                    {scene.script && (
                      <p className="text-[10px] text-zinc-500 line-clamp-2 italic font-serif">
                        "{scene.script}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Fallback output preview for any other agent */}
          {!["creative_director", "script_writer", "brand_intelligence", "image_generator", "video_generator", "voice_director"].includes(agentId) && output && (
            <div className="text-xs text-zinc-600 dark:text-zinc-400 space-y-2">
              {typeof output === "string" ? (
                <p className="whitespace-pre-wrap leading-relaxed">{output}</p>
              ) : (
                <pre className="text-[10px] font-mono bg-zinc-50 dark:bg-zinc-800/50 p-2 rounded-lg overflow-auto max-h-40">
                  {JSON.stringify(output, null, 2)}
                </pre>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-2">
            {isPaused && mode === "assisted" && (
              <>
                <button
                  type="button"
                  onClick={onApprove}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-heading font-bold transition-all cursor-pointer shadow-sm"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Approve & Continue Pipeline
                </button>
                <button
                  type="button"
                  onClick={onReject}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-red-500/30 text-red-500 hover:bg-red-500/10 text-xs font-heading font-bold transition-all cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Request Directorial Revision
                </button>
              </>
            )}
            {isFailed && (
              <button
                type="button"
                onClick={onRegenerate}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-amber-500/30 text-amber-500 hover:bg-amber-500/10 text-xs font-heading font-bold transition-all cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Retry This Step
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
