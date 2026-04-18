import React, { useContext, useEffect, useMemo, useRef } from "react";
import { AuthContext } from "../context/AuthContext";
import { createSocket } from "../services/socket";
import { getCalendlyLink } from "../services/callLinks";

export default function IncomingCallListener({ navigationRef }) {
  const { user, role } = useContext(AuthContext);
  const handledRef = useRef(new Set());

  const displayName = useMemo(
    () => user?.abha_profile?.name || user?.name || "Patient",
    [user]
  );

  useEffect(() => {
    if (!user?._id || role !== "patient") return;
    const socket = createSocket();

    socket.emit("register-user", {
      userId: user._id,
      role: "patient",
      name: displayName,
    });

    socket.on("incoming-call", (payload) => {
      const payloadData = payload || {};
      const appointmentId =
        payloadData?.appointmentId || payloadData?.roomId || null;
      const dedupeKey = appointmentId || `${Date.now()}`;
      if (handledRef.current.has(dedupeKey)) return;
      handledRef.current.add(dedupeKey);
      const url =
        payloadData?.videoLink ||
        getCalendlyLink(payloadData?.callType || "VIDEO_CALL");
      navigationRef?.current?.navigate("CallScreen", {
        url,
        title:
          payloadData?.callType === "AUDIO_CALL"
            ? "Incoming Audio Call"
            : "Incoming Video Call",
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [user?._id, role, displayName]);

  return null;
}
