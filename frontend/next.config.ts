import fs from "node:fs";
import path from "node:path";
import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";

const currentDirectory = process.cwd();
const workspaceRoot = fs.existsSync(path.join(currentDirectory, "frontend"))
  ? currentDirectory
  : path.resolve(currentDirectory, "..");
loadEnvConfig(workspaceRoot);

const nextConfig: NextConfig = {
  outputFileTracingRoot: workspaceRoot,

};

export default nextConfig;
