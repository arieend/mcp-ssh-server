import logger from '../utils/logger.js';

/**
 * MCP Tool Handler - Provides tools for remote operations
 */
export class ToolHandler {
  constructor(sshManager, sftpClient) {
    this.sshManager = sshManager;
    this.sftpClient = sftpClient;
    this.activeConnection = null;
  }

  /**
   * Set active connection
   * @param {string} connectionKey - Connection identifier
   */
  setActiveConnection(connectionKey) {
    this.activeConnection = connectionKey;
    logger.debug('Active connection set for tools', { connectionKey });
  }

  /**
   * Get list of available tools
   * @returns {Array} Tool definitions
   */
  getTools() {
    return [
      {
        name: 'execute_command',
        description: 'Execute a shell command on the remote server. Returns stdout, stderr, and exit code.',
        inputSchema: {
          type: 'object',
          properties: {
            command: {
              type: 'string',
              description: 'The shell command to execute'
            },
            workingDirectory: {
              type: 'string',
              description: 'Optional working directory (defaults to home directory)'
            }
          },
          required: ['command']
        }
      },
      {
        name: 'read_file',
        description: 'Read the contents of a file from the remote server',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Absolute or relative path to the file'
            }
          },
          required: ['path']
        }
      },
      {
        name: 'write_file',
        description: 'Write content to a file on the remote server',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Absolute or relative path to the file'
            },
            content: {
              type: 'string',
              description: 'Content to write to the file'
            }
          },
          required: ['path', 'content']
        }
      },
      {
        name: 'list_directory',
        description: 'List contents of a directory on the remote server',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Absolute or relative path to the directory (defaults to home directory)'
            }
          }
        }
      },
      {
        name: 'connect_ssh',
        description: 'Connect to a remote SSH server. Use this first before any other operations.',
        inputSchema: {
          type: 'object',
          properties: {
            host: {
              type: 'string',
              description: 'Remote host address or IP'
            },
            port: {
              type: 'number',
              description: 'SSH port (default: 22)'
            },
            username: {
              type: 'string',
              description: 'SSH username'
            },
            password: {
              type: 'string',
              description: 'SSH password (only needed for first connection, will generate keys automatically)'
            }
          },
          required: ['host', 'username']
        }
      }
    ];
  }

  /**
   * Execute a tool
   * @param {string} toolName - Name of the tool
   * @param {Object} args - Tool arguments
   * @returns {Promise<Object>} Tool result
   */
  async executeTool(toolName, args) {
    logger.info('Executing tool', { toolName, args: { ...args, password: args.password ? '***' : undefined } });

    try {
      switch (toolName) {
        case 'connect_ssh':
          return await this.connectSSH(args);
        case 'execute_command':
          return await this.executeCommand(args);
        case 'read_file':
          return await this.readFile(args);
        case 'write_file':
          return await this.writeFile(args);
        case 'list_directory':
          return await this.listDirectory(args);
        default:
          throw new Error(`Unknown tool: ${toolName}`);
      }
    } catch (error) {
      logger.error('Tool execution failed', { toolName, error: error.message });
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${error.message}`
          }
        ],
        isError: true
      };
    }
  }

  /**
   * Connect to SSH server
   */
  async connectSSH(args) {
    const { host, port = 22, username, password } = args;

    try {
      await this.sshManager.connect({ host, port, username, password });
      const connectionKey = this.sshManager.getConnectionKey({ host, port, username });
      this.setActiveConnection(connectionKey);

      return {
        content: [
          {
            type: 'text',
            text: `Successfully connected to ${username}@${host}:${port}\n` +
                  `Future connections will use key-based authentication.`
          }
        ]
      };
    } catch (error) {
      throw new Error(`SSH connection failed: ${error.message}`);
    }
  }

  /**
   * Execute command tool
   */
  async executeCommand(args) {
    if (!this.activeConnection) {
      throw new Error('Not connected to any SSH server. Use connect_ssh tool first.');
    }

    const { command, workingDirectory } = args;
    
    let fullCommand = command;
    if (workingDirectory) {
      fullCommand = `cd "${workingDirectory}" && ${command}`;
    }

    const result = await this.sshManager.executeCommand(this.activeConnection, fullCommand);

    let output = '';
    if (result.stdout) {
      output += `STDOUT:\n${result.stdout}\n`;
    }
    if (result.stderr) {
      output += `STDERR:\n${result.stderr}\n`;
    }
    output += `Exit Code: ${result.code}`;

    return {
      content: [
        {
          type: 'text',
          text: output
        }
      ]
    };
  }

  /**
   * Read file tool
   */
  async readFile(args) {
    if (!this.activeConnection) {
      throw new Error('Not connected to any SSH server. Use connect_ssh tool first.');
    }

    const { path } = args;
    const content = await this.sftpClient.readFile(this.activeConnection, path);

    return {
      content: [
        {
          type: 'text',
          text: content
        }
      ]
    };
  }

  /**
   * Write file tool
   */
  async writeFile(args) {
    if (!this.activeConnection) {
      throw new Error('Not connected to any SSH server. Use connect_ssh tool first.');
    }

    const { path, content } = args;
    await this.sftpClient.writeFile(this.activeConnection, path, content);

    return {
      content: [
        {
          type: 'text',
          text: `Successfully wrote ${content.length} bytes to ${path}`
        }
      ]
    };
  }

  /**
   * List directory tool
   */
  async listDirectory(args) {
    if (!this.activeConnection) {
      throw new Error('Not connected to any SSH server. Use connect_ssh tool first.');
    }

    const { path = '~' } = args;
    const entries = await this.sftpClient.listDirectory(this.activeConnection, path);

    const output = entries
      .map(entry => `${entry.type.padEnd(10)} ${entry.size.toString().padStart(10)} ${entry.name}`)
      .join('\n');

    return {
      content: [
        {
          type: 'text',
          text: `Contents of ${path}:\n\n${output}`
        }
      ]
    };
  }
}

export default ToolHandler;
