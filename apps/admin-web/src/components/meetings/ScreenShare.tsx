"use client";

import React, { useState } from "react";
import { useLocalParticipant } from "@livekit/components-react";
import { MonitorUp, MonitorX } from "lucide-react";

interface ScreenShareProps {
  className?: string;
}

export const ScreenShare: React.FC<ScreenShareProps> = ({ className }) => {
  const { localParticipant } = useLocalParticipant();
  const [isSharing, setIsSharing] = useState(
    localParticipant?.isScreenShareEnabled || false
  );

  const toggleScreenShare = async () => {
    if (!localParticipant) return;
    try {
      const willShare = !isSharing;
      await localParticipant.setScreenShareEnabled(willShare);
      setIsSharing(willShare);
    } catch (err) {
      console.error("Screen share error:", err);
      setIsSharing(false);
    }
  };

  return (
    <button
      type="button"
      onClick={toggleScreenShare}
      className={`p-3 rounded-full transition-all duration-200 flex items-center justify-center ${
        isSharing
          ? "bg-blue-600 hover:bg-blue-500 text-white ring-2 ring-blue-400/40"
          : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white"
      } ${className || ""}`}
      title={isSharing ? "Stop Screen Share" : "Share Your Screen"}
    >
      {isSharing ? (
        <MonitorX className="w-5 h-5" />
      ) : (
        <MonitorUp className="w-5 h-5" />
      )}
    </button>
  );
};
