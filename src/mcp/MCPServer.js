import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import config from '../config.js';
import logger from '../utils/logger.js';
import SSHConnectionManager from '../ssh/SSHConnectionManager.js';
import SFTPClientWrapper from '../sftp/SFTPClient.js';
import ResourceHandler from './ResourceHandler.js';
import ToolHandler from './ToolHandler.js';

/**
 * MCP Server implementation for SSH bridge
 */
export class MCPServer {
  constructor() {
    this.server = new Server(
      {
        name: config.mcp.name,
        version: config.mcp.version,
      },
      {
        capabilities: {
          resources: {},
          tools: {},
        },
      }
    );

    // Initialize components
    this.sshManager = new SSHConnectionManager();
    this.sftpClient = new SFTPClientWrapper(this.sshManager);
    this.resourceHandler = new ResourceHandler(this.sshManager, this.sftpClient);
    this.toolHandler = new ToolHandler(this.sshManager, this.sftpClient);

    this.setupHandlers();
  }

  /**
   * Setup MCP protocol handlers
   */
  setupHandlers() {
    // List available resources
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      logger.debug('Handling ListResources request');
      const resources = await this.resourceHandler.listResources();
      return { resources };
    });

    // Read resource content
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      logger.debug('Handling ReadResource request', { uri: request.params.uri });
      return await this.resourceHandler.readResource(request.params.uri);
    });

    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      logger.debug('Handling ListTools request');
      const tools = this.toolHandler.getTools();
      return { tools };
    });

    // Execute tool
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      logger.debug('Handling CallTool request', { name });
      return await this.toolHandler.executeTool(name, args || {});
    });

    logger.info('MCP handlers registered');
  }

  /**
   * Start the MCP server
   */
  async start() {
    logger.info('Starting MCP SSH Server', {
      name: config.mcp.name,
      version: config.mcp.version
    });

    const transport = new StdioServerTransport();
    await this.server.connect(transport);

    logger.info('MCP SSH Server started and listening on stdio');
  }

  /**
   * Stop the MCP server
   */
  async stop() {
    logger.info('Stopping MCP SSH Server');
    
    // Close all SFTP clients
    await this.sftpClient.closeAll();
    
    // Disconnect all SSH connections
    this.sshManager.disconnectAll();
    
    // Close server
    await this.server.close();
    
    logger.info('MCP SSH Server stopped');
  }
}

export default MCPServer;
