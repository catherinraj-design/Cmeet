"use client";

import React from "react";
import {
  useTracks,
  VideoTrack,
  AudioTrack,
  ParticipantTile,
  TrackRefContext,
  isTrackReference,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import { MicOff, User as UserIcon } from "lucide-react";

export const ParticipantGrid: React.FC = () => {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false }
  );

  // If someone is screen sharing, show screen share main view
  const screenShareTrack = tracks.find(
    (t) => isTrackReference(t) && t.source === Track.Source.ScreenShare
  );

  if (screenShareTrack && isTrackReference(screenShareTrack)) {
    const regularTracks = tracks.filter(
      (t) => t.source !== Track.Source.ScreenShare
    );

    return (
      <div className="flex-1 flex flex-col md:flex-row gap-3 p-4 h-full min-h-0">
        {/* Main Presentation View */}
        <div className="flex-[3] relative bg-zinc-950 rounded-2xl overflow-hidden border border-zinc-800 shadow-xl flex items-center justify-center">
          <TrackRefContext.Provider value={screenShareTrack}>
            <VideoTrack trackRef={screenShareTrack} className="w-full h-full object-contain" />
          </TrackRefContext.Provider>
          <div className="absolute top-3 left-3 bg-zinc-900/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-zinc-700/50 text-xs font-semibold text-white">
            Screen Share: {screenShareTrack.participant.name || screenShareTrack.participant.identity}
          </div>
        </div>

        {/* Side strip of participants */}
        <div className="flex-1 flex md:flex-col gap-2 overflow-y-auto max-h-[85vh]">
          {regularTracks.map((trackRef) => (
            <div
              key={`${trackRef.participant.identity}-${trackRef.source}`}
              className="relative w-full aspect-video bg-zinc-900 rounded-xl overflow-hidden border border-zinc-800 flex items-center justify-center"
            >
              <TrackRefContext.Provider value={trackRef}>
                <ParticipantTile className="w-full h-full object-cover" />
              </TrackRefContext.Provider>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Calculate dynamic grid layout (1, 2, 3-4, 5-9)
  const count = tracks.length;
  let gridCols = "grid-cols-1";
  if (count === 2) gridCols = "grid-cols-1 md:grid-cols-2";
  else if (count >= 3 && count <= 4) gridCols = "grid-cols-2";
  else if (count >= 5 && count <= 9) gridCols = "grid-cols-2 md:grid-cols-3";
  else if (count > 9) gridCols = "grid-cols-3 md:grid-cols-4";

  return (
    <div className={`flex-1 grid ${gridCols} gap-3 p-4 h-full min-h-0 overflow-y-auto`}>
      {tracks.length === 0 ? (
        <div className="col-span-full flex flex-col items-center justify-center text-zinc-500">
          <UserIcon className="w-16 h-16 mb-2 opacity-50" />
          <p className="text-sm font-medium">Waiting for other participants to join...</p>
        </div>
      ) : (
        tracks.map((trackRef) => {
          const isMuted = !trackRef.participant.isMicrophoneEnabled;
          const isSpeaking = trackRef.participant.isSpeaking;

          return (
            <div
              key={`${trackRef.participant.identity}-${trackRef.source}`}
              className={`relative bg-zinc-900/90 rounded-2xl overflow-hidden border transition-all duration-200 flex items-center justify-center aspect-video shadow-md ${
                isSpeaking
                  ? "border-emerald-500 ring-2 ring-emerald-500/30"
                  : "border-zinc-800 hover:border-zinc-700"
              }`}
            >
              <TrackRefContext.Provider value={trackRef}>
                <ParticipantTile className="w-full h-full object-cover" />
              </TrackRefContext.Provider>

              {/* Participant Name Badge */}
              <div className="absolute bottom-3 left-3 flex items-center space-x-1.5 bg-zinc-950/70 backdrop-blur-md px-2.5 py-1 rounded-lg border border-zinc-800 text-xs font-medium text-white shadow">
                <span>{trackRef.participant.name || trackRef.participant.identity}</span>
                {trackRef.participant.isLocal && (
                  <span className="text-[10px] text-zinc-400 font-normal">(You)</span>
                )}
              </div>

              {/* Mute indicator */}
              {isMuted && (
                <div className="absolute top-3 right-3 bg-red-500/90 p-1.5 rounded-full text-white shadow">
                  <MicOff className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
};
