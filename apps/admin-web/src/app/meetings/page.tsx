"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Video,
  Calendar,
  Clock,
  User,
  Plus,
  Play,
  CheckCircle2,
  AlertCircle,
  Database,
  ArrowRight,
} from "lucide-react";
import { meetingsApi, setAuthToken } from "../../lib/meetings-api";
import { Meeting, User as UserType } from "../../types/meeting";

const DEMO_ACCOUNTS = [
  { role: "TEACHER", email: "teacher@greenwood.edu", label: "Teacher (Sarah Jenkins)" },
  { role: "STUDENT", email: "student1@greenwood.edu", label: "Student (Alex Rivera)" },
  { role: "PARENT", email: "parent1@greenwood.edu", label: "Parent (Robert Rivera)" },
  { role: "ADMIN", email: "admin@greenwood.edu", label: "Admin (Skinner)" },
];

export default function MeetingsPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [currentEmail, setCurrentEmail] = useState("teacher@greenwood.edu");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const switchAccount = async (email: string) => {
    try {
      setLoading(true);
      setError(null);
      setCurrentEmail(email);
      await meetingsApi.login(email, "password123");
      const user = await meetingsApi.getCurrentUser();
      setCurrentUser(user);
      const list = await meetingsApi.listMeetings(statusFilter || undefined);
      setMeetings(list);
    } catch (err: any) {
      setError(err.message || "Failed to switch user account.");
    } finally {
      setLoading(false);
    }
  };

  const seedDatabase = async () => {
    try {
      setLoading(true);
      await meetingsApi.seedDemo();
      await switchAccount(currentEmail);
    } catch (err: any) {
      setError("Failed to seed demo data. Is the backend running?");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    switchAccount(currentEmail);
  }, [statusFilter]);

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Top Banner: Role Selection & DB Seed */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 mb-8 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            Simulate ERP User Session
          </span>
          <div className="flex flex-wrap gap-2 mt-2">
            {DEMO_ACCOUNTS.map((acc) => (
              <button
                key={acc.email}
                type="button"
                onClick={() => switchAccount(acc.email)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  currentEmail === acc.email
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                    : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                }`}
              >
                {acc.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={seedDatabase}
            className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 flex items-center space-x-1.5 transition"
          >
            <Database className="w-3.5 h-3.5 text-indigo-400" />
            <span>Seed Demo Data</span>
          </button>
          <Link
            href="/meetings/schedule"
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center space-x-1.5 shadow-md shadow-indigo-600/30 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Schedule New Class</span>
          </Link>
        </div>
      </div>

      {/* Header and Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Classrooms & Meetings
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Logged in as{" "}
            <span className="font-semibold text-zinc-200">
              {currentUser?.full_name}
            </span>{" "}
            ({currentUser?.role})
          </p>
        </div>

        <div className="flex items-center space-x-2 bg-zinc-900 border border-zinc-800 p-1 rounded-xl text-xs">
          {["", "SCHEDULED", "LIVE", "ENDED"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg font-medium transition ${
                statusFilter === st
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              {st === "" ? "All" : st.charAt(0) + st.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-950/60 border border-red-900/60 text-red-300 text-sm flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Meeting Cards Grid */}
      {loading ? (
        <div className="h-64 flex items-center justify-center text-zinc-500 text-sm">
          Loading meetings...
        </div>
      ) : meetings.length === 0 ? (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-12 text-center">
          <Video className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-white">No classes scheduled</h3>
          <p className="text-sm text-zinc-400 mt-1">
            There are no meetings available for this role and filter.
          </p>
          <div className="mt-6">
            <Link
              href="/meetings/schedule"
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-500 transition shadow-md shadow-indigo-600/30"
            >
              <Plus className="w-4 h-4" />
              <span>Schedule your first class</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {meetings.map((meeting) => {
            const isLive = meeting.status === "LIVE";
            const isEnded = meeting.status === "ENDED";

            return (
              <div
                key={meeting.id}
                className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700/80 rounded-2xl p-5 shadow-sm transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                        isLive
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 animate-pulse"
                          : isEnded
                          ? "bg-zinc-800 text-zinc-400 border-zinc-700"
                          : "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                      }`}
                    >
                      {isLive ? "● LIVE NOW" : meeting.status}
                    </span>
                    <span className="text-[11px] font-medium text-zinc-500">
                      {meeting.meeting_type}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white line-clamp-1">
                    {meeting.title}
                  </h3>
                  {meeting.description && (
                    <p className="text-xs text-zinc-400 mt-1.5 line-clamp-2">
                      {meeting.description}
                    </p>
                  )}

                  <div className="mt-4 space-y-1.5 text-xs text-zinc-400 border-t border-zinc-800/80 pt-3">
                    <div className="flex items-center space-x-2">
                      <Clock className="w-3.5 h-3.5 text-zinc-500" />
                      <span>
                        {new Date(meeting.starts_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}{" "}
                        –{" "}
                        {new Date(meeting.ends_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <User className="w-3.5 h-3.5 text-zinc-500" />
                      <span>Host: {meeting.host_name || "Faculty"}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-3 border-t border-zinc-800/80 flex items-center justify-between">
                  <span className="text-xs text-zinc-500">
                    {meeting.participants_count} attendees
                  </span>
                  <Link
                    href={`/meetings/${meeting.id}`}
                    className={`inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition ${
                      isLive
                        ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/30"
                        : isEnded
                        ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                        : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30"
                    }`}
                  >
                    <span>{isEnded ? "View Summary" : isLive ? "Join Live" : "Enter Lobby"}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
