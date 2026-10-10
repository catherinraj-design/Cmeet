"use client";

import React, { useState } from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
} from "@livekit/components-react";
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
  const [showParticipants, setShowParticipants] = useState(false);

  const handleLeave = async () => {
    try {
      await meetingsApi.leaveMeeting(meetingId, "USER_INITIATED_LEAVE");
    } catch (err) {
      console.warn("Error notifying backend of departure:", err);
    }
    onDisconnected();
  };

  const handleEndMeeting = async () => {
    if (confirm("Are you sure you want to end this online class for everyone?")) {
      try {
        await meetingsApi.endMeeting(meetingId);
      } catch (err) {
        console.error("Error ending meeting:", err);
      }
      onDisconnected();
    }
  };

  return (
    <div className="relative w-full h-[90vh] bg-zinc-950 flex flex-col overflow-hidden select-none">
      <LiveKitRoom
        token={credentials.token}
        serverUrl={credentials.server_url}
        connect={true}
        video={initialVideo}
        audio={initialAudio}
        onDisconnected={handleLeave}
        data-lk-theme="default"
        className="flex-1 flex flex-col min-h-0 relative"
      >
        {/* Main Content Area */}
        <div className="flex-1 flex min-h-0 relative">
          {/* Responsive Participant Grid */}
          <ParticipantGrid />

          {/* Collapsible Participant Roster */}
          {showParticipants && (
            <ParticipantList
              isModerator={credentials.is_moderator}
              onClose={() => setShowParticipants(false)}
            />
          )}
        </div>

        {/* Bottom Control Bar */}
        <MeetingControls
          isModerator={credentials.is_moderator}
          onToggleParticipants={() => setShowParticipants(!showParticipants)}
          onLeave={handleLeave}
          onEndMeeting={credentials.is_moderator ? handleEndMeeting : undefined}
        />

        {/* Global WebRTC Audio Output Renderer */}
        <RoomAudioRenderer />
      </LiveKitRoom>
    </div>
  );
};
