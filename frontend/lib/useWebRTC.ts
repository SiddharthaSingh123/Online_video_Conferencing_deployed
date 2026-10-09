"use client";

import { useEffect, useRef, useState } from "react";

// Google's free STUN servers let peers find each other across most home routers.
// For very strict corporate NATs a paid TURN server would be needed.
const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

// participantId (number) -> their MediaStream
type RemoteStreams = Record<string, MediaStream>;

function wsUrl(code: string): string {
  const base = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000")
    .replace(/^https/, "wss")
    .replace(/^http/, "ws");
  return `${base}/ws/${code}`;
}

/**
 * Connects to the signaling WebSocket and negotiates WebRTC peer connections
 * with every other participant in the room.
 *
 * Returns a map: remote participant id string -> their MediaStream.
 * Pass those streams to VideoTile to show their camera and play their audio.
 */
export function useWebRTC(
  code: string,
  participantId: number | null,
  localStream: MediaStream | null
): { remoteStreams: RemoteStreams } {
  const [remoteStreams, setRemoteStreams] = useState<RemoteStreams>({});
  const wsRef = useRef<WebSocket | null>(null);
  // RTCPeerConnection per remote participant id
  const peersRef = useRef<Record<string, RTCPeerConnection>>({});
  // Mirror of state kept in a ref so closures see the latest value
  const streamsRef = useRef<RemoteStreams>({});

  useEffect(() => {
    if (!participantId || !localStream) return;
    const safeStream = localStream; // narrowed: not null past this point

    const myId = String(participantId);
    const ws = new WebSocket(wsUrl(code));
    wsRef.current = ws;

    function send(msg: object) {
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
    }

    function updateStreams(updated: RemoteStreams) {
      streamsRef.current = updated;
      setRemoteStreams({ ...updated });
    }

    function createPeer(remoteId: string): RTCPeerConnection {
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

      // Add every local track (audio + video) to this connection.
      safeStream.getTracks().forEach((track) => pc.addTrack(track, safeStream));

      // ICE candidates are network addresses — relay them through the server.
      pc.onicecandidate = (e) => {
        if (e.candidate) send({ type: "ice-candidate", from: myId, to: remoteId, data: e.candidate });
      };

      // When the remote peer's track arrives, surface it as a MediaStream.
      pc.ontrack = (e) => {
        const stream = e.streams[0];
        if (!stream) return;
        updateStreams({ ...streamsRef.current, [remoteId]: stream });
      };

      peersRef.current[remoteId] = pc;
      return pc;
    }

    function removePeer(remoteId: string) {
      peersRef.current[remoteId]?.close();
      delete peersRef.current[remoteId];
      const updated = { ...streamsRef.current };
      delete updated[remoteId];
      updateStreams(updated);
    }

    ws.onopen = () => send({ type: "join", from: myId });

    ws.onmessage = async (event) => {
      const msg = JSON.parse(event.data as string);
      const { type, from, data } = msg;

      if (type === "join") {
        // An existing peer sends an offer to the newcomer.
        const pc = createPeer(from);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        send({ type: "offer", from: myId, to: from, data: offer });
      } else if (type === "offer") {
        const pc = createPeer(from);
        await pc.setRemoteDescription(new RTCSessionDescription(data));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        send({ type: "answer", from: myId, to: from, data: answer });
      } else if (type === "answer") {
        await peersRef.current[from]?.setRemoteDescription(new RTCSessionDescription(data));
      } else if (type === "ice-candidate") {
        try {
          await peersRef.current[from]?.addIceCandidate(new RTCIceCandidate(data));
        } catch {
          // silently ignore late candidates
        }
      } else if (type === "leave") {
        removePeer(from);
      }
    };

    return () => {
      send({ type: "leave", from: myId });
      ws.close();
      Object.values(peersRef.current).forEach((pc) => pc.close());
      peersRef.current = {};
      streamsRef.current = {};
      setRemoteStreams({});
    };
  // Re-run only if the meeting or our identity changes; not on every render.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, participantId, localStream]);

  return { remoteStreams };
}
