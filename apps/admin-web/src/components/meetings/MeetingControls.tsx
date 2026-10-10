"use client";

import React, { useState } from "react";
import {
  useLocalParticipant,
  useRoomContext,
} from "@livekit/components-react";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Users,
  Settings,
  ShieldAlert,
} from "lucide-react";
import { ScreenShare } from "./ScreenShare";

interface MeetingControlsProps {
  isModerator: boolean;
  onToggleParticipants: () => void;
  onLeave: () => void;
  onEndMeeting?: () => void;
}

export const MeetingControls: React.FC<MeetingControlsProps> = ({
  isModerator,
  onToggleParticipants,
  onLeave,
  onEndMeeting,
}) => {
  const { localParticipant } = useLocalParticipant();
  const room = useRoomContext();

  const [isMicOn, setIsMicOn] = useState(
    localParticipant?.isMicrophoneEnabled ?? true
  );
  const [isVideoOn, setIsVideoOn] = useState(
    localParticipant?.isCameraEnabled ?? true
  );

  const toggleMic = async () => {
    if (!localParticipant) return;
    const next = !isMicOn;
    await localParticipant.setMicrophoneEnabled(next);
    setIsMicOn(next);
  };

  const toggleCam = async () => {
    if (!localParticipant) return;
    const next = !isVideoOn;
    await localParticipant.setCameraEnabled(next);
    setIsVideoOn(next);
  };

  return (
    <div className="h-20 bg-zinc-950 border-t border-zinc-800 px-6 flex items-center justify-between">
      {/* Left: Meeting metadata / Time */}
      <div className="flex items-center space-x-3 text-xs text-zinc-400">
        <span className="font-semibold text-zinc-200">
          {room?.name || "Classroom"}
        </span>
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-emerald-400 font-medium">Encrypted Live Call</span>
      </div>

      {/* Center: Core Action Controls */}
      <div className="flex items-center space-x-3">
        {/* Mic */}
        <button
          type="button"
          onClick={toggleMic}
          className={`p-3 rounded-full transition-all duration-200 ${
            isMicOn
              ? "bg-zinc-800 hover:bg-zinc-700 text-white"
              : "bg-red-600 hover:bg-red-500 text-white ring-2 ring-red-500/30"
          }`}
          title={isMicOn ? "Mute Microphone" : "Unmute Microphone"}
        >
          {isMicOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
        </button>

        {/* Camera */}
        <button
          type="button"
          onClick={toggleCam}
          className={`p-3 rounded-full transition-all duration-200 ${
            isVideoOn
              ? "bg-zinc-800 hover:bg-zinc-700 text-white"
              : "bg-red-600 hover:bg-red-500 text-white ring-2 ring-red-500/30"
          }`}
          title={isVideoOn ? "Turn off Camera" : "Turn on Camera"}
        >
          {isVideoOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
        </button>

        {/* Screen Share */}
        <ScreenShare />

        {/* Leave */}
        <button
          type="button"
          onClick={onLeave}
          className="px-5 py-3 rounded-full bg-red-600 hover:bg-red-700 text-white font-semibold text-sm transition-all duration-200 flex items-center space-x-2 shadow-lg shadow-red-600/30 active:scale-95"
          title="Leave Meeting"
        >
          <PhoneOff className="w-4 h-4" />
          <span>Leave</span>
        </button>

        {/* Moderator End for All */}
        {isModerator && onEndMeeting && (
          <button
            type="button"
            onClick={onEndMeeting}
            className="px-4 py-3 rounded-full bg-zinc-800 hover:bg-red-950 hover:text-red-300 text-zinc-300 border border-zinc-700 font-semibold text-xs transition-colors flex items-center space-x-1.5"
            title="End Meeting For All Participants"
          >
            <ShieldAlert className="w-4 h-4 text-red-400" />
            <span>End Class for All</span>
          </button>
        )}
      </div>

      {/* Right: Auxiliary Controls */}
      <div className="flex items-center space-x-3">
        <button
          type="button"
          onClick={onToggleParticipants}
          className="p-3 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 transition"
          title="Toggle Participant List"
        >
          <Users className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
