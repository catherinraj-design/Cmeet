"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, AlertCircle, ShieldCheck, CheckCircle2, Users, Clock } from "lucide-react";
import { meetingsApi } from "../../../lib/meetings-api";
import { MeetingDetail, MeetingJoinResponse, AttendanceSummary } from "../../../types/meeting";
import { MeetingLobby } from "../../../components/meetings/MeetingLobby";
import { VideoRoom } from "../../../components/meetings/VideoRoom";

export default function MeetingRoomPage() {
  const params = useParams();
  const router = useRouter();
  const meetingId = params.meetingId as string;

  const [meeting, setMeeting] = useState<MeetingDetail | null>(null);
  const [credentials, setCredentials] = useState<MeetingJoinResponse | null>(null);
  const [inRoom, setInRoom] = useState(false);
  const [initialAudio, setInitialAudio] = useState(true);
  const [initialVideo, setInitialVideo] = useState(true);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attendance, setAttendance] = useState<AttendanceSummary | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const data = await meetingsApi.getMeeting(meetingId);
        setMeeting(data);

        if (data.status === "ENDED") {
          const att = await meetingsApi.getAttendance(meetingId).catch(() => null);
          setAttendance(att);
        }
      } catch (err: any) {
        setError(err.message || "Failed to load classroom details.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [meetingId]);

  const handleJoin = async (options: { audioEnabled: boolean; videoEnabled: boolean }) => {
    try {
      setJoining(true);
      setError(null);
      setInitialAudio(options.audioEnabled);
      setInitialVideo(options.videoEnabled);

      const creds = await meetingsApi.joinMeeting(meetingId);
      setCredentials(creds);
      setInRoom(true);
    } catch (err: any) {
      setError(err.message || "Unable to join the room. Permission denied or class ended.");
    } finally {
      setJoining(false);
    }
  };

  const handleDisconnected = async () => {
    setInRoom(false);
    setCredentials(null);
    try {
      const refreshed = await meetingsApi.getMeeting(meetingId);
      setMeeting(refreshed);
      const att = await meetingsApi.getAttendance(meetingId).catch(() => null);
      setAttendance(att);
    } catch {
      // ignore
    }
  };

  if (loading) {
    return (
      <div className="h-[80vh] flex items-center justify-center text-zinc-400 text-sm">
        Loading classroom configuration...
      </div>
    );
  }

  if (error && !meeting) {
    return (
      <div className="max-w-xl mx-auto px-6 py-16 text-center">
        <div className="w-12 h-12 rounded-full bg-red-950/80 border border-red-800 text-red-400 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-white">Access Denied / Meeting Not Found</h2>
        <p className="mt-2 text-sm text-zinc-400 leading-relaxed">{error}</p>
        <Link
          href="/meetings"
          className="mt-6 inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Classrooms</span>
        </Link>
      </div>
    );
  }

  if (!meeting) return null;

  // If already ended, show attendance and summary view
  if (meeting.status === "ENDED" && !inRoom) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-10">
        <Link
          href="/meetings"
          className="inline-flex items-center space-x-1.5 text-xs text-zinc-400 hover:text-white transition mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Classrooms</span>
        </Link>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-xl">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-5">
            <div>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-zinc-800 text-zinc-400 border border-zinc-700">
                CLASS CONCLUDED
              </span>
              <h1 className="text-2xl font-bold text-white mt-2">{meeting.title}</h1>
              <p className="text-sm text-zinc-400 mt-1">Host: {meeting.host_name}</p>
            </div>
          </div>

          {/* Attendance Section */}
          <div className="mt-8">
            <h2 className="text-base font-semibold text-white flex items-center space-x-2 mb-4">
              <Users className="w-4 h-4 text-indigo-400" />
              <span>Verified Attendance Report</span>
            </h2>

            {attendance && attendance.records.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-950/60 text-zinc-400 border-b border-zinc-800">
                    <tr>
                      <th className="py-3 px-4">Participant</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4">Joined At</th>
                      <th className="py-3 px-4">Duration</th>
                      <th className="py-3 px-4">Departure</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {attendance.records.map((rec) => (
                      <tr key={rec.id} className="hover:bg-zinc-800/40 transition">
                        <td className="py-3 px-4 font-medium text-white">{rec.user_name}</td>
                        <td className="py-3 px-4 text-zinc-400">{rec.user_role}</td>
                        <td className="py-3 px-4 text-zinc-400">
                          {new Date(rec.joined_at).toLocaleTimeString()}
                        </td>
                        <td className="py-3 px-4 text-emerald-400 font-semibold">
                          {rec.duration_seconds
                            ? `${Math.floor(rec.duration_seconds / 60)}m ${rec.duration_seconds % 60}s`
                            : "In progress"}
                        </td>
                        <td className="py-3 px-4 text-zinc-500">
                          {rec.leave_reason || "Normal Exit"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-6 text-center text-zinc-500 text-xs bg-zinc-950 rounded-xl border border-zinc-800">
                No attendance intervals recorded for this session.
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Active in LiveKit room
  if (inRoom && credentials) {
    return (
      <VideoRoom
        meetingId={meetingId}
        credentials={credentials}
        initialAudio={initialAudio}
        initialVideo={initialVideo}
        onDisconnected={handleDisconnected}
      />
    );
  }

  // Pre-join Lobby
  return (
    <div className="relative">
      {error && (
        <div className="max-w-4xl mx-auto mt-4 px-6">
          <div className="p-4 rounded-xl bg-red-950/60 border border-red-900/60 text-red-300 text-sm flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        </div>
      )}
      <MeetingLobby
        meeting={meeting}
        onJoin={handleJoin}
        isLoading={joining}
      />
    </div>
  );
}
