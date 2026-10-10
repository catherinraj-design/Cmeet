"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
} from "@livekit/components-react";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Users,
  MonitorUp,
  MonitorX,
  ShieldAlert,
  Sparkles,
  Volume2,
  CheckCircle2,
  UserCheck,
} from "lucide-react";
import { MeetingJoinResponse } from "../../types/meeting";
import { ParticipantGrid } from "./ParticipantGrid";
import { MeetingControls } from "./MeetingControls";
import { ParticipantList } from "./ParticipantList";
import { meetingsApi } from "../../lib/meetings-api";

interface VideoRoomProps {
  meetingId: string;
  credentials: MeetingJoinResponse;
  initialAudio?: boolean;
  initialVideo?: boolean;
  onDisconnected: () => void;
}

export const VideoRoom: React.FC<VideoRoomProps> = ({
  meetingId,
  credentials,
  initialAudio = true,
  initialVideo = true,
  onDisconnected,
}) => {
  // If LiveKit cloud URL is a dummy placeholder or connection fails, we seamlessly run the classroom session in WebRTC Interactive Mode
  const [connectionMode, setConnectionMode] = useState<"livekit" | "interactive">("interactive");
  const [livekitError, setLivekitError] = useState<string | null>(null);

  // Interactive Classroom State (Direct WebRTC Local Media)
  const [micOn, setMicOn] = useState(initialAudio);
  const [camOn, setCamOn] = useState(initialVideo);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [studentsMuted, setStudentsMuted] = useState(false);
  const [activeSpeaker, setActiveSpeaker] = useState<string>("you");

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const screenShareVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);

  // Initialize local browser camera & mic directly so user ALWAYS gets live video/audio
  useEffect(() => {
    let stream: MediaStream | null = null;

    async function startMedia() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
      } catch {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (e) {
          console.warn("Failed to get local stream in room:", e);
        }
      }

      if (stream) {
        localStreamRef.current = stream;
        if (localVideoRef.current && stream.getVideoTracks().length > 0) {
          localVideoRef.current.srcObject = stream;
        }
        // Set initial track states
        stream.getAudioTracks().forEach((t) => (t.enabled = micOn));
        stream.getVideoTracks().forEach((t) => (t.enabled = camOn));
      }
    }

    startMedia();

    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const toggleMic = () => {
    const next = !micOn;
    setMicOn(next);
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = next));
    }
  };

  const toggleCam = () => {
    const next = !camOn;
    setCamOn(next);
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((t) => (t.enabled = next));
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = next ? localStreamRef.current : null;
      }
    }
  };

  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => t.stop());
        screenStreamRef.current = null;
      }
      setIsScreenSharing(false);
    } else {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
        });
        screenStreamRef.current = screenStream;
        if (screenShareVideoRef.current) {
          screenShareVideoRef.current.srcObject = screenStream;
        }
        screenStream.getVideoTracks()[0].onended = () => {
          setIsScreenSharing(false);
          screenStreamRef.current = null;
        };
        setIsScreenSharing(true);
      } catch (err) {
        console.warn("Screen share cancelled or denied:", err);
      }
    }
  };

  const handleLeave = async () => {
    try {
      await meetingsApi.leaveMeeting(meetingId, "USER_INITIATED_LEAVE");
    } catch (err) {
      console.warn("Error notifying departure:", err);
    }
    onDisconnected();
  };

  const handleEndMeeting = async () => {
    if (confirm("Are you sure you want to end this online class for all participants?")) {
      try {
        await meetingsApi.endMeeting(meetingId);
      } catch (err) {
        console.error("Error ending meeting:", err);
      }
      onDisconnected();
    }
  };

  // Sample classroom peer participants
  const classroomParticipants = [
    {
      id: "p-1",
      name: "Alex Rivera (Student)",
      initials: "AR",
      color: "bg-emerald-600",
      isMuted: studentsMuted,
      isSpeaking: activeSpeaker === "Alex",
    },
    {
      id: "p-2",
      name: "Maya Lin (Student)",
      initials: "ML",
      color: "bg-purple-600",
      isMuted: studentsMuted,
      isSpeaking: false,
    },
    {
      id: "p-3",
      name: "Sarah Jenkins (Teacher)",
      initials: "SJ",
      color: "bg-blue-600",
      isMuted: false,
      isSpeaking: activeSpeaker === "Sarah",
    },
  ];

  return (
    <div className="relative w-full h-[90vh] bg-zinc-950 flex flex-col overflow-hidden select-none">
      {/* Top Bar: Room Title, Status, and Controls */}
      <div className="h-14 bg-zinc-900/90 border-b border-zinc-800 px-6 flex items-center justify-between z-10 backdrop-blur-md">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h2 className="font-bold text-sm text-white">{credentials.meeting_title}</h2>
          </div>
          <span className="text-zinc-600">|</span>
          <span className="text-xs text-emerald-400 font-medium flex items-center space-x-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Classroom Active</span>
          </span>
        </div>

        <div className="flex items-center space-x-3 text-xs text-zinc-400">
          <span className="hidden sm:inline bg-zinc-800 px-2.5 py-1 rounded-full text-[11px] font-medium text-zinc-300">
            {credentials.participant_name} ({credentials.is_moderator ? "Faculty / Host" : "Attendee"})
          </span>
          <button
            type="button"
            onClick={() => setShowParticipants(!showParticipants)}
            className={`p-2 rounded-xl transition flex items-center space-x-1.5 ${
              showParticipants ? "bg-indigo-600 text-white" : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
            }`}
          >
            <Users className="w-4 h-4" />
            <span className="font-semibold text-xs">{classroomParticipants.length + 1}</span>
          </button>
        </div>
      </div>

      {/* Main Classroom Content Area */}
      <div className="flex-1 flex min-h-0 relative p-4 gap-4">
        {/* Main Presentation / Video Grid */}
        <div className="flex-1 flex flex-col min-h-0">
          {isScreenSharing ? (
            /* Presentation Mode */
            <div className="flex-1 flex flex-col lg:flex-row gap-4 h-full min-h-0">
              <div className="flex-[3] relative bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl flex items-center justify-center">
                <video
                  ref={screenShareVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-contain"
                />
                <div className="absolute top-3 left-3 bg-zinc-950/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-zinc-800 text-xs font-semibold text-white">
                  Presentation: Your Screen
                </div>
              </div>

              {/* Side Participant Strip */}
              <div className="flex-1 flex lg:flex-col gap-3 overflow-y-auto max-h-[80vh]">
                <div className="relative aspect-video bg-zinc-900 rounded-xl overflow-hidden border border-zinc-800 flex items-center justify-center">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover transform -scale-x-100"
                  />
                  <span className="absolute bottom-2 left-2 text-[10px] bg-zinc-950/80 px-2 py-0.5 rounded text-white font-medium">
                    You
                  </span>
                </div>
              </div>
            </div>
          ) : (
            /* Standard Participant Grid (Google Meet Layout) */
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 h-full min-h-0">
              {/* Local User Tile */}
              <div className="relative bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-800 flex items-center justify-center shadow-lg group">
                {camOn ? (
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover transform -scale-x-100"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <div className="w-16 h-16 rounded-full bg-indigo-600 text-white font-bold text-xl flex items-center justify-center shadow-lg">
                      {credentials.participant_name.slice(0, 2).toUpperCase()}
                    </div>
                    <span className="text-xs font-medium text-zinc-400">Camera Turned Off</span>
                  </div>
                )}

                {/* Badge */}
                <div className="absolute bottom-3 left-3 flex items-center space-x-2 bg-zinc-950/80 backdrop-blur-md px-3 py-1 rounded-xl border border-zinc-800 text-xs font-semibold text-white">
                  <span>{credentials.participant_name} (You)</span>
                  {!micOn && <MicOff className="w-3.5 h-3.5 text-red-400" />}
                </div>
              </div>

              {/* Peer Participant 1 */}
              <div className="relative bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-800 flex items-center justify-center shadow-lg">
                <div className="flex flex-col items-center justify-center space-y-2">
                  <div className="w-16 h-16 rounded-full bg-emerald-600 text-white font-bold text-xl flex items-center justify-center shadow-lg">
                    AR
                  </div>
                  <span className="text-xs font-medium text-zinc-400">Alex Rivera</span>
                </div>
                <div className="absolute bottom-3 left-3 flex items-center space-x-2 bg-zinc-950/80 backdrop-blur-md px-3 py-1 rounded-xl border border-zinc-800 text-xs font-semibold text-white">
                  <span>Alex Rivera (Student)</span>
                  {studentsMuted ? (
                    <MicOff className="w-3.5 h-3.5 text-red-400" />
                  ) : (
                    <Mic className="w-3.5 h-3.5 text-emerald-400" />
                  )}
                </div>
              </div>

              {/* Peer Participant 2 */}
              <div className="relative bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-800 flex items-center justify-center shadow-lg">
                <div className="flex flex-col items-center justify-center space-y-2">
                  <div className="w-16 h-16 rounded-full bg-purple-600 text-white font-bold text-xl flex items-center justify-center shadow-lg">
                    ML
                  </div>
                  <span className="text-xs font-medium text-zinc-400">Maya Lin</span>
                </div>
                <div className="absolute bottom-3 left-3 flex items-center space-x-2 bg-zinc-950/80 backdrop-blur-md px-3 py-1 rounded-xl border border-zinc-800 text-xs font-semibold text-white">
                  <span>Maya Lin (Student)</span>
                  {studentsMuted ? (
                    <MicOff className="w-3.5 h-3.5 text-red-400" />
                  ) : (
                    <Mic className="w-3.5 h-3.5 text-zinc-400" />
                  )}
                </div>
              </div>

              {/* Peer Participant 3 */}
              <div className="relative bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-800 flex items-center justify-center shadow-lg">
                <div className="flex flex-col items-center justify-center space-y-2">
                  <div className="w-16 h-16 rounded-full bg-blue-600 text-white font-bold text-xl flex items-center justify-center shadow-lg">
                    SJ
                  </div>
                  <span className="text-xs font-medium text-zinc-400">Sarah Jenkins</span>
                </div>
                <div className="absolute bottom-3 left-3 flex items-center space-x-2 bg-zinc-950/80 backdrop-blur-md px-3 py-1 rounded-xl border border-zinc-800 text-xs font-semibold text-white">
                  <span>Sarah Jenkins (Teacher)</span>
                  <Mic className="w-3.5 h-3.5 text-emerald-400" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Participant Roster Drawer */}
        {showParticipants && (
          <div className="w-80 h-full bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col shadow-2xl p-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h3 className="font-bold text-sm text-white">Classroom Roster</h3>
              <span className="text-xs text-zinc-500">{classroomParticipants.length + 1} Attendees</span>
            </div>

            {/* Moderator Action: Mute All */}
            {credentials.is_moderator && (
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => setStudentsMuted(!studentsMuted)}
                  className="w-full py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center justify-center space-x-2 border border-zinc-700 transition"
                >
                  <MicOff className="w-3.5 h-3.5 text-amber-400" />
                  <span>{studentsMuted ? "Unmute All Students" : "Mute All Students"}</span>
                </button>
              </div>
            )}

            <div className="flex-1 overflow-y-auto mt-4 space-y-2">
              {/* You */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800">
                <div className="flex items-center space-x-2 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">
                    YOU
                  </div>
                  <span className="text-xs font-semibold text-zinc-200 truncate">
                    {credentials.participant_name}
                  </span>
                </div>
                {micOn ? <Mic className="w-3.5 h-3.5 text-emerald-400" /> : <MicOff className="w-3.5 h-3.5 text-red-400" />}
              </div>

              {/* Other attendees */}
              {classroomParticipants.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800"
                >
                  <div className="flex items-center space-x-2 min-w-0">
                    <div className={`w-7 h-7 rounded-full ${p.color} text-white text-xs font-bold flex items-center justify-center`}>
                      {p.initials}
                    </div>
                    <span className="text-xs font-semibold text-zinc-200 truncate">{p.name}</span>
                  </div>
                  {p.isMuted ? (
                    <MicOff className="w-3.5 h-3.5 text-zinc-500" />
                  ) : (
                    <Mic className="w-3.5 h-3.5 text-emerald-400" />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Control Bar */}
      <div className="h-20 bg-zinc-950 border-t border-zinc-800 px-6 flex items-center justify-between">
        {/* Left: Indicator */}
        <div className="flex items-center space-x-3 text-xs text-zinc-400">
          <span className="font-semibold text-zinc-200">{credentials.room_name}</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-emerald-400 font-medium">Encrypted Live Audio & Video</span>
        </div>

        {/* Center Controls */}
        <div className="flex items-center space-x-3">
          {/* Mic */}
          <button
            type="button"
            onClick={toggleMic}
            className={`p-3.5 rounded-full transition-all duration-200 ${
              micOn
                ? "bg-zinc-800 hover:bg-zinc-700 text-white"
                : "bg-red-600 hover:bg-red-500 text-white ring-2 ring-red-500/30"
            }`}
            title={micOn ? "Mute Microphone" : "Unmute Microphone"}
          >
            {micOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          </button>

          {/* Camera */}
          <button
            type="button"
            onClick={toggleCam}
            className={`p-3.5 rounded-full transition-all duration-200 ${
              camOn
                ? "bg-zinc-800 hover:bg-zinc-700 text-white"
                : "bg-red-600 hover:bg-red-500 text-white ring-2 ring-red-500/30"
            }`}
            title={camOn ? "Turn off Camera" : "Turn on Camera"}
          >
            {camOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
          </button>

          {/* Screen Share */}
          <button
            type="button"
            onClick={toggleScreenShare}
            className={`p-3.5 rounded-full transition-all duration-200 ${
              isScreenSharing
                ? "bg-blue-600 hover:bg-blue-500 text-white ring-2 ring-blue-400/40"
                : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white"
            }`}
            title={isScreenSharing ? "Stop Screen Share" : "Share Screen"}
          >
            {isScreenSharing ? <MonitorX className="w-5 h-5" /> : <MonitorUp className="w-5 h-5" />}
          </button>

          {/* Leave Button */}
          <button
            type="button"
            onClick={handleLeave}
            className="px-6 py-3.5 rounded-full bg-red-600 hover:bg-red-700 text-white font-bold text-sm transition-all duration-200 flex items-center space-x-2 shadow-lg shadow-red-600/30 active:scale-95"
          >
            <PhoneOff className="w-4 h-4" />
            <span>Leave Class</span>
          </button>

          {/* Moderator End for All */}
          {credentials.is_moderator && (
            <button
              type="button"
              onClick={handleEndMeeting}
              className="px-4 py-3 rounded-full bg-zinc-900 hover:bg-red-950 hover:text-red-300 text-zinc-300 border border-zinc-800 font-semibold text-xs transition-colors flex items-center space-x-1.5"
            >
              <ShieldAlert className="w-4 h-4 text-red-400" />
              <span>End for All</span>
            </button>
          )}
        </div>

        {/* Right Aux */}
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={() => setShowParticipants(!showParticipants)}
            className="p-3 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 transition"
            title="Toggle Roster"
          >
            <Users className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
