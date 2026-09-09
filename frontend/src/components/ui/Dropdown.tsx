"use client";
import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DropdownOption {
  value: string | number;
  label: string;
  description?: string;
  badge?: string;
}

interface DropdownProps {
  options: DropdownOption[];
  value: string | number;
  onChange: (value: any) => void;
  label?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export default function Dropdown({
  options,
  value,
  onChange,
  label,
  placeholder = "Select option...",
  className,
  disabled = false,
}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    if (isOpen) {
      const idx = options.findIndex((opt) => opt.value === value);
      setFocusedIndex(idx >= 0 ? idx : 0);
    }
  }, [isOpen, value, options]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        setFocusedIndex((prev) => (prev < options.length - 1 ? prev + 1 : prev));
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setFocusedIndex((prev) => (prev > 0 ? prev - 1 : 0));
      } else if (event.key === "Enter") {
        event.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < options.length) {
          onChange(options[focusedIndex].value);
          setIsOpen(false);
        }
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, focusedIndex, options, onChange]);

  return (
    <div className={cn("relative space-y-1.5", className)} ref={containerRef}>
      {label && (
        <label className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase tracking-widest block font-mono font-medium">
          {label}
        </label>
      )}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center justify-between bg-zinc-50 dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08] rounded-xl px-3.5 py-2.5 text-xs text-zinc-900 dark:text-white transition-all duration-150 focus:outline-none hover:border-black/[0.15] dark:hover:border-white/[0.12] focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50 font-jakarta cursor-pointer shadow-sm",
          disabled && "opacity-40 cursor-not-allowed",
          isOpen && "border-black/30 dark:border-white/30 shadow-lg"
        )}
      >
        <span className="truncate font-medium text-zinc-800 dark:text-zinc-200">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500 transition-transform duration-200 shrink-0 ml-2",
            isOpen && "rotate-180 text-zinc-900 dark:text-white"
          )}
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 max-h-60 overflow-y-auto rounded-xl bg-white dark:bg-[#111118] border border-black/[0.08] dark:border-white/[0.08] shadow-xl py-1 animate-scale-in custom-scrollbar">
          {options.map((option, index) => {
            const isSelected = option.value === value;
            const isFocused = index === focusedIndex;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={cn(
                  "w-full flex items-center justify-between px-3.5 py-2 text-xs text-left transition-colors font-jakarta cursor-pointer rounded-lg mx-1 w-[calc(100%-8px)]",
                  isSelected
                    ? "bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300 font-semibold"
                    : isFocused
                    ? "bg-zinc-50 dark:bg-white/[0.04] text-zinc-900 dark:text-white"
                    : "text-zinc-700 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-white/[0.04] hover:text-black dark:hover:text-white"
                )}
              >
                <div className="flex flex-col pr-2 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium">{option.label}</span>
                    {option.badge && (
                      <span className="rounded-full px-2.5 py-0.5 text-[10px] font-mono uppercase tracking-wider bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300">
                        {option.badge}
                      </span>
                    )}
                  </div>
                  {option.description && (
                    <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono mt-0.5 truncate">
                      {option.description}
                    </span>
                  )}
                </div>
                {isSelected && (
                  <Check className="h-3.5 w-3.5 text-violet-500 shrink-0 ml-2" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
