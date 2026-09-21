"use client";
import React, { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Sparkles,
  FileText,
  Layers,
  Compass,
  Shield,
  Wand2,
  ImageIcon,
  CheckCircle2,
  Layout,
  Film,
  Video,
  Eye,
  Mic,
  Music,
  Scissors,
  Type,
  Maximize2,
  Share2,
  Send,
  BarChart2,
  GitCompare,
  Bookmark,
  Loader2,
  AlertCircle,
  Pause,
  Clock,
  ChevronRight,
} from "lucide-react";

export interface AgentNodeStatus {
  state: "pending" | "running" | "complete" | "failed" | "paused";
  progress?: number;
  message?: string;
  cost_usd?: number;
  cost_inr?: number;
  duration_sec?: number;
}

export interface AgentDef {
  id: string;
  name: string;
  shortName: string;
  icon: React.ElementType;
  departmentId: "editorial" | "assets" | "cinematics" | "distribution";
}

export interface DepartmentDef {
  id: "editorial" | "assets" | "cinematics" | "distribution";
  name: string;
  shortName: string;
  description: string;
  color: string;
  bgColor: string;
  borderColor: string;
  accentColor: string;
}

export const DEPARTMENTS: DepartmentDef[] = [
  {
    id: "editorial",
    name: "Editorial & Creative Direction",
    shortName: "Editorial",
    description: "Brief formulation, narrative screenplay, shot framing & brand intelligence",
    color: "text-violet-500",
    bgColor: "bg-violet-500/10",
    borderColor: "border-violet-500/25",
    accentColor: "bg-violet-500",
  },
  {
    id: "assets",
    name: "Asset Synthesis & QC",
    shortName: "Synthesis",
    description: "Diffusion prompt tuning, keyframe generation, automated quality verification & covers",
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/25",
    accentColor: "bg-emerald-500",
  },
  {
    id: "cinematics",
    name: "Cinematics & Audio Studio",
    shortName: "Cinematics",
    description: "Camera motion kinematics, temporal video QA, neural voice sync & soundtrack curation",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/25",
    accentColor: "bg-blue-500",
  },
  {
    id: "distribution",
    name: "Mastering & Distribution",
    shortName: "Distribution",
    description: "Master timeline compilation, kinetic subtitles, omnichannel crops & publisher pipeline",
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/25",
    accentColor: "bg-amber-500",
  },
];

export const ALL_22_AGENTS: AgentDef[] = [
  // Department 1: Editorial & Direction (5 Agents)
  { id: "creative_director", name: "Creative Director", shortName: "Director", icon: Sparkles, departmentId: "editorial" },
  { id: "script_writer", name: "Script Writer", shortName: "Screenplay", icon: FileText, departmentId: "editorial" },
  { id: "storyboard_planner", name: "Storyboard Planner", shortName: "Storyboard", icon: Layers, departmentId: "editorial" },
  { id: "research_agent", name: "Trend & Market Researcher", shortName: "Research", icon: Compass, departmentId: "editorial" },
  { id: "brand_intelligence", name: "Brand Intelligence Agent", shortName: "Brand Kit", icon: Shield, departmentId: "editorial" },

  // Department 2: Asset Synthesis (4 Agents)
  { id: "prompt_engineer", name: "Prompt Engineer", shortName: "Prompts", icon: Wand2, departmentId: "assets" },
  { id: "image_generator", name: "Keyframe Diffusion Engine", shortName: "Diffusion", icon: ImageIcon, departmentId: "assets" },
  { id: "quality_control", name: "Automated QC Inspector", shortName: "Quality QC", icon: CheckCircle2, departmentId: "assets" },
  { id: "thumbnail_agent", name: "Cover & Thumbnail Designer", shortName: "Thumbnail", icon: Layout, departmentId: "assets" },

  // Department 3: Cinematics & Audio (5 Agents)
  { id: "video_planner", name: "Motion Dynamics Planner", shortName: "Motion Plan", icon: Film, departmentId: "cinematics" },
  { id: "video_generator", name: "Camera Kinematics Engine", shortName: "Kinematics", icon: Video, departmentId: "cinematics" },
  { id: "video_qa", name: "Temporal Video QA", shortName: "Video QA", icon: Eye, departmentId: "cinematics" },
  { id: "voice_director", name: "Neural Voice Director", shortName: "Voice Dub", icon: Mic, departmentId: "cinematics" },
  { id: "soundtrack_agent", name: "Soundtrack & Audio Director", shortName: "Soundtrack", icon: Music, departmentId: "cinematics" },

  // Department 4: Mastering & Distribution (8 Agents)
  { id: "video_editor", name: "Master FFmpeg Compiler", shortName: "Compiler", icon: Scissors, departmentId: "distribution" },
  { id: "subtitle_agent", name: "Kinetic Subtitles & Captions", shortName: "Subtitles", icon: Type, departmentId: "distribution" },
  { id: "repurposing_agent", name: "Omnichannel Repurposer (9:16 / 16:9)", shortName: "Repurpose", icon: Maximize2, departmentId: "distribution" },
  { id: "social_copy_agent", name: "Social Copy & SEO Strategist", shortName: "SEO Copy", icon: Share2, departmentId: "distribution" },
  { id: "publishing_agent", name: "Social Publisher & Scheduler", shortName: "Publisher", icon: Send, departmentId: "distribution" },
  { id: "analytics_agent", name: "Audience & Retention Analyst", shortName: "Analytics", icon: BarChart2, departmentId: "distribution" },
  { id: "ab_testing_agent", name: "A/B Hook Variant Generator", shortName: "A/B Hooks", icon: GitCompare, departmentId: "distribution" },
  { id: "pipeline_preset_agent", name: "Workflow Preset Manager", shortName: "Preset Vault", icon: Bookmark, departmentId: "distribution" },
];

