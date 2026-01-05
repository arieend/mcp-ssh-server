import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ResourceHandler } from '../src/mcp/ResourceHandler.js';

describe('ResourceHandler', () => {
  let resourceHandler;

  describe('parseResourceURI', () => {
    it('should parse valid SSH URI', () => {
      resourceHandler = new ResourceHandler(null, null);
      const uri = 'ssh://user@host:22/home/user/file.txt';
      const path = resourceHandler.parseResourceURI(uri);

      assert.strictEqual(path, '/home/user/file.txt', 'Should extract path from URI');
    });

    it('should handle root path', () => {
      resourceHandler = new ResourceHandler(null, null);
      const uri = 'ssh://user@host:22/';
      const path = resourceHandler.parseResourceURI(uri);

      assert.strictEqual(path, '~', 'Should convert root to home directory');
    });

    it('should throw error for invalid URI', () => {
      resourceHandler = new ResourceHandler(null, null);
      
      assert.throws(
        () => resourceHandler.parseResourceURI('invalid-uri'),
        /Invalid resource URI/,
        'Should throw error for invalid URI'
      );
    });
  });

  describe('buildResourceURI', () => {
    it('should build valid resource URI', () => {
      resourceHandler = new ResourceHandler(null, null);
      resourceHandler.setActiveConnection('user@host:22');
      
      const uri = resourceHandler.buildResourceURI('/home/user/file.txt');
      
      assert.strictEqual(uri, 'ssh://user@host:22/home/user/file.txt', 'Should build correct URI');
    });

    it('should throw error when not connected', () => {
      resourceHandler = new ResourceHandler(null, null);
      
      assert.throws(
        () => resourceHandler.buildResourceURI('/path'),
        /No active connection/,
        'Should throw error when not connected'
      );
    });
  });

  describe('setActiveConnection', () => {
    it('should set active connection', () => {
      resourceHandler = new ResourceHandler(null, null);
      const connectionKey = 'user@host:22';
      
      resourceHandler.setActiveConnection(connectionKey);
      
      assert.strictEqual(resourceHandler.activeConnection, connectionKey, 'Should set active connection');
    });
  });

  describe('listResources', () => {
    it('should return empty array when not connected', async () => {
      resourceHandler = new ResourceHandler(null, null);
      const resources = await resourceHandler.listResources();

      assert.strictEqual(resources.length, 0, 'Should return empty array');
    });

    it('should return root resource when connected', async () => {
      resourceHandler = new ResourceHandler(null, null);
      resourceHandler.setActiveConnection('user@host:22');
      
      const resources = await resourceHandler.listResources();

      assert.strictEqual(resources.length, 1, 'Should return one resource');
      assert.ok(resources[0].uri.startsWith('ssh://'), 'URI should start with ssh://');
      assert.strictEqual(resources[0].mimeType, 'application/x-directory', 'Should be directory type');
    });
  });
});
