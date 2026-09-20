"use client";
import React, { useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  Terminal,
  DollarSign,
} from "lucide-react";

interface ActivityLogEntry {
  timestamp: string;
  agent: string;
  message: string;
  cost_usd?: number;
  cost_inr?: number;
  type?: "info" | "success" | "error" | "warning" | "cost";
}

const AGENT_COLORS: Record<string, string> = {
  // Department 1: Editorial & Direction
  creative_director: "text-violet-400",
  script_writer: "text-blue-400",
  storyboard_planner: "text-cyan-400",
  research_agent: "text-amber-400",
  brand_intelligence: "text-rose-400",
  
  // Department 2: Asset Synthesis
  prompt_engineer: "text-emerald-400",
  image_generator: "text-amber-400",
  quality_control: "text-teal-400",
  thumbnail_agent: "text-fuchsia-400",

  // Department 3: Cinematics & Sound
  video_planner: "text-red-400",
  video_generator: "text-pink-400",
  video_qa: "text-indigo-400",
  voice_director: "text-indigo-400",
  soundtrack_agent: "text-purple-400",

  // Department 4: Mastering & Distribution
  video_editor: "text-teal-400",
  subtitle_agent: "text-yellow-400",
  repurposing_agent: "text-sky-400",
  social_copy_agent: "text-orange-400",
  publishing_agent: "text-emerald-400",
  analytics_agent: "text-blue-400",
  ab_testing_agent: "text-rose-400",
  pipeline_preset_agent: "text-zinc-300",

  orchestrator: "text-zinc-400",
  system: "text-zinc-500",
};

const AGENT_LABELS: Record<string, string> = {
  creative_director: "DIRECTOR",
  script_writer: "SCREENPLAY",
  storyboard_planner: "STORYBOARD",
  research_agent: "RESEARCH",
  brand_intelligence: "BRAND KIT",
  prompt_engineer: "PROMPT ENG",
  image_generator: "DIFFUSION",
  quality_control: "QUALITY QC",
  thumbnail_agent: "THUMBNAIL",
  video_planner: "MOTION PLAN",
  video_generator: "KINEMATICS",
  video_qa: "VIDEO QA",
  voice_director: "VOICE DUB",
  soundtrack_agent: "SOUNDTRACK",
  video_editor: "COMPILATION",
  subtitle_agent: "SUBTITLES",
  repurposing_agent: "REPURPOSE",
  social_copy_agent: "SOCIAL COPY",
  publishing_agent: "PUBLISHER",
  analytics_agent: "ANALYTICS",
  ab_testing_agent: "A/B HOOKS",
  pipeline_preset_agent: "PRESET",
  orchestrator: "ORCHESTRATOR",
  system: "SYSTEM",
};

interface PipelineActivityLogProps {
  logs: ActivityLogEntry[];
  totalCostUsd?: number;
  totalCostInr?: number;
  maxHeight?: string;
  autoScroll?: boolean;
}

export default function PipelineActivityLog({
  logs,
  totalCostUsd = 0,
  totalCostInr = 0,
  maxHeight = "320px",
  autoScroll = true,
}: PipelineActivityLogProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  return (
    <div className="rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-[#0a0a0f] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.06] bg-[#0e0e14]">
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-wider">
            Agent Activity Log
          </span>
          <span className="text-[10px] font-mono text-zinc-500">
            ({logs.length} events)
          </span>
        </div>
        {(totalCostUsd > 0 || totalCostInr > 0) && (
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-amber-400">
            <DollarSign className="w-3 h-3" />
            <span>${totalCostUsd.toFixed(3)}</span>
            <span className="text-zinc-500">•</span>
            <span>₹{totalCostInr.toFixed(2)}</span>
          </div>
        )}
      </div>

      {/* Log Entries */}
      <div
        ref={scrollRef}
        className="overflow-y-auto custom-scrollbar p-2 space-y-0.5"
        style={{ maxHeight }}
      >
        {logs.length === 0 ? (
          <div className="flex items-center justify-center py-6 text-xs text-zinc-500 font-mono">
            Waiting for pipeline to start...
          </div>
        ) : (
          logs.map((log, i) => {
            const agentColor = AGENT_COLORS[log.agent] || "text-zinc-400";
            const agentLabel = AGENT_LABELS[log.agent] || log.agent?.toUpperCase() || "UNKNOWN";
            const isCheckpoint = log.message?.includes("[CHECKPOINT");
            const typeColor =
              isCheckpoint ? "text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20" :
              log.type === "success" ? "text-emerald-400" :
              log.type === "error" ? "text-red-400" :
              log.type === "warning" ? "text-amber-400" :
              log.type === "cost" ? "text-cyan-400" :
              "text-zinc-300";

            return (
              <div key={i} className={cn(
                "flex items-start gap-2 text-[11px] font-mono leading-relaxed hover:bg-white/[0.02] rounded px-1 py-0.5",
                isCheckpoint && "my-1"
              )}>
                {/* Timestamp */}
                <span className="text-zinc-600 shrink-0 tabular-nums">
                  {log.timestamp}
                </span>

                {/* Agent Badge */}
                <span className={cn("shrink-0 font-bold", isCheckpoint ? "text-emerald-400" : agentColor)}>
                  [{agentLabel}]
                </span>

                {/* Message */}
                <span className={cn("flex-1 min-w-0", typeColor)}>
                  {log.message}
                </span>

                {/* Cost */}
                {log.cost_usd !== undefined && log.cost_usd > 0 && (
                  <span className="text-amber-400/90 shrink-0 tabular-nums font-bold">
                    +${log.cost_usd.toFixed(3)}
                    {log.cost_inr !== undefined && log.cost_inr > 0 ? (
                      <span className="text-zinc-400 font-normal ml-1">
                        (₹{log.cost_inr.toFixed(2)})
                      </span>
                    ) : (
                      <span className="text-zinc-400 font-normal ml-1">
                        (₹{(log.cost_usd * 83.5).toFixed(2)})
                      </span>
                    )}
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export type { ActivityLogEntry };
