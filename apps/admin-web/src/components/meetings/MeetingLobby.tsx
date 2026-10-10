"use client";

import React, { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Video, VideoOff, Settings, CheckCircle2, AlertCircle } from "lucide-react";
import { MeetingDetail } from "../../types/meeting";

interface MeetingLobbyProps {
  meeting: MeetingDetail;
  onJoin: (options: { audioEnabled: boolean; videoEnabled: boolean }) => void;
  isLoading?: boolean;
}

export const MeetingLobby: React.FC<MeetingLobbyProps> = ({
  meeting,
  onJoin,
  isLoading = false,
}) => {
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    let localStream: MediaStream | null = null;

    async function initMedia() {
      try {
        localStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        streamRef.current = localStream;
        if (videoRef.current) {
          videoRef.current.srcObject = localStream;
        }
        setHasPermission(true);
      } catch (err: any) {
        console.warn("Device permission error:", err);
        setHasPermission(false);
        setPermissionError("Camera and microphone permissions were denied or unavailable.");
      }
    }

    initMedia();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const toggleAudio = () => {
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !audioEnabled;
      });
    }
    setAudioEnabled(!audioEnabled);
  };

  const toggleVideo = () => {
    if (streamRef.current) {
      streamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = !videoEnabled;
      });
    }
    setVideoEnabled(!videoEnabled);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[85vh] p-6">
      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-8 bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl">
        {/* Left: Video Preview & Controls */}
        <div className="flex flex-col items-center justify-center">
          <div className="relative w-full aspect-video bg-zinc-950 rounded-xl overflow-hidden border border-zinc-800 flex items-center justify-center shadow-inner">
            {videoEnabled && hasPermission ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover transform -scale-x-100"
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-zinc-500 space-y-2">
                <VideoOff className="w-12 h-12" />
                <span className="text-sm font-medium">Camera is turned off</span>
              </div>
            )}

            {/* Quick Overlays */}
            <div className="absolute bottom-4 flex items-center space-x-3">
              <button
                type="button"
                onClick={toggleAudio}
                className={`p-3 rounded-full transition-colors ${
                  audioEnabled
                    ? "bg-zinc-800 hover:bg-zinc-700 text-white"
                    : "bg-red-600 hover:bg-red-500 text-white"
                }`}
                title={audioEnabled ? "Mute Microphone" : "Unmute Microphone"}
              >
                {audioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
              </button>
              <button
                type="button"
                onClick={toggleVideo}
                className={`p-3 rounded-full transition-colors ${
                  videoEnabled
                    ? "bg-zinc-800 hover:bg-zinc-700 text-white"
                    : "bg-red-600 hover:bg-red-500 text-white"
                }`}
                title={videoEnabled ? "Turn off Camera" : "Turn on Camera"}
              >
                {videoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {permissionError && (
            <div className="mt-3 flex items-center text-amber-400 text-xs space-x-1.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{permissionError}</span>
            </div>
          )}
        </div>

        {/* Right: Meeting Info & Join */}
        <div className="flex flex-col justify-between space-y-6">
          <div>
            <div className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mb-3">
              {meeting.meeting_type === "CLASS" ? "Online Class" : "School Meeting"}
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">{meeting.title}</h1>
            {meeting.description && (
              <p className="mt-2 text-sm text-zinc-400 leading-relaxed">{meeting.description}</p>
            )}

            <div className="mt-6 space-y-2.5 text-sm text-zinc-300">
              <div className="flex items-center space-x-2">
                <span className="text-zinc-500 font-medium">Host:</span>
                <span className="font-semibold text-zinc-200">{meeting.host_name || "School Faculty"}</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-zinc-500 font-medium">Status:</span>
                <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                  {meeting.status}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-zinc-500 font-medium">Participants:</span>
                <span>{meeting.participants_count || meeting.participants?.length || 1} eligible attendees</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-800/80">
            <button
              type="button"
              disabled={isLoading}
              onClick={() => onJoin({ audioEnabled, videoEnabled })}
              className="w-full py-3.5 px-6 rounded-xl font-semibold text-white bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-600/30 flex items-center justify-center space-x-2"
            >
              {isLoading ? (
                <span>Connecting to room...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Join Classroom</span>
                </>
              )}
            </button>
            <p className="mt-2 text-center text-xs text-zinc-500">
              Your audio/video settings will be preserved when entering.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
