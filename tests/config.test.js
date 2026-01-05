import { describe, it } from 'node:test';
import assert from 'node:assert';
import config from '../src/config.js';
import path from 'path';
import os from 'os';

describe('Configuration', () => {
  describe('paths', () => {
    it('should have baseDir in user home', () => {
      assert.ok(config.baseDir.includes('.mcp-ssh'), 'Base directory should include .mcp-ssh');
      assert.ok(config.baseDir.startsWith(os.homedir()), 'Base directory should be in user home');
    });

    it('should have keysDir under baseDir', () => {
      assert.ok(config.keysDir.includes(config.baseDir), 'Keys directory should be under base directory');
      assert.ok(config.keysDir.includes('keys'), 'Keys directory should include "keys"');
    });

    it('should have configDir under baseDir', () => {
      assert.ok(config.configDir.includes(config.baseDir), 'Config directory should be under base directory');
      assert.ok(config.configDir.includes('config'), 'Config directory should include "config"');
    });

    it('should have logsDir under baseDir', () => {
      assert.ok(config.logsDir.includes(config.baseDir), 'Logs directory should be under base directory');
      assert.ok(config.logsDir.includes('logs'), 'Logs directory should include "logs"');
    });
  });

  describe('ssh settings', () => {
    it('should have default port 22', () => {
      assert.strictEqual(config.ssh.port, 22, 'Default SSH port should be 22');
    });

    it('should have reasonable timeout', () => {
      assert.ok(config.ssh.readyTimeout > 0, 'Ready timeout should be positive');
      assert.ok(config.ssh.readyTimeout <= 60000, 'Ready timeout should be reasonable');
    });

    it('should have keepalive settings', () => {
      assert.ok(config.ssh.keepaliveInterval > 0, 'Keepalive interval should be positive');
      assert.ok(config.ssh.keepaliveCountMax > 0, 'Keepalive count max should be positive');
    });

    it('should have modern algorithms', () => {
      assert.ok(Array.isArray(config.ssh.algorithms.kex), 'KEX algorithms should be an array');
      assert.ok(config.ssh.algorithms.kex.length > 0, 'Should have KEX algorithms');
      assert.ok(config.ssh.algorithms.kex.includes('curve25519-sha256'), 'Should include curve25519');
      
      assert.ok(Array.isArray(config.ssh.algorithms.serverHostKey), 'Server host key algorithms should be an array');
      assert.ok(config.ssh.algorithms.serverHostKey.includes('ssh-ed25519'), 'Should include ED25519');
    });
  });

  describe('key generation', () => {
    it('should use ed25519 key type', () => {
      assert.strictEqual(config.keyGen.type, 'ed25519', 'Should use ED25519 keys');
    });

    it('should have comment', () => {
      assert.ok(config.keyGen.comment, 'Should have key comment');
      assert.ok(config.keyGen.comment.includes('mcp'), 'Comment should mention mcp');
    });
  });

  describe('mcp settings', () => {
    it('should have server name', () => {
      assert.ok(config.mcp.name, 'Should have MCP server name');
    });

    it('should have version', () => {
      assert.ok(config.mcp.version, 'Should have version');
      assert.match(config.mcp.version, /^\d+\.\d+\.\d+$/, 'Version should be semver format');
    });
  });

  describe('logging', () => {
    it('should have valid log level', () => {
      const validLevels = ['debug', 'info', 'warn', 'error'];
      assert.ok(validLevels.includes(config.logging.level), 'Should have valid log level');
    });

    it('should have toFile setting', () => {
      assert.strictEqual(typeof config.logging.toFile, 'boolean', 'toFile should be boolean');
    });
  });
});
