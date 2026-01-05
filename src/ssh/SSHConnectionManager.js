import { Client } from 'ssh2';
import config from '../config.js';
import logger from '../utils/logger.js';
import KeyManager from './KeyManager.js';

/**
 * Manages SSH connections with password-to-key bootstrap
 */
export class SSHConnectionManager {
  constructor() {
    this.connections = new Map(); // host -> Client
    this.keyManager = new KeyManager();
  }

  /**
   * Connect to remote server with password-to-key bootstrap
   * @param {Object} options - Connection options
   * @param {string} options.host - Remote host
   * @param {number} [options.port=22] - SSH port
   * @param {string} options.username - SSH username
   * @param {string} [options.password] - SSH password (for initial connection)
   * @returns {Promise<Client>} SSH client
   */
  async connect(options) {
    const { host, port = 22, username, password } = options;
    const connectionKey = `${username}@${host}:${port}`;

    // Check if already connected
    if (this.connections.has(connectionKey)) {
      const client = this.connections.get(connectionKey);
      if (client._sock && client._sock.readable) {
        logger.debug('Reusing existing connection', { host, username });
        return client;
      } else {
        // Connection is stale, remove it
        this.connections.delete(connectionKey);
      }
    }

    // Check if we have a stored key
    const hasKey = await this.keyManager.hasKey(connectionKey);

    if (hasKey) {
      logger.info('Attempting key-based authentication', { host, username });
      try {
        const client = await this.connectWithKey(options, connectionKey);
        this.connections.set(connectionKey, client);
        return client;
      } catch (error) {
        logger.warn('Key-based authentication failed, falling back to password', {
          error: error.message
        });
        // Key auth failed, try password if provided
        if (!password) {
          throw new Error('Key authentication failed and no password provided');
        }
      }
    }

    // Password-based connection (initial or fallback)
    if (!password) {
      throw new Error('No stored key found and no password provided');
    }

    logger.info('Attempting password-based authentication', { host, username });
    const client = await this.connectWithPassword(options);

    // Bootstrap: generate and deploy key
    await this.bootstrapKeyAuth(client, connectionKey);

    this.connections.set(connectionKey, client);
    return client;
  }

  /**
   * Connect using password authentication
   * @param {Object} options - Connection options
   * @returns {Promise<Client>}
   */
  async connectWithPassword(options) {
    const { host, port = 22, username, password } = options;

    return new Promise((resolve, reject) => {
      const client = new Client();

      const timeout = setTimeout(() => {
        client.end();
        reject(new Error('Connection timeout'));
      }, config.ssh.readyTimeout);

      client.on('ready', () => {
        clearTimeout(timeout);
        logger.info('SSH connection established (password)', { host, username });
        resolve(client);
      });

      client.on('error', (err) => {
        clearTimeout(timeout);
        logger.error('SSH connection error', { error: err.message });
        reject(err);
      });

      client.connect({
        host,
        port,
        username,
        password,
        readyTimeout: config.ssh.readyTimeout,
        keepaliveInterval: config.ssh.keepaliveInterval,
        keepaliveCountMax: config.ssh.keepaliveCountMax,
        algorithms: config.ssh.algorithms,
      });
    });
  }

  /**
   * Connect using key-based authentication
   * @param {Object} options - Connection options
   * @param {string} connectionKey - Connection identifier
   * @returns {Promise<Client>}
   */
  async connectWithKey(options, connectionKey) {
    const { host, port = 22, username } = options;
    const privateKey = await this.keyManager.loadPrivateKey(connectionKey);

    if (!privateKey) {
      throw new Error('Private key not found');
    }

    return new Promise((resolve, reject) => {
      const client = new Client();

      const timeout = setTimeout(() => {
        client.end();
        reject(new Error('Connection timeout'));
      }, config.ssh.readyTimeout);

      client.on('ready', () => {
        clearTimeout(timeout);
        logger.info('SSH connection established (key)', { host, username });
        resolve(client);
      });

      client.on('error', (err) => {
        clearTimeout(timeout);
        logger.error('SSH connection error', { error: err.message });
        reject(err);
      });

      client.connect({
        host,
        port,
        username,
        privateKey,
        readyTimeout: config.ssh.readyTimeout,
        keepaliveInterval: config.ssh.keepaliveInterval,
        keepaliveCountMax: config.ssh.keepaliveCountMax,
        algorithms: config.ssh.algorithms,
      });
    });
  }

  /**
   * Bootstrap key-based authentication
   * @param {Client} client - Active SSH client
   * @param {string} connectionKey - Connection identifier
   */
  async bootstrapKeyAuth(client, connectionKey) {
    logger.info('Starting key bootstrap process', { connectionKey });

    try {
      // Generate key pair
      const { publicKey, privateKey } = await this.keyManager.generateKeyPair(connectionKey);

      // Deploy public key to remote server
      await this.keyManager.deployPublicKey(client, publicKey);

      // Store private key locally
      await this.keyManager.storePrivateKey(connectionKey, privateKey);

      logger.info('Key bootstrap completed successfully', { connectionKey });
    } catch (error) {
      logger.error('Key bootstrap failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Execute command on remote server
   * @param {string} connectionKey - Connection identifier
   * @param {string} command - Command to execute
   * @returns {Promise<{stdout: string, stderr: string, code: number}>}
   */
  async executeCommand(connectionKey, command) {
    const client = this.connections.get(connectionKey);
    if (!client) {
      throw new Error('No active connection found');
    }

    return new Promise((resolve, reject) => {
      logger.debug('Executing command', { command });

      client.exec(command, (err, stream) => {
        if (err) {
          logger.error('Failed to execute command', { error: err.message });
          return reject(err);
        }

        let stdout = '';
        let stderr = '';

        stream.on('data', (data) => {
          stdout += data.toString();
        });

        stream.stderr.on('data', (data) => {
          stderr += data.toString();
        });

        stream.on('close', (code) => {
          logger.debug('Command completed', { code, stdoutLength: stdout.length, stderrLength: stderr.length });
          resolve({ stdout, stderr, code });
        });
      });
    });
  }

  /**
   * Get SFTP session
   * @param {string} connectionKey - Connection identifier
   * @returns {Promise<SFTP>}
   */
  async getSFTP(connectionKey) {
    const client = this.connections.get(connectionKey);
    if (!client) {
      throw new Error('No active connection found');
    }

    return new Promise((resolve, reject) => {
      client.sftp((err, sftp) => {
        if (err) {
          logger.error('Failed to create SFTP session', { error: err.message });
          return reject(err);
        }
        logger.debug('SFTP session created');
        resolve(sftp);
      });
    });
  }

  /**
   * Disconnect from remote server
   * @param {string} connectionKey - Connection identifier
   */
  disconnect(connectionKey) {
    const client = this.connections.get(connectionKey);
    if (client) {
      client.end();
      this.connections.delete(connectionKey);
      logger.info('Connection closed', { connectionKey });
    }
  }

  /**
   * Disconnect all connections
   */
  disconnectAll() {
    for (const [key, client] of this.connections) {
      client.end();
      logger.info('Connection closed', { connectionKey: key });
    }
    this.connections.clear();
  }

  /**
   * Get connection key from options
   * @param {Object} options - Connection options
   * @returns {string}
   */
  getConnectionKey(options) {
    const { host, port = 22, username } = options;
    return `${username}@${host}:${port}`;
  }
}

export default SSHConnectionManager;
