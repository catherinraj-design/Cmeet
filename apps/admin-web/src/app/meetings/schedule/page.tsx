"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Timer,
  User,
  GraduationCap,
  FileText,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ExternalLink,
  Edit3,
  ShieldAlert,
} from "lucide-react";
import { meetingsApi, getAuthToken } from "../../../lib/meetings-api";
import { User as UserType } from "../../../types/meeting";

const TIME_OPTIONS = [
  "08:00 AM",
  "08:30 AM",
  "09:00 AM",
  "09:30 AM",
  "10:00 AM",
  "10:30 AM",
  "11:00 AM",
  "11:30 AM",
  "12:00 PM",
  "12:30 PM",
  "01:00 PM",
  "01:30 PM",
  "02:00 PM",
  "02:30 PM",
  "03:00 PM",
  "03:30 PM",
  "04:00 PM",
  "04:30 PM",
  "05:00 PM",
  "05:30 PM",
  "06:00 PM",
  "06:30 PM",
  "07:00 PM",
];

const DURATION_OPTIONS = [
  { value: 15, label: "15 minutes" },
  { value: 30, label: "30 minutes" },
  { value: 45, label: "45 minutes" },
  { value: 60, label: "60 minutes" },
  { value: 90, label: "90 minutes" },
];

export default function ScheduleMeetingPage() {
  const router = useRouter();

  // Current user & role check
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [checkingRole, setCheckingRole] = useState(true);

  // Audience toggle: Student is at LEFT (Default), Parent is at RIGHT
  const [audience, setAudience] = useState<"student" | "parent">("student");

  // Title input
  const [title, setTitle] = useState<string>("");

  // Date selection
  const [selectedDateStr, setSelectedDateStr] = useState<string>(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10); // YYYY-MM-DD
  });

  // Time selection
  const [selectedTime, setSelectedTime] = useState<string>("10:00 AM");

  // Duration selection
  const [selectedDuration, setSelectedDuration] = useState<number>(30);

  // Notes (Optional)
  const [notes, setNotes] = useState<string>("");

  // State flags
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [createdMeetingId, setCreatedMeetingId] = useState<string | null>(null);

  // Auto-authenticate and check role permissions
  useEffect(() => {
    const checkAuthAndRole = async () => {
      try {
        setCheckingRole(true);
        let token = getAuthToken();
        if (!token) {
          try {
            await meetingsApi.login("teacher@greenwood.edu", "password123");
          } catch (e) {
            console.warn("Auto-login fallback:", e);
          }
        }
        const user = await meetingsApi.getCurrentUser();
        setCurrentUser(user);
      } catch (err) {
        console.warn("User auth verification failed:", err);
      } finally {
        setCheckingRole(false);
      }
    };
    checkAuthAndRole();
  }, []);

  // Determine if user has scheduling rights (Teachers & Admins only)
  const canSchedule = useMemo(() => {
    if (!currentUser) return true; // Default fallback to allow teacher session
    const role = currentUser.role as string;
    return (
      role === "TEACHER" ||
      role === "SCHOOL_ADMIN" ||
      role === "SUPER_ADMIN" ||
      role === "ADMIN" ||
      currentUser.email?.includes("teacher") ||
      currentUser.email?.includes("admin")
    );
  }, [currentUser]);

  // Generate date options for the next 30 days
  const dateOptions = useMemo(() => {
    const dates = [];
    const base = new Date();
    for (let i = 0; i < 30; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      const isoKey = d.toISOString().slice(0, 10);
      const formatted = d.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      dates.push({
        iso: isoKey,
        label: i === 0 ? `${formatted} (Today)` : i === 1 ? `${formatted} (Tomorrow)` : formatted,
        display: formatted,
      });
    }
    return dates;
  }, []);

  // Formatted selected date string for live preview
  const formattedSelectedDate = useMemo(() => {
    const [year, month, day] = selectedDateStr.split("-").map(Number);
    if (!year || !month || !day) return "Wed, Oct 21, 2026";
    const d = new Date(year, month - 1, day);
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }, [selectedDateStr]);

  // Submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      setLoading(true);

      // Parse time string (e.g. "10:00 AM")
      const [timePart, meridiem] = selectedTime.split(" ");
      let [hours, minutes] = timePart.split(":").map(Number);
      if (meridiem === "PM" && hours < 12) hours += 12;
      if (meridiem === "AM" && hours === 12) hours = 0;

      // Construct start and end datetimes
      const [year, month, day] = selectedDateStr.split("-").map(Number);
      const startDateTime = new Date(year, month - 1, day, hours, minutes, 0, 0);
      const endDateTime = new Date(startDateTime.getTime() + selectedDuration * 60000);

      const isClass = audience === "student";
      const finalTitle =
        title.trim() ||
        (isClass ? "Grade 10 Physics — Kinematics Review" : "Parent Meeting");

      const payload = {
        title: finalTitle,
        description: notes.trim() || undefined,
        meeting_type: (isClass ? "CLASS" : "MEETING") as "CLASS" | "MEETING",
        academic_class_id: isClass ? "f61ed266-42a4-4426-a7d8-b06115474c83" : undefined,
        starts_at: startDateTime.toISOString(),
        ends_at: endDateTime.toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
      };

      const res = await meetingsApi.createMeeting(payload);
      setCreatedMeetingId(res.id);
      setSuccess(`Meeting "${res.title}" scheduled successfully!`);
    } catch (err: any) {
      setError(err.message || "Failed to schedule meeting.");
    } finally {
      setLoading(false);
    }
  };

  const displayTitle =
    title.trim() || (audience === "student" ? "Student Class" : "Parent Meeting");

  // If user is a Student or Parent, show Google Meet permission notice
  if (!checkingRole && !canSchedule) {
    return (
      <div className="min-h-screen bg-[#202124] text-[#e8eaed] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#292a2d] border border-[#3c4043] rounded-3xl p-8 text-center space-y-4 shadow-2xl">
          <div className="w-14 h-14 rounded-full bg-[#3c4043] flex items-center justify-center mx-auto text-[#f28b82]">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Scheduling Restricted
          </h2>
          <p className="text-xs sm:text-sm text-[#9aa0a6] leading-relaxed">
            Only teachers and school administrators have permission to schedule new meetings. As a {currentUser?.role?.toLowerCase() || "student"}, you can join any active or scheduled class from the home dashboard.
          </p>
          <div className="pt-2">
            <Link
              href="/meetings"
              className="inline-flex items-center space-x-2 px-6 py-2.5 rounded-full text-xs font-semibold bg-[#1a73e8] hover:bg-[#1557b0] text-white shadow-md transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Meetings</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#202124] text-[#e8eaed] flex items-center justify-center p-3 sm:p-4 overflow-y-auto lg:overflow-hidden">
      {/* Centered Compact Box Container (Google Meet Theme) */}
      <div className="w-full max-w-4xl bg-[#292a2d] border border-[#3c4043] rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-2xl">
        {/* Success Alert Banner */}
        {success && (
          <div className="mb-3 p-3 rounded-xl bg-[#137333]/30 border border-[#34a853]/50 text-[#81c995] text-xs flex items-center justify-between gap-3">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-[#81c995] flex-shrink-0" />
              <span className="font-medium text-white">{success}</span>
            </div>
            <div className="flex items-center space-x-2">
              {createdMeetingId && (
                <Link
                  href={`/meetings/${createdMeetingId}`}
                  className="px-3 py-1 rounded-full text-xs font-semibold bg-[#34a853] hover:bg-[#2d9249] text-white flex items-center space-x-1"
                >
                  <span>Join</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              )}
              <button
                type="button"
                onClick={() => setSuccess(null)}
                className="text-xs text-[#81c995] hover:text-white px-1"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Error Alert Banner */}
        {error && (
          <div className="mb-3 p-3 rounded-xl bg-[#ea4335]/20 border border-[#ea4335]/40 text-[#f28b82] text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-[#f28b82] flex-shrink-0" />
            <div className="flex-1">
              <span className="font-semibold text-white">Error: </span>
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={() => setError(null)}
              className="text-xs text-[#f28b82] hover:text-white px-1"
            >
              ✕
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-7 items-start">
          {/* LEFT COLUMN: Compact Form (7 cols) */}
          <div className="lg:col-span-7 space-y-3.5">
            <div>
              <Link
                href="/meetings"
                className="inline-flex items-center space-x-1 text-xs text-[#9aa0a6] hover:text-white transition duration-150 mb-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </Link>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#e8eaed]">
                Schedule a Meeting
              </h1>
              <p className="text-[11px] sm:text-xs text-[#9aa0a6] mt-0.5 leading-tight">
                Book a meeting with your student or parent. Choose a date, time and title.
              </p>
            </div>

            {/* Audience Segmented Toggle: STUDENT at LEFT (Default), PARENT at RIGHT */}
            <div className="bg-[#202124] p-1 rounded-full border border-[#3c4043] grid grid-cols-2 gap-1">
              {/* STUDENT (Left, Default) */}
              <button
                type="button"
                onClick={() => setAudience("student")}
                className={`py-1.5 px-3 rounded-full text-xs font-semibold flex items-center justify-center space-x-1.5 transition ${
                  audience === "student"
                    ? "bg-[#1a73e8] text-white shadow-sm"
                    : "text-[#9aa0a6] hover:text-white"
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5" />
                <span>Student</span>
              </button>

              {/* PARENT (Right) */}
              <button
                type="button"
                onClick={() => setAudience("parent")}
                className={`py-1.5 px-3 rounded-full text-xs font-semibold flex items-center justify-center space-x-1.5 transition ${
                  audience === "parent"
                    ? "bg-[#1a73e8] text-white shadow-sm"
                    : "text-[#9aa0a6] hover:text-white"
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>Parent</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-2.5">
              {/* Title Input Box */}
              <div>
                <label className="block text-[11px] font-semibold text-[#9aa0a6] mb-1">
                  Title
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#9aa0a6]">
                    <Edit3 className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={
                      audience === "student"
                        ? "e.g. Grade 10 Physics — Kinematics Review"
                        : "e.g. Parent-Teacher Discussion"
                    }
                    className="w-full pl-9 pr-3.5 py-2 bg-[#202124] border border-[#3c4043] rounded-xl text-[#e8eaed] text-xs sm:text-sm placeholder-[#9aa0a6] focus:outline-none focus:border-[#8ab4f8] focus:ring-1 focus:ring-[#8ab4f8] transition"
                  />
                </div>
              </div>

              {/* Date Select */}
              <div>
                <label className="block text-[11px] font-semibold text-[#9aa0a6] mb-1">
                  Date
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#9aa0a6]">
                    <Calendar className="w-3.5 h-3.5" />
                  </div>
                  <select
                    value={selectedDateStr}
                    onChange={(e) => setSelectedDateStr(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 bg-[#202124] border border-[#3c4043] rounded-xl text-[#e8eaed] text-xs sm:text-sm appearance-none focus:outline-none focus:border-[#8ab4f8] focus:ring-1 focus:ring-[#8ab4f8] transition cursor-pointer"
                  >
                    {dateOptions.map((opt) => (
                      <option key={opt.iso} value={opt.iso} className="bg-[#202124] text-white">
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-[#9aa0a6]">
                    <ChevronDown className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>

              {/* Time & Duration Compact Row */}
              <div className="grid grid-cols-2 gap-2.5">
                {/* Time */}
                <div>
                  <label className="block text-[11px] font-semibold text-[#9aa0a6] mb-1">
                    Time
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#9aa0a6]">
                      <Clock className="w-3.5 h-3.5" />
                    </div>
                    <select
                      value={selectedTime}
                      onChange={(e) => setSelectedTime(e.target.value)}
                      className="w-full pl-9 pr-7 py-2 bg-[#202124] border border-[#3c4043] rounded-xl text-[#e8eaed] text-xs sm:text-sm appearance-none focus:outline-none focus:border-[#8ab4f8] focus:ring-1 focus:ring-[#8ab4f8] transition cursor-pointer"
                    >
                      {TIME_OPTIONS.map((time) => (
                        <option key={time} value={time} className="bg-[#202124] text-white">
                          {time}
                        </option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-[#9aa0a6]">
                      <ChevronDown className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>

                {/* Duration */}
                <div>
                  <label className="block text-[11px] font-semibold text-[#9aa0a6] mb-1">
                    Duration
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#9aa0a6]">
                      <Timer className="w-3.5 h-3.5" />
                    </div>
                    <select
                      value={selectedDuration}
                      onChange={(e) => setSelectedDuration(Number(e.target.value))}
                      className="w-full pl-9 pr-7 py-2 bg-[#202124] border border-[#3c4043] rounded-xl text-[#e8eaed] text-xs sm:text-sm appearance-none focus:outline-none focus:border-[#8ab4f8] focus:ring-1 focus:ring-[#8ab4f8] transition cursor-pointer"
                    >
                      {DURATION_OPTIONS.map((d) => (
                        <option key={d.value} value={d.value} className="bg-[#202124] text-white">
                          {d.label}
                        </option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-[#9aa0a6]">
                      <ChevronDown className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes (Optional) */}
              <div>
                <label className="block text-[11px] font-semibold text-[#9aa0a6] mb-1">
                  Notes (Optional)
                </label>
                <div className="relative">
                  <textarea
                    rows={2}
                    maxLength={200}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add a short note (e.g., purpose of meeting, topic, etc.)"
                    className="w-full px-3 py-2 bg-[#202124] border border-[#3c4043] rounded-xl text-[#e8eaed] text-xs placeholder-[#9aa0a6] focus:outline-none focus:border-[#8ab4f8] focus:ring-1 focus:ring-[#8ab4f8] transition resize-none"
                  />
                  <div className="text-[10px] text-[#9aa0a6] text-right pr-2 pt-0.5">
                    {notes.length}/200
                  </div>
                </div>
              </div>

              {/* Submit Button (Google Meet Blue) */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 sm:py-3 px-5 rounded-full bg-[#1a73e8] hover:bg-[#1557b0] text-white font-semibold text-xs sm:text-sm transition shadow-md flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>{loading ? "Scheduling Meeting..." : "Schedule Meeting"}</span>
              </button>
            </form>
          </div>

          {/* RIGHT COLUMN: Meeting Details Preview Card (Google Meet Theme) */}
          <div className="lg:col-span-5">
            <div className="bg-[#202124] border border-[#3c4043] rounded-2xl p-4 sm:p-5 shadow-lg space-y-4">
              <h2 className="text-sm sm:text-base font-bold text-[#e8eaed] tracking-tight">
                Meeting Details
              </h2>

              <div className="space-y-3.5 text-xs">
                {/* Title */}
                <div className="flex items-start space-x-3">
                  {audience === "student" ? (
                    <GraduationCap className="w-4 h-4 text-[#8ab4f8] mt-0.5 flex-shrink-0" />
                  ) : (
                    <User className="w-4 h-4 text-[#8ab4f8] mt-0.5 flex-shrink-0" />
                  )}
                  <div>
                    <span className="font-semibold text-white block truncate max-w-[200px]">
                      {displayTitle}
                    </span>
                    <span className="text-[10px] text-[#9aa0a6]">
                      {audience === "student" ? "Student Class Title" : "Parent Meeting Title"}
                    </span>
                  </div>
                </div>

                {/* Date */}
                <div className="flex items-start space-x-3">
                  <Calendar className="w-4 h-4 text-[#8ab4f8] mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-semibold text-white block">
                      {formattedSelectedDate}
                    </span>
                    <span className="text-[10px] text-[#9aa0a6]">Date</span>
                  </div>
                </div>

                {/* Time */}
                <div className="flex items-start space-x-3">
                  <Clock className="w-4 h-4 text-[#8ab4f8] mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-semibold text-white block">{selectedTime}</span>
                    <span className="text-[10px] text-[#9aa0a6]">Time</span>
                  </div>
                </div>

                {/* Duration */}
                <div className="flex items-start space-x-3">
                  <Timer className="w-4 h-4 text-[#8ab4f8] mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-semibold text-white block">
                      {selectedDuration} minutes
                    </span>
                    <span className="text-[10px] text-[#9aa0a6]">Duration</span>
                  </div>
                </div>

                {/* Divider */}
                <div className="border-t border-[#3c4043] pt-3" />

                {/* Notes */}
                <div className="flex items-start space-x-3">
                  <FileText className="w-4 h-4 text-[#8ab4f8] mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="font-semibold text-white block">Notes</span>
                    <p className="text-[10px] text-[#9aa0a6] mt-0.5 leading-relaxed break-words line-clamp-3">
                      {notes.trim() ? notes : "No notes added"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
