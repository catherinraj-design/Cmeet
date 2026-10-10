"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  Clock,
  BookOpen,
  AlertCircle,
  Zap,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { meetingsApi } from "../../../lib/meetings-api";

export default function ScheduleMeetingPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [meetingType, setMeetingType] = useState<"CLASS" | "MEETING">("CLASS");

  // Format date helper for datetime-local
  const toLocalISO = (d: Date) => {
    const tzOffset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
  };

  // Preset states
  const [selectedStartPreset, setSelectedStartPreset] = useState<string>("now");
  const [selectedDuration, setSelectedDuration] = useState<number>(45); // default 45 mins

  const computeTimes = (startPreset: string, durationMinutes: number) => {
    const start = new Date();
    if (startPreset === "now") {
      start.setMinutes(start.getMinutes() + 2);
    } else if (startPreset === "15m") {
      start.setMinutes(start.getMinutes() + 15);
    } else if (startPreset === "1h") {
      start.setHours(start.getHours() + 1);
    } else if (startPreset === "tomorrow_9am") {
      start.setDate(start.getDate() + 1);
      start.setHours(9, 0, 0, 0);
    } else if (startPreset === "tomorrow_2pm") {
      start.setDate(start.getDate() + 1);
      start.setHours(14, 0, 0, 0);
    }

    const end = new Date(start.getTime() + durationMinutes * 60000);
    return {
      starts: toLocalISO(start),
      ends: toLocalISO(end),
    };
  };

  const initial = computeTimes("now", 45);
  const [startsAt, setStartsAt] = useState(initial.starts);
  const [endsAt, setEndsAt] = useState(initial.ends);
  const [showAdvancedTimes, setShowAdvancedTimes] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStartPresetClick = (preset: string) => {
    setSelectedStartPreset(preset);
    const { starts, ends } = computeTimes(preset, selectedDuration);
    setStartsAt(starts);
    setEndsAt(ends);
  };

  const handleDurationClick = (minutes: number) => {
    setSelectedDuration(minutes);
    const start = new Date(startsAt);
    const end = new Date(start.getTime() + minutes * 60000);
    setEndsAt(toLocalISO(end));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const start = new Date(startsAt);
    const end = new Date(endsAt);

    if (end <= start) {
      setError("End time must be strictly after start time.");
      return;
    }

    try {
      setLoading(true);
      await meetingsApi.createMeeting({
        title,
        description,
        meeting_type: meetingType,
        starts_at: start.toISOString(),
        ends_at: end.toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
      });
      router.push("/meetings");
    } catch (err: any) {
      setError(err.message || "Failed to schedule meeting.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <Link
        href="/meetings"
        className="inline-flex items-center space-x-1.5 text-xs text-zinc-400 hover:text-white transition mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Classrooms</span>
      </Link>

      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl">
        <div className="flex items-center space-x-2 text-indigo-400 text-xs font-semibold mb-2">
          <Sparkles className="w-4 h-4" />
          <span>School ERP Scheduling Assistant</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
          Schedule Classroom or Meeting
        </h1>
        <p className="text-sm text-zinc-400 mt-1">
          Set up an authorized online class session with one-click timing presets.
        </p>

        {error && (
          <div className="mt-6 p-4 rounded-xl bg-red-950/60 border border-red-900/60 text-red-300 text-sm flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-8 space-y-7">
          {/* Class Title */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
              Class Title
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Grade 10 Physics — Kinematics Review"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-2xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm shadow-inner"
            />
          </div>

          {/* Session Type */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
              Session Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMeetingType("CLASS")}
                className={`py-3 px-4 rounded-2xl text-sm font-semibold border flex items-center justify-center space-x-2 transition ${
                  meetingType === "CLASS"
                    ? "bg-indigo-600/20 border-indigo-500 text-indigo-400 ring-2 ring-indigo-500/20 shadow-md"
                    : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span>Academic Class</span>
              </button>
              <button
                type="button"
                onClick={() => setMeetingType("MEETING")}
                className={`py-3 px-4 rounded-2xl text-sm font-semibold border flex items-center justify-center space-x-2 transition ${
                  meetingType === "MEETING"
                    ? "bg-indigo-600/20 border-indigo-500 text-indigo-400 ring-2 ring-indigo-500/20 shadow-md"
                    : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                }`}
              >
                <Calendar className="w-4 h-4" />
                <span>Parent / Staff Meeting</span>
              </button>
            </div>
          </div>

          {/* EASY TIMING SECTION */}
          <div className="bg-zinc-950/70 border border-zinc-800/80 rounded-2xl p-5 space-y-5">
            {/* Step 1: When should it start? */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center space-x-1.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-400" />
                  <span>1. When should it start? (Easy Pick)</span>
                </label>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { id: "now", label: "⚡ Start Right Now", sub: "in 2 mins" },
                  { id: "15m", label: "🕒 In 15 Mins", sub: "soon" },
                  { id: "1h", label: "⏰ In 1 Hour", sub: "later today" },
                  { id: "tomorrow_9am", label: "🌅 Tomorrow 9 AM", sub: "morning period" },
                  { id: "tomorrow_2pm", label: "☀️ Tomorrow 2 PM", sub: "afternoon period" },
                ].map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleStartPresetClick(preset.id)}
                    className={`py-2.5 px-3 rounded-xl text-left border transition flex flex-col justify-between ${
                      selectedStartPreset === preset.id
                        ? "bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30"
                        : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:border-zinc-700"
                    }`}
                  >
                    <span className="text-xs font-bold leading-tight">{preset.label}</span>
                    <span className={`text-[10px] mt-0.5 ${
                      selectedStartPreset === preset.id ? "text-indigo-200" : "text-zinc-500"
                    }`}>
                      {preset.sub}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2: Class Duration */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2.5">
                2. Class Duration (Easy Pick)
              </label>

              <div className="grid grid-cols-4 gap-2">
                {[
                  { mins: 30, label: "30 Mins" },
                  { mins: 45, label: "45 Mins (Standard)" },
                  { mins: 60, label: "1 Hour" },
                  { mins: 90, label: "90 Mins" },
                ].map((dur) => (
                  <button
                    key={dur.mins}
                    type="button"
                    onClick={() => handleDurationClick(dur.mins)}
                    className={`py-2.5 px-2 rounded-xl text-center border text-xs font-semibold transition ${
                      selectedDuration === dur.mins
                        ? "bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30"
                        : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:border-zinc-700"
                    }`}
                  >
                    {dur.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Confirmation Preview Badge */}
            <div className="bg-zinc-900/90 border border-zinc-800 p-3.5 rounded-xl flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2 text-zinc-300">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="font-semibold text-white">Scheduled Window:</span>
                <span>
                  {new Date(startsAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  {" – "}
                  {new Date(endsAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  {" ("}{selectedDuration} minutes{")"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowAdvancedTimes(!showAdvancedTimes)}
                className="text-zinc-400 hover:text-indigo-300 flex items-center space-x-1 text-[11px] underline"
              >
                <span>{showAdvancedTimes ? "Hide custom picker" : "Edit exact dates"}</span>
                {showAdvancedTimes ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            </div>

            {/* Optional Advanced Date-Time Input Fields */}
            {showAdvancedTimes && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-zinc-800/80">
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                    Custom Start Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={startsAt}
                    onChange={(e) => {
                      setStartsAt(e.target.value);
                      setSelectedStartPreset("custom");
                    }}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-xs focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                    Custom End Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={endsAt}
                    onChange={(e) => {
                      setEndsAt(e.target.value);
                    }}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-xs focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
              Description / Class Notes (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Chapter 3: Equations, Problem Sets 1–10 walkthrough..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-2xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-zinc-800 flex items-center justify-end space-x-3">
            <Link
              href="/meetings"
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-zinc-400 hover:text-white transition"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="px-7 py-3 rounded-2xl text-sm font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition disabled:opacity-50 flex items-center space-x-2"
            >
              <Zap className="w-4 h-4" />
              <span>{loading ? "Creating..." : "Confirm & Schedule Class"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
