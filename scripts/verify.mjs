import { existsSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const isWindows = process.platform === "win32";
const npmCommand = "npm";
const backendPython = isWindows
  ? join(root, "backend", ".venv", "Scripts", "python.exe")
  : join(root, "backend", ".venv", "bin", "python");
const pythonCommand = existsSync(backendPython) ? backendPython : "python";

const steps = [
  {
    label: "npm run format",
    command: npmCommand,
    args: ["run", "format"],
    cwd: root,
  },
  {
    label: "npm run lint",
    command: npmCommand,
    args: ["run", "lint"],
    cwd: root,
  },
  {
    label: "npm run typecheck",
    command: npmCommand,
    args: ["run", "typecheck"],
    cwd: root,
  },
  {
    label: "pytest",
    command: pythonCommand,
    args: ["-m", "pytest"],
    cwd: join(root, "backend"),
  },
  {
    label: "npm run build",
    command: npmCommand,
    args: ["run", "build"],
    cwd: root,
  },
];

for (const step of steps) {
  console.log(`\n> ${step.label}`);
  const result = spawnSync(step.command, step.args, {
    cwd: step.cwd,
    stdio: "inherit",
    shell: true,
  });

  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
