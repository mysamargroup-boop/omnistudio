"use client";

import React, { useState, useRef, useEffect, useId } from "react";
import { ChevronDown, Check, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ModernSelectOption {
  value: string;
  label: string;
  description?: string;
  badge?: string;
  icon?: React.ComponentType<{ className?: string }>;
}

interface ModernSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: ModernSelectOption[];
  placeholder?: string;
  label?: string;
  className?: string;
  triggerClassName?: string;
  popoverClassName?: string;
  disabled?: boolean;
  searchable?: boolean;
  size?: "sm" | "md" | "lg";
}

export default function ModernSelect({
  value,
  onChange,
  options,
  placeholder = "Select an option",
  label,
  className,
  triggerClassName,
  popoverClassName,
  disabled = false,
  searchable = false,
  size = "md",
}: ModernSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const id = useId();

  const selectedOption = options.find((o) => o.value === value);

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [open]);

  // Focus search input on open
  useEffect(() => {
    if (open && searchable) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchQuery("");
    }
  }, [open, searchable]);

  // Filter options
  const filteredOptions = searchQuery.trim()
    ? options.filter(
        (o) =>
          o.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          o.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          o.value.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : options;

  const sizeClasses = {
    sm: "h-8 px-2.5 text-xs rounded-xl",
    md: "h-9 px-3 text-xs rounded-xl",
    lg: "h-10 px-3.5 text-sm rounded-2xl",
  };

  return (
    <div ref={containerRef} className={cn("relative inline-block w-full text-left select-none", className)}>
      {label && (
        <label className="block text-[10px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-semibold mb-1">
          {label}
        </label>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className={cn(
          "w-full flex items-center justify-between gap-2 border text-left font-medium transition-all duration-150 cursor-pointer shadow-2xs outline-hidden",
          "bg-white dark:bg-[#15151c] text-zinc-900 dark:text-zinc-100",
          "border-black/[0.08] dark:border-white/[0.08] hover:border-black/[0.16] dark:hover:border-white/[0.16]",
          "hover:bg-zinc-50 dark:hover:bg-[#1b1b24]",
          open && "border-emerald-500/50 dark:border-emerald-500/50 ring-2 ring-emerald-500/15 shadow-sm",
          disabled && "opacity-50 cursor-not-allowed",
          sizeClasses[size],
          triggerClassName
        )}
      >
        <div className="flex items-center gap-2 min-w-0 truncate">
          {selectedOption?.icon && (
            <selectedOption.icon className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          )}
          <span className="truncate block font-heading">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          {selectedOption?.badge && (
            <span className="px-1.5 py-0.5 rounded-full text-[9px] font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
              {selectedOption.badge}
            </span>
          )}
        </div>

        <ChevronDown
          className={cn(
            "w-3.5 h-3.5 text-zinc-400 shrink-0 transition-transform duration-200",
            open && "rotate-180 text-emerald-500"
          )}
        />
      </button>

      {/* Popover Menu */}
      {open && (
        <div
          data-popover-content="true"
          className={cn(
            "absolute z-[100] mt-1.5 w-full min-w-[220px] rounded-2xl p-1.5 shadow-2xl backdrop-blur-xl border animate-in fade-in zoom-in-95 duration-150",
            "bg-white/95 dark:bg-[#121218]/95 border-black/[0.08] dark:border-white/[0.08]",
            popoverClassName
          )}
        >
          {/* Optional Search Filter */}
          {(searchable || options.length > 8) && (
            <div className="relative mb-1.5 px-1">
              <Search className="w-3 h-3 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search options..."
                className="w-full pl-7 pr-2.5 py-1.5 rounded-xl text-xs bg-zinc-100/80 dark:bg-white/[0.05] border border-black/[0.06] dark:border-white/[0.06] text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:border-emerald-500/50"
              />
            </div>
          )}

          {/* Options List */}
          <div className="max-h-60 overflow-y-auto overscroll-contain space-y-0.5 custom-scrollbar pr-0.5">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-zinc-400 font-mono">
                No matching options
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = opt.value === value;
                const OptIcon = opt.icon;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onChange(opt.value);
                      setOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl text-xs text-left transition-all duration-100 cursor-pointer font-heading",
                      isSelected
                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-500/20 shadow-2xs"
                        : "hover:bg-zinc-100 dark:hover:bg-white/[0.05] text-zinc-700 dark:text-zinc-300 border border-transparent"
                    )}
                  >
                    <div className="flex items-start gap-2 min-w-0 pr-1">
                      {OptIcon && (
                        <OptIcon
                          className={cn(
                            "w-3.5 h-3.5 shrink-0 mt-0.5",
                            isSelected ? "text-emerald-500" : "text-zinc-400"
                          )}
                        />
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate block font-semibold">{opt.label}</span>
                          {opt.badge && (
                            <span className="px-1 py-0.2 rounded text-[9px] font-mono font-bold bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                              {opt.badge}
                            </span>
                          )}
                        </div>
                        {opt.description && (
                          <span className="block text-[10px] text-zinc-400 font-normal font-sans line-clamp-1 mt-0.5">
                            {opt.description}
                          </span>
                        )}
                      </div>
                    </div>

                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
