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
        <div className="border-t border-black/[0.06] dark:border-white/[0.06] p-3 space-y-3">
          {/* Output Preview */}
          {output && (
            <div className="text-xs text-zinc-600 dark:text-zinc-400 space-y-2">
              {typeof output === "string" ? (
                <p className="whitespace-pre-wrap leading-relaxed">{output}</p>
              ) : output.scenes ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {output.scenes.slice(0, 6).map((scene: any, i: number) => (
                    <div key={i} className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-black/[0.05] dark:border-white/[0.05]">
                      <div className="text-[10px] font-mono font-bold text-zinc-500 mb-1">
                        Scene {i + 1}
                      </div>
                      {scene.image_path && (
                        <div className="aspect-video rounded-md overflow-hidden bg-zinc-200 dark:bg-zinc-700 mb-1.5">
                          <img src={scene.image_path} alt={`Scene ${i + 1}`} className="w-full h-full object-cover" />
                        </div>
                      )}
                      <p className="text-[10px] text-zinc-500 line-clamp-2">{scene.title || scene.description || scene.script}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <pre className="text-[10px] font-mono bg-zinc-50 dark:bg-zinc-800/50 p-2 rounded-lg overflow-auto max-h-40">
                  {JSON.stringify(output, null, 2)}
                </pre>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {isPaused && mode === "assisted" && (
              <>
                <button
                  type="button"
                  onClick={onApprove}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-heading font-bold transition-all cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Approve & Continue
                </button>
                <button
                  type="button"
                  onClick={onReject}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-500/30 text-red-500 hover:bg-red-500/10 text-xs font-heading font-bold transition-all cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reject & Redo
                </button>
              </>
            )}
            {isFailed && (
              <button
                type="button"
                onClick={onRegenerate}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-500/30 text-amber-500 hover:bg-amber-500/10 text-xs font-heading font-bold transition-all cursor-pointer"
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
