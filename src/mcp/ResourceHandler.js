import logger from '../utils/logger.js';

/**
 * MCP Resource Handler - Exposes remote file system as resources
 */
export class ResourceHandler {
  constructor(sshManager, sftpClient) {
    this.sshManager = sshManager;
    this.sftpClient = sftpClient;
    this.activeConnection = null; // Will be set when connected
  }

  /**
   * Set active connection
   * @param {string} connectionKey - Connection identifier
   */
  setActiveConnection(connectionKey) {
    this.activeConnection = connectionKey;
    logger.debug('Active connection set for resources', { connectionKey });
  }

  /**
   * List available resources
   * @returns {Promise<Array>} List of resources
   */
  async listResources() {
    if (!this.activeConnection) {
      return [];
    }

    try {
      // Return root directory as a resource
      return [
        {
          uri: `ssh://${this.activeConnection}/`,
          name: 'Remote Home Directory',
          description: 'Root of the remote file system',
          mimeType: 'application/x-directory'
        }
      ];
    } catch (error) {
      logger.error('Failed to list resources', { error: error.message });
      return [];
    }
  }

  /**
   * Read resource content
   * @param {string} uri - Resource URI (format: ssh://user@host:port/path)
   * @returns {Promise<{contents: Array}>}
   */
  async readResource(uri) {
    if (!this.activeConnection) {
      throw new Error('No active SSH connection');
    }

    try {
      // Parse URI
      const path = this.parseResourceURI(uri);
      
      logger.debug('Reading resource', { uri, path });

      // Check if path exists
      const exists = await this.sftpClient.exists(this.activeConnection, path);
      if (!exists) {
        throw new Error(`Path does not exist: ${path}`);
      }

      // Get path stats
      const stats = await this.sftpClient.stat(this.activeConnection, path);

      if (stats.type === 'directory') {
        // List directory contents
        const entries = await this.sftpClient.listDirectory(this.activeConnection, path);
        
        const contents = entries.map(entry => ({
          uri: `ssh://${this.activeConnection}${path}/${entry.name}`,
          name: entry.name,
          mimeType: entry.type === 'directory' ? 'application/x-directory' : 'text/plain',
          description: `${entry.type} (${entry.size} bytes)`
        }));

        return {
          contents: [
            {
              uri,
              mimeType: 'application/x-directory',
              text: JSON.stringify(contents, null, 2)
            }
          ]
        };
      } else {
        // Read file content
        const content = await this.sftpClient.readFile(this.activeConnection, path);
        
        return {
          contents: [
            {
              uri,
              mimeType: 'text/plain',
              text: content
            }
          ]
        };
      }
    } catch (error) {
      logger.error('Failed to read resource', { uri, error: error.message });
      throw error;
    }
  }

  /**
   * Parse resource URI to extract path
   * @param {string} uri - Resource URI
   * @returns {string} File path
   */
  parseResourceURI(uri) {
    // Format: ssh://user@host:port/path or ssh://user@host:port/
    const match = uri.match(/^ssh:\/\/[^/]+(.*)$/);
    if (!match) {
      throw new Error(`Invalid resource URI: ${uri}`);
    }

    let path = match[1] || '/';
    
    // If path is just '/', use home directory
    if (path === '/') {
      path = '~';
    }

    return path;
  }

  /**
   * Build resource URI
   * @param {string} path - File path
   * @returns {string} Resource URI
   */
  buildResourceURI(path) {
    if (!this.activeConnection) {
      throw new Error('No active connection');
    }

    return `ssh://${this.activeConnection}${path}`;
  }
}

export default ResourceHandler;
