"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Calendar as CalendarIcon,
  Clock,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Zap,
  Check,
  X,
  Globe,
  Sun,
  Moon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ModernScheduleDatePickerProps {
  value: string;
  onChange: (isoOrFormatted: string) => void;
  className?: string;
  disabled?: boolean;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

const QUICK_PRESETS = [
  { label: "+2h Boost", getVal: () => new Date(Date.now() + 2 * 3600 * 1000) },
  {
    label: "Tomorrow 10 AM",
    getVal: () => {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      d.setHours(10, 0, 0, 0);
      return d;
    },
  },
  {
    label: "Tomorrow 7 PM",
    getVal: () => {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      d.setHours(19, 0, 0, 0);
      return d;
    },
  },
  {
    label: "Weekend 11 AM",
    getVal: () => {
      const d = new Date();
      const day = d.getDay();
      const daysUntilSaturday = (6 - day + 7) % 7 || 7;
      d.setDate(d.getDate() + daysUntilSaturday);
      d.setHours(11, 0, 0, 0);
      return d;
    },
  },
  {
    label: "Peak Viral 8:30 PM",
    getVal: () => {
      const d = new Date();
      if (d.getHours() >= 20) d.setDate(d.getDate() + 1);
      d.setHours(20, 30, 0, 0);
      return d;
    },
  },
];

const POPULAR_TIMES = [
  "09:00", "11:00", "13:30", "16:00", "18:00", "19:30", "21:00"
];

export default function ModernScheduleDatePicker({
  value,
  onChange,
  className,
  disabled = false,
}: ModernScheduleDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Initial date parsed from value, or defaulting to tomorrow 10:00 AM
  const getInitialDate = () => {
    if (value) {
      const parsed = new Date(value);
      if (!isNaN(parsed.getTime())) return parsed;
    }
    const def = new Date();
    def.setDate(def.getDate() + 1);
    def.setHours(10, 0, 0, 0);
    return def;
  };

  const [selectedDate, setSelectedDate] = useState<Date>(getInitialDate());
  const [viewYear, setViewYear] = useState<number>(selectedDate.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(selectedDate.getMonth());
  const [hours, setHours] = useState<number>(selectedDate.getHours());
  const [minutes, setMinutes] = useState<number>(selectedDate.getMinutes());

  // Close on outside click
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleOutside);
    }
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [isOpen]);

  // Synchronize when value changes externally
  useEffect(() => {
    if (value) {
      const parsed = new Date(value);
      if (!isNaN(parsed.getTime())) {
        setSelectedDate(parsed);
        setViewYear(parsed.getFullYear());
        setViewMonth(parsed.getMonth());
        setHours(parsed.getHours());
        setMinutes(parsed.getMinutes());
      }
    }
  }, [value]);

  const formatLocalISO = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const h = String(d.getHours()).padStart(2, "0");
    const m = String(d.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${h}:${m}`;
  };

  const handleApplyDate = (newDate: Date) => {
    setSelectedDate(newDate);
    onChange(formatLocalISO(newDate));
  };

  const handleApplyPreset = (preset: (typeof QUICK_PRESETS)[0]) => {
    const d = preset.getVal();
    setSelectedDate(d);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
    setHours(d.getHours());
    setMinutes(d.getMinutes());
    handleApplyDate(d);
  };

  const handleSelectDay = (day: number) => {
    const next = new Date(viewYear, viewMonth, day, hours, minutes);
    if (next.getTime() < Date.now()) return; // Don't allow past time
    handleApplyDate(next);
  };

  const handleTimeChange = (newHours: number, newMinutes: number) => {
    setHours(newHours);
    setMinutes(newMinutes);
    const next = new Date(selectedDate);
    next.setHours(newHours, newMinutes);
    handleApplyDate(next);
  };

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((prev) => prev - 1);
    } else {
      setViewMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((prev) => prev + 1);
    } else {
      setViewMonth((prev) => prev + 1);
    }
  };

  // Days in month calculation
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayIndex = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7; // Monday = 0
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

  const formattedDisplay = value
    ? new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }).format(selectedDate)
    : "Pick publication date & time";

  // Get local timezone abbreviation
  const tzName = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      {/* Modern Workstation Trigger Field */}
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl border transition-all cursor-pointer select-none",
          isOpen
            ? "border-emerald-500 bg-emerald-500/[0.04] ring-2 ring-emerald-500/20 shadow-xs"
            : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 hover:border-zinc-300 dark:hover:border-zinc-700 shadow-2xs",
          disabled && "opacity-50 cursor-not-allowed pointer-events-none"
        )}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
            <CalendarIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider flex items-center gap-1.5 font-bold">
              <span>SCHEDULE LAUNCH</span>
              <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <div className="text-xs font-mono font-semibold text-zinc-900 dark:text-zinc-100 truncate">
              {formattedDisplay}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 hidden sm:inline-block">
            {tzName.split("/").pop()?.replace("_", " ") || "UTC"}
          </span>
          <Clock className="w-3.5 h-3.5 text-zinc-400" />
        </div>
      </div>

      {/* Modern Floating Calendar Popover */}
      {isOpen && (
        <div
          data-lenis-prevent="true"
          className="absolute z-50 left-0 right-0 sm:left-auto sm:right-0 sm:w-96 mt-2 rounded-2xl bg-[#0e0e12] border border-zinc-800 shadow-2xl p-4 animate-in fade-in-50 zoom-in-95 duration-150 text-white font-sans space-y-3.5"
        >
          {/* Header row with Quick Presets */}
          <div>
            <div className="text-[10px] font-mono text-zinc-400 uppercase font-bold tracking-wider mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Zap className="w-3 h-3 text-emerald-400" />
                Quick Optimal Presets
              </span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 text-zinc-400 hover:text-white rounded-md hover:bg-zinc-800 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {QUICK_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => handleApplyPreset(preset)}
                  className="px-2.5 py-1 rounded-lg text-[10px] font-mono font-medium bg-zinc-900 hover:bg-emerald-500/20 text-zinc-300 hover:text-emerald-300 border border-zinc-800 hover:border-emerald-500/40 transition-all cursor-pointer whitespace-nowrap"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Month & Year Navigation Header */}
          <div className="flex items-center justify-between pt-1 border-t border-zinc-800/80">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold font-mono text-white">
                {MONTH_NAMES[viewMonth]} {viewYear}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                title="Previous Month"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  const now = new Date();
                  setViewYear(now.getFullYear());
                  setViewMonth(now.getMonth());
                }}
                className="px-2 py-0.5 rounded-lg text-[10px] font-mono bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                Today
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                title="Next Month"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Weekdays Row */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {WEEKDAYS.map((wd) => (
              <span key={wd} className="text-[10px] font-mono text-zinc-500 font-bold py-1">
                {wd}
              </span>
            ))}
          </div>

          {/* Calendar 7-Column Day Grid */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {/* Previous month filler days */}
            {Array.from({ length: firstDayIndex }).map((_, idx) => {
              const prevDayNum = daysInPrevMonth - firstDayIndex + idx + 1;
              return (
                <div
                  key={`prev-${idx}`}
                  className="h-8 rounded-lg flex items-center justify-center text-[11px] font-mono text-zinc-700 opacity-40 select-none"
                >
                  {prevDayNum}
                </div>
              );
            })}

            {/* Current month days */}
            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const dayNum = idx + 1;
              const cellDate = new Date(viewYear, viewMonth, dayNum, 23, 59, 59);
              const isPast = cellDate.getTime() < Date.now();
              const isSelected =
                selectedDate.getDate() === dayNum &&
                selectedDate.getMonth() === viewMonth &&
                selectedDate.getFullYear() === viewYear;
              const isToday =
                new Date().getDate() === dayNum &&
                new Date().getMonth() === viewMonth &&
                new Date().getFullYear() === viewYear;

              return (
                <button
                  key={`day-${dayNum}`}
                  type="button"
                  disabled={isPast}
                  onClick={() => handleSelectDay(dayNum)}
                  className={cn(
                    "h-8 rounded-lg flex items-center justify-center text-xs font-mono font-medium transition-all relative cursor-pointer select-none",
                    isPast && "text-zinc-700 cursor-not-allowed line-through opacity-30",
                    !isPast && !isSelected && "hover:bg-zinc-800 text-zinc-300 hover:text-white",
                    isSelected && "bg-emerald-500 text-zinc-950 font-bold shadow-md shadow-emerald-500/20 ring-2 ring-emerald-400/40",
                    isToday && !isSelected && "border border-emerald-500/40 text-emerald-400"
                  )}
                >
                  <span>{dayNum}</span>
                  {isToday && (
                    <span className={cn(
                      "w-1 h-1 rounded-full absolute bottom-1",
                      isSelected ? "bg-zinc-950" : "bg-emerald-400"
                    )} />
                  )}
                </button>
              );
            })}
          </div>

          {/* Time Picker & Scrubber Section */}
          <div className="pt-2 border-t border-zinc-800/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-zinc-400 uppercase font-bold flex items-center gap-1">
                <Clock className="w-3 h-3 text-emerald-400" />
                Dispatch Time
              </span>
              <div className="flex items-center gap-1">
                <input
                  type="time"
                  value={`${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`}
                  onChange={(e) => {
                    const [h, m] = e.target.value.split(":").map(Number);
                    if (!isNaN(h) && !isNaN(m)) handleTimeChange(h, m);
                  }}
                  className="px-2 py-0.5 rounded-lg bg-zinc-900 border border-zinc-700 text-xs font-mono text-emerald-400 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Quick Time Slots */}
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-0.5">
              {POPULAR_TIMES.map((timeStr) => {
                const [th, tm] = timeStr.split(":").map(Number);
                const isCurrentTime = hours === th && minutes === tm;
                return (
                  <button
                    key={timeStr}
                    type="button"
                    onClick={() => handleTimeChange(th, tm)}
                    className={cn(
                      "px-2 py-0.5 rounded-md text-[10px] font-mono transition-all shrink-0 cursor-pointer border",
                      isCurrentTime
                        ? "bg-emerald-500 text-zinc-950 font-bold border-emerald-400"
                        : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200 hover:bg-zinc-800"
                    )}
                  >
                    {timeStr}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Footer Summary & Confirm Button */}
          <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between gap-2">
            <div className="text-[10px] font-mono text-zinc-400 truncate">
              {selectedDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} at{" "}
              <strong className="text-emerald-400 font-bold">
                {String(hours).padStart(2, "0")}:{String(minutes).padStart(2, "0")}
              </strong>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  onChange("");
                  setIsOpen(false);
                }}
                className="px-2.5 py-1 rounded-lg text-[10px] font-mono text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => {
                  handleApplyDate(selectedDate);
                  setIsOpen(false);
                }}
                className="px-3 py-1 rounded-lg text-xs font-mono font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1 transition-all cursor-pointer shadow-sm"
              >
                <Check className="w-3 h-3" />
                <span>Confirm</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
