"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, Clock, BookOpen, AlertCircle } from "lucide-react";
import { meetingsApi } from "../../../lib/meetings-api";

export default function ScheduleMeetingPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [meetingType, setMeetingType] = useState<"CLASS" | "MEETING">("CLASS");
  const [startsAt, setStartsAt] = useState(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + 10);
    return d.toISOString().slice(0, 16);
  });
  const [endsAt, setEndsAt] = useState(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + 70);
    return d.toISOString().slice(0, 16);
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const start = new Date(startsAt);
    const end = new Date(endsAt);

    if (end <= start) {
      setError("End time must be after start time.");
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

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-xl">
        <h1 className="text-2xl font-bold text-white tracking-tight">
          Schedule Classroom or Meeting
        </h1>
        <p className="text-sm text-zinc-400 mt-1">
          Configure an authorized session in School ERP with LiveKit video integration.
        </p>

        {error && (
          <div className="mt-6 p-4 rounded-xl bg-red-950/60 border border-red-900/60 text-red-300 text-sm flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
              Title
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Grade 10 Physics — Kinematics Review"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
              Session Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMeetingType("CLASS")}
                className={`py-3 px-4 rounded-xl text-sm font-semibold border flex items-center justify-center space-x-2 transition ${
                  meetingType === "CLASS"
                    ? "bg-indigo-600/20 border-indigo-500 text-indigo-400"
                    : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span>Academic Class</span>
              </button>
              <button
                type="button"
                onClick={() => setMeetingType("MEETING")}
                className={`py-3 px-4 rounded-xl text-sm font-semibold border flex items-center justify-center space-x-2 transition ${
                  meetingType === "MEETING"
                    ? "bg-indigo-600/20 border-indigo-500 text-indigo-400"
                    : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                }`}
              >
                <Calendar className="w-4 h-4" />
                <span>Parent / Staff Meeting</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
              Description (Optional)
            </label>
            <textarea
              rows={3}
              placeholder="Provide topics, syllabus references or notes for attendees..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm resize-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                Start Time
              </label>
              <input
                type="datetime-local"
                required
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                End Time
              </label>
              <input
                type="datetime-local"
                required
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
                className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-800 flex justify-end space-x-3">
            <Link
              href="/meetings"
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-zinc-400 hover:text-white transition"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition disabled:opacity-50"
            >
              {loading ? "Scheduling..." : "Create Class Session"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
