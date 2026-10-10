"use client";

import React from "react";
import { useParticipants } from "@livekit/components-react";
import { Users, Mic, MicOff, Shield, X, UserMinus } from "lucide-react";

interface ParticipantListProps {
  onClose: () => void;
  isModerator: boolean;
}

export const ParticipantList: React.FC<ParticipantListProps> = ({
  onClose,
  isModerator,
}) => {
  const participants = useParticipants();

  return (
    <div className="w-80 h-full bg-zinc-900 border-l border-zinc-800 flex flex-col shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-zinc-800">
        <div className="flex items-center space-x-2">
          <Users className="w-4 h-4 text-indigo-400" />
          <h3 className="font-semibold text-sm text-white">
            Participants ({participants.length})
          </h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Participant List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
        {participants.map((p) => {
          const isLocal = p.isLocal;
          const isAudioOn = p.isMicrophoneEnabled;

          return (
            <div
              key={p.identity}
              className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800/80 hover:border-zinc-700/80 transition"
            >
              <div className="flex items-center space-x-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 font-semibold text-xs flex items-center justify-center flex-shrink-0">
                  {(p.name || p.identity).slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex flex-col">
                  <span className="text-xs font-semibold text-zinc-200 truncate">
                    {p.name || p.identity}
                    {isLocal && (
                      <span className="ml-1 text-[10px] text-zinc-400 font-normal">
                        (You)
                      </span>
                    )}
                  </span>
                  <span className="text-[10px] text-zinc-500 truncate">
                    {isLocal ? "Connected" : "In Room"}
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-2 flex-shrink-0">
                {isAudioOn ? (
                  <Mic className="w-4 h-4 text-emerald-400" />
                ) : (
                  <MicOff className="w-4 h-4 text-zinc-500" />
                )}

                {isModerator && !isLocal && (
                  <button
                    title="Remove from room"
                    className="p-1 text-zinc-500 hover:text-red-400 transition"
                    onClick={() => {
                      alert(`Host control: Disconnecting ${p.name || p.identity}`);
                    }}
                  >
                    <UserMinus className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-zinc-800 text-[11px] text-zinc-500 flex items-center space-x-1.5">
        <Shield className="w-3.5 h-3.5 text-indigo-400" />
        <span>Enterprise RBAC Classroom Protection</span>
      </div>
    </div>
  );
};
