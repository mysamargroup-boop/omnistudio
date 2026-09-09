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

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
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
  }, [isOpen]);

  return (
    <div className={cn("relative space-y-1.5", className)} ref={containerRef}>
      {label && (
        <label className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase tracking-widest block font-mono font-medium">
          {label} //
        </label>
      )}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center justify-between bg-white dark:bg-[#060609] border border-black/[0.1] dark:border-white/[0.08] rounded-xl px-3.5 py-2.5 text-xs text-zinc-900 dark:text-white transition-all duration-150 focus:outline-none focus:border-black/30 dark:focus:border-white/30 font-jakarta cursor-pointer shadow-xs",
          disabled && "opacity-40 cursor-not-allowed",
          isOpen && "border-black/30 dark:border-white/30 bg-zinc-50 dark:bg-[#09090d] shadow-lg"
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
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 max-h-60 overflow-y-auto rounded-xl bg-white dark:bg-[#09090d] border border-black/[0.12] dark:border-white/[0.12] shadow-2xl shadow-black/20 dark:shadow-black py-1 animate-in fade-in zoom-in-95 duration-100">
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={cn(
                  "w-full flex items-center justify-between px-3.5 py-2 text-xs text-left transition-colors font-jakarta cursor-pointer",
                  isSelected
                    ? "bg-zinc-100 text-zinc-950 dark:bg-white/[0.08] dark:text-white font-semibold"
                    : "text-zinc-700 hover:bg-zinc-100/80 hover:text-black dark:text-zinc-400 dark:hover:bg-white/[0.04] dark:hover:text-white"
                )}
              >
                <div className="flex flex-col pr-2 min-w-0">
                  <span className="truncate font-medium">{option.label}</span>
                  {option.description && (
                    <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono mt-0.5 truncate">
                      {option.description}
                    </span>
                  )}
                </div>
                {isSelected && (
                  <Check className="h-3.5 w-3.5 text-zinc-950 dark:text-white shrink-0 ml-2" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