const statusIcon = (state: AgentNodeStatus["state"]) => {
  switch (state) {
    case "running": return <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-500" />;
    case "complete": return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />;
    case "failed": return <AlertCircle className="w-3.5 h-3.5 text-red-500" />;
    case "paused": return <Pause className="w-3.5 h-3.5 text-amber-500" />;
    default: return <Clock className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-600" />;
  }
};

interface AgentFlowChartProps {
  agentStatuses: Record<string, AgentNodeStatus>;
  onAgentClick?: (agentId: string) => void;
  selectedAgentId?: string | null;
}

export default function AgentFlowChart({
  agentStatuses,
  onAgentClick,
  selectedAgentId,
}: AgentFlowChartProps) {
  const [activeDeptTab, setActiveDeptTab] = useState<string>("editorial");

  return (
    <div className="w-full space-y-4">
      {/* 4 Production Departments Executive Overview Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        {DEPARTMENTS.map((dept, idx) => {
          const deptAgents = ALL_22_AGENTS.filter((a) => a.departmentId === dept.id);
          const completedCount = deptAgents.filter((a) => agentStatuses[a.id]?.state === "complete").length;
          const isAnyRunning = deptAgents.some((a) => agentStatuses[a.id]?.state === "running");
          const isSelected = activeDeptTab === dept.id;

          return (
            <button
              key={dept.id}
              type="button"
              onClick={() => setActiveDeptTab(dept.id)}
              className={cn(
                "p-3 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden",
                isSelected
                  ? "bg-white dark:bg-[#14141f] border-zinc-400 dark:border-zinc-600 shadow-md ring-1 ring-emerald-500/20"
                  : "bg-zinc-50/70 dark:bg-white/[0.02] border-black/[0.06] dark:border-white/[0.06] hover:border-zinc-300 dark:hover:border-zinc-700"
              )}
            >
              {isAnyRunning && (
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-600 via-indigo-500 to-cyan-400 overflow-hidden">
                  <div className="w-full h-full bg-white/70 animate-flash-sweep" />
                </div>
              )}
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-mono uppercase font-bold tracking-wider text-zinc-400">
                  Dept 0{idx + 1}
                </span>
                <span className={cn(
                  "text-[10px] font-mono px-1.5 py-0.2 rounded-md font-bold",
                  completedCount === deptAgents.length
                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                    : isAnyRunning
                    ? "bg-gradient-to-r from-blue-600/20 to-cyan-500/20 text-cyan-600 dark:text-cyan-400 border border-blue-500/30"
                    : "bg-zinc-200 dark:bg-zinc-800 text-zinc-500"
                )}>
                  {completedCount}/{deptAgents.length} Ready
                </span>
              </div>
              <h4 className="text-xs font-heading font-extrabold text-zinc-900 dark:text-white truncate">
                {dept.name}
              </h4>
              <p className="text-[10px] text-zinc-500 line-clamp-1 mt-0.5">
                {dept.description}
              </p>
            </button>
          );
        })}
      </div>

      {/* Agents Sub-Grid for the Active Department */}
      <div className="p-3 sm:p-4 rounded-2xl bg-zinc-50/80 dark:bg-white/[0.02] border border-black/[0.06] dark:border-white/[0.06] space-y-3">
        <div className="flex items-center justify-between font-mono text-[11px]">
          <span className="font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
            {DEPARTMENTS.find((d) => d.id === activeDeptTab)?.name} Agents
          </span>
          <span className="text-[10px] text-zinc-400">
            Click an agent node to inspect output, controls, or review gate
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5">
          {ALL_22_AGENTS.filter((a) => a.departmentId === activeDeptTab).map((agent) => {
            const status = agentStatuses[agent.id] || { state: "pending" };
            const isRunning = status.state === "running";
            const isDone = status.state === "complete";
            const isPaused = status.state === "paused";
            const isFailed = status.state === "failed";
            const isSelected = selectedAgentId === agent.id;
            const Icon = agent.icon;

            return (
              <button
                key={agent.id}
                type="button"
                onClick={() => onAgentClick?.(agent.id)}
                className={cn(
                  "flex items-start gap-2.5 p-2.5 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden",
                  isSelected && "ring-2 ring-emerald-500 border-emerald-500 bg-white dark:bg-zinc-900 shadow-md",
                  isRunning && "border-blue-500/90 bg-gradient-to-br from-blue-600/20 via-indigo-600/20 to-cyan-500/20 ring-2 ring-blue-500/60 shadow-[0_0_24px_rgba(59,130,246,0.4)]",
                  isDone && "border-emerald-500/30 bg-emerald-500/[0.03]",
                  isPaused && "border-amber-500/40 bg-amber-500/[0.05] animate-pulse",
                  isFailed && "border-rose-500/40 bg-rose-500/[0.05]",
                  !isRunning && !isDone && !isPaused && !isFailed && !isSelected &&
                    "bg-white dark:bg-[#11111a] border-black/[0.06] dark:border-white/[0.06] hover:border-zinc-300 dark:hover:border-zinc-700"
                )}
              >
                {/* Specular Flash Style Reflection Beam */}
                {isRunning && (
                  <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-xl z-10">
                    <div className="absolute inset-y-0 w-2/3 bg-gradient-to-r from-transparent via-white/35 dark:via-cyan-300/40 to-transparent animate-flash-sweep" />
                  </div>
                )}
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border mt-0.5 transition-all",
                  isDone
                    ? "bg-emerald-500/15 text-emerald-500 border-emerald-500/20"
                    : isRunning
                    ? "bg-gradient-to-br from-blue-600 to-cyan-500 text-white border-blue-400 shadow-md shadow-blue-500/30"
                    : "bg-zinc-100 dark:bg-white/[0.04] text-zinc-500 border-black/[0.06] dark:border-white/[0.06]"
                )}>
                  {isRunning ? (
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className={cn(
                      "text-xs font-heading font-extrabold truncate",
                      isRunning ? "text-blue-600 dark:text-blue-400" : isDone ? "text-zinc-900 dark:text-white" : "text-zinc-800 dark:text-zinc-200"
                    )}>
                      {agent.shortName}
                    </span>
                    {statusIcon(status.state)}
                  </div>
                  <p className={cn(
                    "text-[10px] truncate mt-0.5",
                    isRunning ? "text-blue-500 dark:text-blue-300 font-medium" : "text-zinc-500 dark:text-zinc-400"
                  )}>
                    {status.message || (isDone ? "Completed" : isRunning ? "In progress" : isPaused ? "Review required" : "Ready in queue")}
                  </p>
                  {status.cost_usd !== undefined && status.cost_usd > 0 && (
                    <span className="text-[9px] font-mono text-zinc-400 mt-1 block">
                      ${status.cost_usd.toFixed(3)}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export { ALL_22_AGENTS as AGENT_NODES };
