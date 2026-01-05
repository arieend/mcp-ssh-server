import SFTPClient from 'ssh2-sftp-client';
import logger from '../utils/logger.js';
import config from '../config.js';

/**
 * SFTP client wrapper for file operations
 */
export class SFTPClientWrapper {
  constructor(sshConnectionManager) {
    this.sshManager = sshConnectionManager;
    this.sftpClients = new Map(); // connectionKey -> SFTPClient
  }

  /**
   * Get or create SFTP client for connection
   * @param {string} connectionKey - Connection identifier
   * @returns {Promise<SFTPClient>}
   */
  async getClient(connectionKey) {
    if (this.sftpClients.has(connectionKey)) {
      return this.sftpClients.get(connectionKey);
    }

    const sftp = new SFTPClient();
    const sshClient = await this.sshManager.getSFTP(connectionKey);
    
    // Wrap the native SFTP session
    sftp.client = sshClient;
    
    this.sftpClients.set(connectionKey, sftp);
    return sftp;
  }

  /**
   * Read file from remote server
   * @param {string} connectionKey - Connection identifier
   * @param {string} remotePath - Remote file path
   * @returns {Promise<string>} File contents
   */
  async readFile(connectionKey, remotePath) {
    try {
      logger.debug('Reading remote file', { remotePath });
      
      const result = await this.sshManager.executeCommand(
        connectionKey,
        `cat "${remotePath}"`
      );

      if (result.code !== 0) {
        throw new Error(`Failed to read file: ${result.stderr}`);
      }

      return result.stdout;
    } catch (error) {
      logger.error('Failed to read file', { remotePath, error: error.message });
      throw error;
    }
  }

  /**
   * Write file to remote server
   * @param {string} connectionKey - Connection identifier
   * @param {string} remotePath - Remote file path
   * @param {string} content - File content
   */
  async writeFile(connectionKey, remotePath, content) {
    try {
      logger.debug('Writing remote file', { remotePath });

      // Escape content for shell
      const escapedContent = content.replace(/'/g, "'\\''");
      
      // Create parent directory if needed and write file
      const command = `mkdir -p "$(dirname "${remotePath}")" && echo '${escapedContent}' > "${remotePath}"`;
      
      const result = await this.sshManager.executeCommand(connectionKey, command);

      if (result.code !== 0) {
        throw new Error(`Failed to write file: ${result.stderr}`);
      }

      logger.info('File written successfully', { remotePath });
    } catch (error) {
      logger.error('Failed to write file', { remotePath, error: error.message });
      throw error;
    }
  }

  /**
   * List directory contents
   * @param {string} connectionKey - Connection identifier
   * @param {string} remotePath - Remote directory path
   * @returns {Promise<Array<{name: string, type: string, size: number}>>}
   */
  async listDirectory(connectionKey, remotePath) {
    try {
      logger.debug('Listing directory', { remotePath });

      // Use ls with format: type|name|size
      const command = `ls -lA "${remotePath}" | awk 'NR>1 {type=substr($1,1,1); if(type=="d") type="directory"; else if(type=="-") type="file"; else type="other"; print type"|"$NF"|"$5}'`;
      
      const result = await this.sshManager.executeCommand(connectionKey, command);

      if (result.code !== 0) {
        throw new Error(`Failed to list directory: ${result.stderr}`);
      }

      const entries = result.stdout
        .trim()
        .split('\n')
        .filter(line => line.length > 0)
        .map(line => {
          const [type, name, size] = line.split('|');
          return {
            name,
            type,
            size: parseInt(size, 10) || 0
          };
        });

      return entries;
    } catch (error) {
      logger.error('Failed to list directory', { remotePath, error: error.message });
      throw error;
    }
  }

  /**
   * Check if path exists
   * @param {string} connectionKey - Connection identifier
   * @param {string} remotePath - Remote path
   * @returns {Promise<boolean>}
   */
  async exists(connectionKey, remotePath) {
    try {
      const result = await this.sshManager.executeCommand(
        connectionKey,
        `test -e "${remotePath}" && echo "exists" || echo "not found"`
      );

      return result.stdout.trim() === 'exists';
    } catch (error) {
      logger.error('Failed to check path existence', { remotePath, error: error.message });
      return false;
    }
  }

  /**
   * Get file/directory stats
   * @param {string} connectionKey - Connection identifier
   * @param {string} remotePath - Remote path
   * @returns {Promise<{type: string, size: number, modified: string}>}
   */
  async stat(connectionKey, remotePath) {
    try {
      // Get file stats: type, size, modification time
      const command = `stat -c '%F|%s|%Y' "${remotePath}"`;
      
      const result = await this.sshManager.executeCommand(connectionKey, command);

      if (result.code !== 0) {
        throw new Error(`Failed to stat path: ${result.stderr}`);
      }

      const [typeStr, size, mtime] = result.stdout.trim().split('|');
      
      let type = 'file';
      if (typeStr.includes('directory')) {
        type = 'directory';
      } else if (typeStr.includes('symbolic link')) {
        type = 'symlink';
      }

      return {
        type,
        size: parseInt(size, 10),
        modified: new Date(parseInt(mtime, 10) * 1000).toISOString()
      };
    } catch (error) {
      logger.error('Failed to stat path', { remotePath, error: error.message });
      throw error;
    }
  }

  /**
   * Close SFTP client
   * @param {string} connectionKey - Connection identifier
   */
  async close(connectionKey) {
    const client = this.sftpClients.get(connectionKey);
    if (client) {
      await client.end();
      this.sftpClients.delete(connectionKey);
      logger.debug('SFTP client closed', { connectionKey });
    }
  }

  /**
   * Close all SFTP clients
   */
  async closeAll() {
    for (const [key, client] of this.sftpClients) {
      await client.end();
      logger.debug('SFTP client closed', { connectionKey: key });
    }
    this.sftpClients.clear();
  }
}

export default SFTPClientWrapper;
