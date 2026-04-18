import { getHealth } from "./api";

export async function getAiStatus() {
  const health = await getHealth();
  return {
    provider: "pending",
    ...health,
  };
}
