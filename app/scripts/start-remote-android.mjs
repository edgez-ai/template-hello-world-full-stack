import { spawn } from "node:child_process";
import net from "node:net";

const port = Number(process.env.EXPO_PORT ?? 8081);
const serial = process.env.ANDROID_SERIAL ?? "127.0.0.1:5555";
const expoUrl = `exp://127.0.0.1:${port}`;

const expo = spawn(
  "expo",
  ["start", "--host", "localhost", "--port", String(port)],
  { stdio: "inherit" },
);

function stop() {
  if (!expo.killed) expo.kill("SIGTERM");
}

process.once("SIGINT", stop);
process.once("SIGTERM", stop);
process.once("exit", stop);

function isMetroReady() {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: "127.0.0.1", port });
    socket.once("connect", () => {
      socket.end();
      resolve(true);
    });
    socket.once("error", () => resolve(false));
  });
}

const deadline = Date.now() + 30_000;
while (!(await isMetroReady())) {
  if (expo.exitCode !== null) {
    process.exit(expo.exitCode ?? 1);
  }
  if (Date.now() >= deadline) {
    console.error(`Timed out waiting for Expo on port ${port}.`);
    stop();
    process.exit(1);
  }
  await new Promise((resolve) => setTimeout(resolve, 250));
}

const adb = spawn(
  "adb",
  [
    "-s",
    serial,
    "shell",
    "am",
    "start",
    "-a",
    "android.intent.action.VIEW",
    "-d",
    expoUrl,
  ],
  { stdio: "inherit" },
);

adb.once("error", (error) => {
  console.error(`Failed to launch Expo Go: ${error.message}`);
  stop();
  process.exitCode = 1;
});

const adbExitCode = await new Promise((resolve) => adb.once("exit", resolve));
if (adbExitCode !== 0) {
  stop();
  process.exit(adbExitCode ?? 1);
}

const expoExitCode =
  expo.exitCode !== null || expo.signalCode !== null
    ? expo.exitCode
    : await new Promise((resolve) => expo.once("exit", resolve));
process.exit(expoExitCode ?? 0);
