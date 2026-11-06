import { defineConfig } from "vitest/config";

// Tests cover the pure libraries only (subtitle parsing, ffmpeg argument
// builders, image maths), so a plain Node environment is all we need —
// no DOM emulation, no browser.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
