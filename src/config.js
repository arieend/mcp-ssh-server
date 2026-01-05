import path from "path";
import { fileURLToPath } from "url";
import os from "os";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Configuration management for MCP SSH Server
 */
export const config = {
  // Base directory for MCP SSH data
  baseDir: path.join(os.homedir(), ".mcp-ssh"),

  // SSH keys directory
  get keysDir() {
    return path.join(this.baseDir, "keys");
  },

  // Config directory
  get configDir() {
    return path.join(this.baseDir, "config");
  },

  // Logs directory
  get logsDir() {
    return path.join(this.baseDir, "logs");
  },

  // SSH connection defaults
  ssh: {
    port: 22,
    readyTimeout: 20000,
    keepaliveInterval: 10000,
    keepaliveCountMax: 3,
    algorithms: {
      kex: [
        "curve25519-sha256",
        "curve25519-sha256@libssh.org",
        "ecdh-sha2-nistp256",
        "ecdh-sha2-nistp384",
        "ecdh-sha2-nistp521",
        "diffie-hellman-group-exchange-sha256",
        "diffie-hellman-group14-sha256",
      ],
      serverHostKey: [
        "ssh-ed25519",
        "ecdsa-sha2-nistp256",
        "ecdsa-sha2-nistp384",
        "ecdsa-sha2-nistp521",
        "rsa-sha2-512",
        "rsa-sha2-256",
      ],
    },
  },

  // Key generation settings
  keyGen: {
    type: "ed25519",
    comment: "mcp-ssh-server",
  },

  // SFTP settings
  sftp: {
    retries: 3,
    retryDelay: 1000,
  },

  // MCP server settings
  mcp: {
    name: "mcp-ssh-server",
    version: "1.0.0",
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || "info",
    toFile: process.env.LOG_TO_FILE === "true",
  },
};

export default config;
