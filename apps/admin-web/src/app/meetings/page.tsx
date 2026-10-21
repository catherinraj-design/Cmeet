"use client";

import React, { useEffect, useState, useMemo } from "react";
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
  History,
  RotateCcw,
  ExternalLink,
  BookOpen,
  Users,
  Search,
  ChevronRight,
  Sparkles,
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

  // Filter state: ONLY "LIVE", "SCHEDULED", or "HISTORY" (All Active removed!)
  const [activeTab, setActiveTab] = useState<"LIVE" | "SCHEDULED" | "HISTORY">("LIVE");

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Live clock display (Google Meet style)
  const [currentTimeStr, setCurrentTimeStr] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const time = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const date = now.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
      setCurrentTimeStr(`${time} • ${date}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  // Determine if the current role is Teacher or Admin
  const isTeacherOrAdmin = useMemo(() => {
    if (!currentUser) {
      return currentEmail === "teacher@greenwood.edu" || currentEmail === "admin@greenwood.edu";
    }
    const role = currentUser.role as string;
    return (
      role === "TEACHER" ||
      role === "SCHOOL_ADMIN" ||
      role === "SUPER_ADMIN" ||
      role === "ADMIN" ||
      currentEmail.includes("teacher") ||
      currentEmail.includes("admin")
    );
  }, [currentUser, currentEmail]);

  // If role changes to Student/Parent while on HISTORY, fallback to LIVE or SCHEDULED
  useEffect(() => {
    if (!isTeacherOrAdmin && activeTab === "HISTORY") {
      setActiveTab("LIVE");
    }
  }, [isTeacherOrAdmin, activeTab]);

  const switchAccount = async (email: string) => {
    try {
      setLoading(true);
      setError(null);
      setCurrentEmail(email);
      await meetingsApi.login(email, "password123");
      const user = await meetingsApi.getCurrentUser();
      setCurrentUser(user);
      const list = await meetingsApi.listMeetings();
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
  }, []);

  // Filter categories
  const liveMeetings = useMemo(() => {
    return meetings.filter((m) => m.status === "LIVE");
  }, [meetings]);

  const scheduledMeetings = useMemo(() => {
    return meetings.filter((m) => m.status === "SCHEDULED");
  }, [meetings]);

  const historyMeetings = useMemo(() => {
    const now = new Date().getTime();
    return meetings
      .filter((m) => {
        const endTime = new Date(m.ends_at).getTime();
        return m.status === "ENDED" || m.status === "CANCELLED" || endTime < now;
      })
      .sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime());
  }, [meetings]);

  // Active items based on selected tab and search
  const displayedMeetings = useMemo(() => {
    let list: Meeting[] = [];
    if (activeTab === "LIVE") list = liveMeetings;
    else if (activeTab === "SCHEDULED") list = scheduledMeetings;
    else if (activeTab === "HISTORY") list = historyMeetings;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (m) =>
          m.title.toLowerCase().includes(q) ||
          (m.description && m.description.toLowerCase().includes(q)) ||
          (m.host_name && m.host_name.toLowerCase().includes(q))
      );
    }
    return list;
  }, [activeTab, liveMeetings, scheduledMeetings, historyMeetings, searchQuery]);

  // Grouped history by previous dates
  const groupedHistory = useMemo(() => {
    const groups: { [dateStr: string]: Meeting[] } = {};
    for (const m of displayedMeetings) {
      const d = new Date(m.starts_at);
      const formattedDate = d.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      });
      if (!groups[formattedDate]) groups[formattedDate] = [];
      groups[formattedDate].push(m);
    }
    return groups;
  }, [displayedMeetings]);

  return (
    <div className="min-h-screen bg-[#202124] text-[#e8eaed]">
      {/* Google Meet Navigation Bar */}
      <nav className="h-16 px-4 sm:px-6 flex items-center justify-between border-b border-[#3c4043] bg-[#202124]">
        {/* Left: Google Meet Logo & Live Time */}
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#1a73e8] to-[#8ab4f8] flex items-center justify-center text-white shadow-md">
              <Video className="w-5 h-5 text-white" />
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="font-semibold text-lg text-white tracking-tight">Meet</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-[#3c4043] text-[#9aa0a6]">
                School ERP
              </span>
            </div>
          </div>

          {currentTimeStr && (
            <span className="hidden md:inline-block text-sm text-[#9aa0a6] font-medium">
              {currentTimeStr}
            </span>
          )}
        </div>

        {/* Right: Role Switcher & Schedule Action Button */}
        <div className="flex items-center space-x-3">
          {/* Quick ERP Role Simulation Pill Selector */}
          <div className="flex items-center bg-[#292a2d] border border-[#3c4043] rounded-full p-1 text-xs">
            {DEMO_ACCOUNTS.map((acc) => (
              <button
                key={acc.email}
                type="button"
                onClick={() => switchAccount(acc.email)}
                className={`px-3 py-1 rounded-full font-medium transition ${
                  currentEmail === acc.email
                    ? "bg-[#1a73e8] text-white shadow-sm"
                    : "text-[#9aa0a6] hover:text-white"
                }`}
                title={acc.label}
              >
                {acc.role.charAt(0) + acc.role.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={seedDatabase}
            className="hidden sm:inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-[#292a2d] hover:bg-[#3c4043] text-[#9aa0a6] hover:text-white border border-[#3c4043] transition"
            title="Seed demo classrooms"
          >
            <Database className="w-3.5 h-3.5 text-[#8ab4f8]" />
            <span>Seed</span>
          </button>

          {/* "+ Schedule Class" button: SHOWN ONLY FOR TEACHER & ADMIN */}
          {isTeacherOrAdmin && (
            <Link
              href="/meetings/schedule"
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-full text-xs font-semibold bg-[#1a73e8] hover:bg-[#1557b0] text-white shadow-md transition"
            >
              <Plus className="w-4 h-4" />
              <span>Schedule Class</span>
            </Link>
          )}

          {/* User profile avatar */}
          <div
            className="w-8 h-8 rounded-full bg-[#1a73e8] text-white font-bold flex items-center justify-center text-xs shadow-inner"
            title={`${currentUser?.full_name || "User"} (${currentUser?.role || "Active"})`}
          >
            {(currentUser?.full_name || currentEmail || "U").charAt(0).toUpperCase()}
          </div>
        </div>
      </nav>

      {/* Main Content Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Error notification */}
        {error && (
          <div className="p-4 rounded-2xl bg-[#ea4335]/20 border border-[#ea4335]/40 text-[#f28b82] text-sm flex items-center space-x-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Section Header & Google Meet Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#e8eaed]">
              {activeTab === "LIVE"
                ? "Live Meetings"
                : activeTab === "SCHEDULED"
                ? "Upcoming Scheduled Meetings"
                : "Meeting History & Previous Dates"}
            </h1>
            <p className="text-xs sm:text-sm text-[#9aa0a6] mt-0.5">
              Logged in as <span className="text-[#e8eaed] font-medium">{currentUser?.full_name}</span>{" "}
              ({currentUser?.role}) •{" "}
              {isTeacherOrAdmin
                ? "Host & scheduling privileges enabled"
                : "Participant access enabled (join meetings only)"}
            </p>
          </div>

          {/* Filter Pills (All Active REMOVED. Only Live, Scheduled, and History for Teacher/Admin) */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#9aa0a6]" />
              <input
                type="text"
                placeholder="Search meetings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-[#292a2d] border border-[#3c4043] rounded-full text-xs text-[#e8eaed] placeholder-[#9aa0a6] focus:outline-none focus:border-[#8ab4f8] w-40 sm:w-52"
              />
            </div>

            {/* Filter Tabs: LIVE, SCHEDULED, and HISTORY (History only for Teacher/Admin) */}
            <div className="flex items-center bg-[#292a2d] border border-[#3c4043] rounded-full p-1 text-xs">
              {/* 1. LIVE */}
              <button
                type="button"
                onClick={() => setActiveTab("LIVE")}
                className={`px-3.5 py-1.5 rounded-full font-semibold flex items-center space-x-1.5 transition ${
                  activeTab === "LIVE"
                    ? "bg-[#137333] text-[#81c995] border border-[#34a853]/60 shadow-sm"
                    : "text-[#9aa0a6] hover:text-white"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-[#81c995] animate-pulse" />
                <span>Live ({liveMeetings.length})</span>
              </button>

              {/* 2. SCHEDULED */}
              <button
                type="button"
                onClick={() => setActiveTab("SCHEDULED")}
                className={`px-3.5 py-1.5 rounded-full font-semibold transition ${
                  activeTab === "SCHEDULED"
                    ? "bg-[#1a73e8] text-white shadow-sm"
                    : "text-[#9aa0a6] hover:text-white"
                }`}
              >
                <span>Scheduled ({scheduledMeetings.length})</span>
              </button>

              {/* 3. HISTORY: Visible ONLY to Teacher and Admin! */}
              {isTeacherOrAdmin && (
                <button
                  type="button"
                  onClick={() => setActiveTab("HISTORY")}
                  className={`px-3.5 py-1.5 rounded-full font-semibold flex items-center space-x-1.5 transition ${
                    activeTab === "HISTORY"
                      ? "bg-[#8ab4f8] text-[#131314] shadow-sm font-bold"
                      : "text-[#9aa0a6] hover:text-white"
                  }`}
                >
                  <History className="w-3.5 h-3.5" />
                  <span>History ({historyMeetings.length})</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Content Area */}
        {loading ? (
          <div className="h-64 flex flex-col items-center justify-center space-y-3 text-[#9aa0a6] text-sm">
            <div className="w-8 h-8 border-2 border-[#8ab4f8] border-t-transparent rounded-full animate-spin" />
            <span>Loading Google Meet sessions...</span>
          </div>
        ) : activeTab === "HISTORY" && isTeacherOrAdmin ? (
          /* HISTORY VIEW (Teacher & Admin Only) Grouped by Date */
          Object.keys(groupedHistory).length === 0 ? (
            <div className="bg-[#292a2d] border border-[#3c4043] rounded-3xl p-12 text-center space-y-3">
              <History className="w-12 h-12 text-[#5f6368] mx-auto" />
              <h3 className="text-base font-semibold text-[#e8eaed]">No previous meetings found</h3>
              <p className="text-xs text-[#9aa0a6] max-w-sm mx-auto">
                Completed or past classes will be organized here by their previous calendar dates.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedHistory).map(([dateStr, items]) => (
                <div key={dateStr} className="space-y-3">
                  <div className="flex items-center space-x-2 text-xs font-semibold text-[#9aa0a6] pb-1 border-b border-[#3c4043]">
                    <Calendar className="w-3.5 h-3.5 text-[#8ab4f8]" />
                    <span className="text-[#e8eaed]">{dateStr}</span>
                    <span>• {items.length} {items.length === 1 ? "session" : "sessions"}</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {items.map((meeting) => {
                      const start = new Date(meeting.starts_at);
                      const end = new Date(meeting.ends_at);
                      const dur = Math.round((end.getTime() - start.getTime()) / 60000);

                      return (
                        <div
                          key={meeting.id}
                          className="bg-[#292a2d] border border-[#3c4043] hover:border-[#5f6368] rounded-2xl p-4 shadow-sm transition flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                  meeting.status === "LIVE"
                                    ? "bg-[#137333]/40 text-[#81c995] border border-[#34a853]/60 animate-pulse"
                                    : "bg-[#3c4043] text-[#bdc1c6] border border-[#5f6368]"
                                }`}
                              >
                                {meeting.status}
                              </span>
                              <span className="text-[11px] text-[#9aa0a6]">
                                {meeting.meeting_type === "CLASS" ? "Academic Class" : "Meeting"}
                              </span>
                            </div>

                            <h3 className="text-sm font-bold text-[#e8eaed] line-clamp-1">
                              {meeting.title}
                            </h3>
                            {meeting.description && (
                              <p className="text-xs text-[#9aa0a6] mt-1 line-clamp-2">
                                {meeting.description}
                              </p>
                            )}

                            <div className="mt-3 space-y-1 text-xs text-[#9aa0a6] border-t border-[#3c4043] pt-2.5">
                              <div className="flex items-center space-x-1.5">
                                <Clock className="w-3.5 h-3.5 text-[#5f6368]" />
                                <span>
                                  {start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                  {" – "}
                                  {end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                </span>
                                <span>({dur}m)</span>
                              </div>
                              <div className="flex items-center space-x-1.5">
                                <User className="w-3.5 h-3.5 text-[#5f6368]" />
                                <span>Host: {meeting.host_name || "Faculty"}</span>
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 pt-2.5 border-t border-[#3c4043] flex items-center justify-between">
                            <span className="text-xs text-[#9aa0a6]">
                              {meeting.participants_count} attendees
                            </span>
                            <Link
                              href={`/meetings/${meeting.id}`}
                              className="inline-flex items-center space-x-1 text-xs font-semibold text-[#8ab4f8] hover:text-white transition"
                            >
                              <span>View Summary</span>
                              <ArrowRight className="w-3 h-3" />
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          /* LIVE / SCHEDULED MEETINGS GRID */
          displayedMeetings.length === 0 ? (
            <div className="bg-[#292a2d] border border-[#3c4043] rounded-3xl p-12 text-center space-y-3">
              <Video className="w-12 h-12 text-[#5f6368] mx-auto" />
              <h3 className="text-base font-semibold text-[#e8eaed]">
                {activeTab === "LIVE"
                  ? "No live meetings right now"
                  : "No upcoming scheduled meetings"}
              </h3>
              <p className="text-xs text-[#9aa0a6] max-w-sm mx-auto">
                {activeTab === "LIVE"
                  ? "When a class starts or a host goes live, you will see it here to join instantly."
                  : isTeacherOrAdmin
                  ? "Use the Schedule Class button to schedule a class for your students."
                  : "Check back later for newly scheduled classroom sessions."}
              </p>
              {isTeacherOrAdmin && activeTab === "SCHEDULED" && (
                <div className="pt-2">
                  <Link
                    href="/meetings/schedule"
                    className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-full text-xs font-semibold bg-[#1a73e8] hover:bg-[#1557b0] text-white shadow-md transition"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Schedule Class</span>
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {displayedMeetings.map((meeting) => {
                const isLive = meeting.status === "LIVE";
                const start = new Date(meeting.starts_at);
                const end = new Date(meeting.ends_at);

                return (
                  <div
                    key={meeting.id}
                    className="bg-[#292a2d] border border-[#3c4043] hover:border-[#5f6368] rounded-2xl p-5 shadow-sm transition flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            isLive
                              ? "bg-[#137333]/40 text-[#81c995] border border-[#34a853]/60"
                              : "bg-[#1a73e8]/20 text-[#8ab4f8] border border-[#1a73e8]/40"
                          }`}
                        >
                          {isLive && (
                            <span className="w-2 h-2 rounded-full bg-[#81c995] animate-pulse mr-1.5" />
                          )}
                          {isLive ? "LIVE NOW" : meeting.status}
                        </span>
                        <span className="text-[11px] font-medium text-[#9aa0a6]">
                          {meeting.meeting_type === "CLASS" ? "Classroom" : "Meeting"}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-[#e8eaed] line-clamp-1">
                        {meeting.title}
                      </h3>
                      {meeting.description && (
                        <p className="text-xs text-[#9aa0a6] mt-1.5 line-clamp-2">
                          {meeting.description}
                        </p>
                      )}

                      <div className="mt-4 space-y-1.5 text-xs text-[#9aa0a6] border-t border-[#3c4043] pt-3">
                        <div className="flex items-center space-x-2">
                          <Calendar className="w-3.5 h-3.5 text-[#5f6368]" />
                          <span>
                            {start.toLocaleDateString([], {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Clock className="w-3.5 h-3.5 text-[#5f6368]" />
                          <span>
                            {start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            {" – "}
                            {end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <User className="w-3.5 h-3.5 text-[#5f6368]" />
                          <span>Host: {meeting.host_name || "Faculty Member"}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 pt-3 border-t border-[#3c4043] flex items-center justify-between">
                      <span className="text-xs text-[#9aa0a6]">
                        {meeting.participants_count} enrolled
                      </span>

                      {/* Join Action: Available to ALL (students, parents, teachers, admins) */}
                      <Link
                        href={`/meetings/${meeting.id}`}
                        className={`inline-flex items-center space-x-1.5 px-4 py-2 rounded-full text-xs font-semibold transition ${
                          isLive
                            ? "bg-[#34a853] hover:bg-[#2d9249] text-white shadow-md shadow-[#34a853]/30"
                            : "bg-[#1a73e8] hover:bg-[#1557b0] text-white shadow-md shadow-[#1a73e8]/30"
                        }`}
                      >
                        <span>{isLive ? "Join Now" : "Enter Lobby"}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>
    </div>
  );
}
