const CALENDLY_BASE_URL = (process.env.EXPO_PUBLIC_CALENDLY_BASE_URL ||
  "https://calendly.com/suthakaranburaj").replace(/\/+$/, "");
const CALENDLY_VIDEO_URL = (process.env.EXPO_PUBLIC_CALENDLY_VIDEO_URL ||
  CALENDLY_BASE_URL).replace(/\/+$/, "");
const CALENDLY_AUDIO_URL = (process.env.EXPO_PUBLIC_CALENDLY_AUDIO_URL ||
  CALENDLY_BASE_URL).replace(/\/+$/, "");

export const getCalendlyLink = (callType) => {
  if (callType === "AUDIO_CALL") {
    return CALENDLY_AUDIO_URL;
  }
  if (callType === "VIDEO_CALL") {
    return CALENDLY_VIDEO_URL;
  }
  return CALENDLY_BASE_URL;
};
