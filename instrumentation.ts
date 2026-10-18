import { installConsoleBridge } from "@/lib/server/logger";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    installConsoleBridge();
  }
}
