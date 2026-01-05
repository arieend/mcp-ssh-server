import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { KeyManager } from '../src/ssh/KeyManager.js';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

describe('KeyManager', () => {
  let keyManager;
  let testKeysDir;

  before(async () => {
    // Create temporary directory for test keys
    testKeysDir = path.join(os.tmpdir(), 'mcp-ssh-test-keys');
    await fs.mkdir(testKeysDir, { recursive: true });
    
    keyManager = new KeyManager();
    keyManager.keysDir = testKeysDir; // Override keys directory
  });

  after(async () => {
    // Cleanup test directory
    try {
      await fs.rm(testKeysDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('generateKeyPair', () => {
    it('should generate ED25519 key pair', async () => {
      const host = 'test.example.com';
      const { publicKey, privateKey } = await keyManager.generateKeyPair(host);

      assert.ok(publicKey, 'Public key should be generated');
      assert.ok(privateKey, 'Private key should be generated');
      assert.ok(publicKey.startsWith('ssh-ed25519'), 'Public key should be in OpenSSH format');
      assert.ok(privateKey.includes('BEGIN PRIVATE KEY'), 'Private key should be in PEM format');
    });

    it('should include host in public key comment', async () => {
      const host = 'test.example.com';
      const { publicKey } = await keyManager.generateKeyPair(host);

      assert.ok(publicKey.includes(host), 'Public key should include host in comment');
    });
  });

  describe('storePrivateKey', () => {
    it('should store private key to filesystem', async () => {
      const host = 'test.example.com';
      const { privateKey } = await keyManager.generateKeyPair(host);

      await keyManager.storePrivateKey(host, privateKey);

      const keyPath = keyManager.getPrivateKeyPath(host);
      const exists = await fs.access(keyPath).then(() => true).catch(() => false);
      
      assert.ok(exists, 'Private key file should exist');
    });

    it('should store key as a file', async () => {
      const host = 'test2.example.com';
      const { privateKey } = await keyManager.generateKeyPair(host);

      await keyManager.storePrivateKey(host, privateKey);

      const keyPath = keyManager.getPrivateKeyPath(host);
      const stats = await fs.stat(keyPath);
      
      assert.ok(stats.isFile(), 'Should be a file');
      assert.ok(stats.size > 0, 'File should have content');
    });
  });

  describe('loadPrivateKey', () => {
    it('should load stored private key', async () => {
      const host = 'test3.example.com';
      const { privateKey } = await keyManager.generateKeyPair(host);

      await keyManager.storePrivateKey(host, privateKey);
      const loadedKey = await keyManager.loadPrivateKey(host);

      assert.strictEqual(loadedKey, privateKey, 'Loaded key should match stored key');
    });

    it('should return null for non-existent key', async () => {
      const loadedKey = await keyManager.loadPrivateKey('nonexistent.example.com');
      assert.strictEqual(loadedKey, null, 'Should return null for non-existent key');
    });
  });

  describe('hasKey', () => {
    it('should return true for existing key', async () => {
      const host = 'test4.example.com';
      const { privateKey } = await keyManager.generateKeyPair(host);
      await keyManager.storePrivateKey(host, privateKey);

      const exists = await keyManager.hasKey(host);
      assert.strictEqual(exists, true, 'Should return true for existing key');
    });

    it('should return false for non-existent key', async () => {
      const exists = await keyManager.hasKey('nonexistent2.example.com');
      assert.strictEqual(exists, false, 'Should return false for non-existent key');
    });
  });

  describe('getPrivateKeyPath', () => {
    it('should generate valid file path', () => {
      const host = 'user@example.com:22';
      const keyPath = keyManager.getPrivateKeyPath(host);

      assert.ok(keyPath.includes('id_ed25519'), 'Path should include key type');
      assert.ok(path.isAbsolute(keyPath), 'Path should be absolute');
    });

    it('should sanitize host name', () => {
      const host = 'user@host:22/path';
      const keyPath = keyManager.getPrivateKeyPath(host);

      // Get just the filename part (after the last separator)
      const filename = path.basename(keyPath);
      
      // Filename should not contain invalid characters
      assert.ok(!filename.includes('/'), 'Filename should not contain forward slashes');
      assert.ok(!filename.includes(':'), 'Filename should not contain colons');
      assert.ok(!filename.includes('@'), 'Filename should not contain @ symbols');
    });
  });

  describe('deleteKey', () => {
    it('should delete existing key', async () => {
      const host = 'test5.example.com';
      const { privateKey } = await keyManager.generateKeyPair(host);
      await keyManager.storePrivateKey(host, privateKey);

      await keyManager.deleteKey(host);

      const exists = await keyManager.hasKey(host);
      assert.strictEqual(exists, false, 'Key should be deleted');
    });

    it('should not throw error for non-existent key', async () => {
      await assert.doesNotReject(
        async () => await keyManager.deleteKey('nonexistent3.example.com'),
        'Should not throw error when deleting non-existent key'
      );
    });
  });
});
