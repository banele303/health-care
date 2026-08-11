export type OrbState = "idle" | "listening" | "thinking" | "speaking" | "executing" | "success" | "error";

export const ORB_STATE_HUES: Record<OrbState, number> = {
  idle: 197,
  listening: 197,
  thinking: 268,
  executing: 38,
  speaking: 160,
  error: 5,
  success: 142,
};

export const ORB_STATE_LABELS: Record<OrbState, string> = {
  idle: "Standby",
  listening: "Listening",
  thinking: "Thinking",
  executing: "Executing",
  speaking: "Speaking",
  error: "Error",
  success: "Done",
};
