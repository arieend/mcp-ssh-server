import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ToolHandler } from '../src/mcp/ToolHandler.js';

describe('ToolHandler', () => {
  let toolHandler;

  describe('getTools', () => {
    it('should return all available tools', () => {
      toolHandler = new ToolHandler(null, null);
      const tools = toolHandler.getTools();

      assert.strictEqual(tools.length, 5, 'Should have 5 tools');
      
      const toolNames = tools.map(t => t.name);
      assert.ok(toolNames.includes('connect_ssh'), 'Should include connect_ssh');
      assert.ok(toolNames.includes('execute_command'), 'Should include execute_command');
      assert.ok(toolNames.includes('read_file'), 'Should include read_file');
      assert.ok(toolNames.includes('write_file'), 'Should include write_file');
      assert.ok(toolNames.includes('list_directory'), 'Should include list_directory');
    });

    it('should have proper tool schemas', () => {
      toolHandler = new ToolHandler(null, null);
      const tools = toolHandler.getTools();

      tools.forEach(tool => {
        assert.ok(tool.name, 'Tool should have a name');
        assert.ok(tool.description, 'Tool should have a description');
        assert.ok(tool.inputSchema, 'Tool should have an input schema');
        assert.strictEqual(tool.inputSchema.type, 'object', 'Input schema should be an object');
      });
    });

    it('connect_ssh should require host and username', () => {
      toolHandler = new ToolHandler(null, null);
      const tools = toolHandler.getTools();
      const connectTool = tools.find(t => t.name === 'connect_ssh');

      assert.ok(connectTool.inputSchema.required.includes('host'), 'Should require host');
      assert.ok(connectTool.inputSchema.required.includes('username'), 'Should require username');
    });

    it('execute_command should require command', () => {
      toolHandler = new ToolHandler(null, null);
      const tools = toolHandler.getTools();
      const execTool = tools.find(t => t.name === 'execute_command');

      assert.ok(execTool.inputSchema.required.includes('command'), 'Should require command');
    });

    it('write_file should require path and content', () => {
      toolHandler = new ToolHandler(null, null);
      const tools = toolHandler.getTools();
      const writeTool = tools.find(t => t.name === 'write_file');

      assert.ok(writeTool.inputSchema.required.includes('path'), 'Should require path');
      assert.ok(writeTool.inputSchema.required.includes('content'), 'Should require content');
    });
  });

  describe('executeTool', () => {
    it('should return error for unknown tool', async () => {
      toolHandler = new ToolHandler(null, null);
      const result = await toolHandler.executeTool('unknown_tool', {});

      assert.ok(result.isError, 'Should indicate error');
      assert.ok(result.content[0].text.includes('Unknown tool'), 'Should mention unknown tool');
    });

    it('should return error when not connected', async () => {
      toolHandler = new ToolHandler(null, null);
      const result = await toolHandler.executeTool('execute_command', { command: 'ls' });

      assert.ok(result.isError, 'Should indicate error');
      assert.ok(result.content[0].text.includes('Not connected'), 'Should mention not connected');
    });
  });

  describe('setActiveConnection', () => {
    it('should set active connection', () => {
      toolHandler = new ToolHandler(null, null);
      const connectionKey = 'user@host:22';
      
      toolHandler.setActiveConnection(connectionKey);
      
      assert.strictEqual(toolHandler.activeConnection, connectionKey, 'Should set active connection');
    });
  });
});
