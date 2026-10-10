"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  CheckCircle2,
  AlertCircle,
  Volume2,
  RefreshCw,
  Sparkles,
} from "lucide-react";
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

  // Permission states
  const [hasMicPermission, setHasMicPermission] = useState<boolean | null>(null);
  const [hasCamPermission, setHasCamPermission] = useState<boolean | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  // Device lists
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudioId, setSelectedAudioId] = useState<string>("");
  const [selectedVideoId, setSelectedVideoId] = useState<string>("");

  // Audio level visualizer
  const [audioLevel, setAudioLevel] = useState<number>(0);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const stopCurrentStream = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close().catch(() => {});
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const setupAudioMeter = (stream: MediaStream) => {
    const audioTrack = stream.getAudioTracks()[0];
    if (!audioTrack) return;

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      audioContextRef.current = ctx;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      const source = ctx.createMediaStreamSource(new MediaStream([audioTrack]));
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateMeter = () => {
        if (!audioTrack.enabled) {
          setAudioLevel(0);
          animationFrameRef.current = requestAnimationFrame(updateMeter);
          return;
        }

        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        // Normalize 0 to 100
        setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));

        animationFrameRef.current = requestAnimationFrame(updateMeter);
      };

      updateMeter();
    } catch (err) {
      console.warn("Audio meter setup error:", err);
    }
  };

  const requestPermissions = async (audioId?: string, videoId?: string) => {
    stopCurrentStream();
    setPermissionError(null);

    let stream: MediaStream | null = null;
    let micGranted = false;
    let camGranted = false;

    // 1. Try requesting BOTH video and audio
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: audioId ? { deviceId: { exact: audioId } } : true,
        video: videoId ? { deviceId: { exact: videoId } } : true,
      });
      micGranted = true;
      camGranted = true;
    } catch (bothErr: any) {
      console.warn("Combined video+audio request failed, trying audio-only fallback:", bothErr);

      // 2. Fallback: Request AUDIO ONLY (guarantees microphone prompt is asked even if no camera exists)
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: audioId ? { deviceId: { exact: audioId } } : true,
        });
        micGranted = true;
        camGranted = false;
        setPermissionError("Camera unavailable or blocked, but microphone was enabled.");
      } catch (audioErr: any) {
        console.warn("Audio-only request also failed:", audioErr);

        // 3. Last attempt: Request VIDEO ONLY
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: videoId ? { deviceId: { exact: videoId } } : true,
          });
          camGranted = true;
          micGranted = false;
          setPermissionError("Microphone permission was not granted.");
        } catch (videoErr: any) {
          micGranted = false;
          camGranted = false;
          setPermissionError(
            "Camera and microphone permissions were denied. Please allow them in your browser settings (lock icon in address bar)."
          );
        }
      }
    }

    setHasMicPermission(micGranted);
    setHasCamPermission(camGranted);

    if (stream) {
      streamRef.current = stream;
      if (videoRef.current && camGranted) {
        videoRef.current.srcObject = stream;
      }
      if (micGranted) {
        setupAudioMeter(stream);
      }

      // Enumerate devices for selector
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audios = devices.filter((d) => d.kind === "audioinput");
        const videos = devices.filter((d) => d.kind === "videoinput");
        setAudioDevices(audios);
        setVideoDevices(videos);
        if (!selectedAudioId && audios[0]) setSelectedAudioId(audios[0].deviceId);
        if (!selectedVideoId && videos[0]) setSelectedVideoId(videos[0].deviceId);
      } catch (e) {
        console.warn("enumerateDevices failed:", e);
      }
    }
  };

  useEffect(() => {
    requestPermissions();

    return () => {
      stopCurrentStream();
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
    <div className="flex flex-col items-center justify-center min-h-[85vh] p-4 sm:p-6">
      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-8 bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
        {/* Left: Video Preview, Mic Meter, & Controls */}
        <div className="flex flex-col items-center justify-between space-y-4">
          <div className="relative w-full aspect-video bg-zinc-950 rounded-2xl overflow-hidden border border-zinc-800 flex items-center justify-center shadow-inner group">
            {videoEnabled && hasCamPermission ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover transform -scale-x-100"
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-zinc-500 space-y-2 p-4 text-center">
                <VideoOff className="w-12 h-12 text-zinc-600" />
                <span className="text-sm font-medium text-zinc-400">
                  {hasCamPermission === false
                    ? "Camera permission not granted"
                    : "Camera is turned off"}
                </span>
                <span className="text-xs text-zinc-500 max-w-xs">
                  You can still join the class with audio and microphone only.
                </span>
              </div>
            )}

            {/* Quick Toggle Controls Overlay */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center space-x-3 bg-zinc-950/80 backdrop-blur-md px-4 py-2 rounded-full border border-zinc-800 shadow-xl">
              <button
                type="button"
                onClick={toggleAudio}
                className={`p-3 rounded-full transition-all duration-200 ${
                  audioEnabled
                    ? "bg-zinc-800 hover:bg-zinc-700 text-emerald-400"
                    : "bg-red-600 hover:bg-red-500 text-white"
                }`}
                title={audioEnabled ? "Mute Microphone" : "Unmute Microphone"}
              >
                {audioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
              </button>
              <button
                type="button"
                onClick={toggleVideo}
                className={`p-3 rounded-full transition-all duration-200 ${
                  videoEnabled && hasCamPermission
                    ? "bg-zinc-800 hover:bg-zinc-700 text-indigo-400"
                    : "bg-red-600 hover:bg-red-500 text-white"
                }`}
                title={videoEnabled ? "Turn off Camera" : "Turn on Camera"}
              >
                {videoEnabled && hasCamPermission ? (
                  <Video className="w-5 h-5" />
                ) : (
                  <VideoOff className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {/* Live Microphone Volume Meter */}
          <div className="w-full bg-zinc-950/70 border border-zinc-800/80 rounded-xl p-3 flex flex-col space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center space-x-1.5 text-zinc-400 font-medium">
                <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
                <span>Microphone Input</span>
              </span>
              <span className={`text-[11px] font-semibold ${
                hasMicPermission ? (audioEnabled ? "text-emerald-400" : "text-amber-400") : "text-red-400"
              }`}>
                {hasMicPermission
                  ? audioEnabled
                    ? "Live & Ready"
                    : "Muted"
                  : "Permission Required"}
              </span>
            </div>

            {/* Visualizer Bar */}
            <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-indigo-500 transition-all duration-75"
                style={{ width: `${hasMicPermission && audioEnabled ? Math.max(5, audioLevel) : 0}%` }}
              />
            </div>
          </div>

          {/* Device Selection & Permission Trigger Button */}
          {(!hasMicPermission || !hasCamPermission) && (
            <button
              type="button"
              onClick={() => requestPermissions(selectedAudioId, selectedVideoId)}
              className="w-full py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-xs font-semibold flex items-center justify-center space-x-2 transition"
            >
              <RefreshCw className="w-3.5 h-3.5 text-indigo-400" />
              <span>Allow / Re-request Microphone & Camera</span>
            </button>
          )}

          {permissionError && (
            <div className="w-full p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-400" />
              <span className="leading-tight">{permissionError}</span>
            </div>
          )}
        </div>

        {/* Right: Meeting Info & Join Action */}
        <div className="flex flex-col justify-between space-y-6">
          <div>
            <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mb-3">
              <Sparkles className="w-3.5 h-3.5 mr-1" />
              <span>{meeting.meeting_type === "CLASS" ? "Live Online Class" : "School Meeting"}</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight leading-tight">
              {meeting.title}
            </h1>

            {meeting.description && (
              <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
                {meeting.description}
              </p>
            )}

            <div className="mt-6 space-y-3 text-sm text-zinc-300 bg-zinc-950/50 p-4 rounded-2xl border border-zinc-800/80">
              <div className="flex items-center justify-between">
                <span className="text-zinc-500 font-medium">Faculty Host:</span>
                <span className="font-semibold text-white">{meeting.host_name || "Faculty"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500 font-medium">Session Status:</span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  ● {meeting.status}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500 font-medium">Eligible Attendees:</span>
                <span className="text-zinc-300">
                  {meeting.participants_count || meeting.participants?.length || 1} Participants
                </span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-800/80 space-y-3">
            <button
              type="button"
              disabled={isLoading}
              onClick={() => onJoin({ audioEnabled, videoEnabled: videoEnabled && Boolean(hasCamPermission) })}
              className="w-full py-4 px-6 rounded-2xl font-bold text-white bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-indigo-600/30 flex items-center justify-center space-x-2 text-base"
            >
              {isLoading ? (
                <span>Entering Classroom...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Join Classroom Now</span>
                </>
              )}
            </button>
            <p className="text-center text-xs text-zinc-500">
              Microphone is {audioEnabled ? "ON" : "MUTED"} • Camera is {videoEnabled && hasCamPermission ? "ON" : "OFF"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
