import { generateKeyPairSync } from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { Client } from 'ssh2';
import config from '../config.js';
import logger from '../utils/logger.js';

/**
 * Manages SSH key generation, storage, and deployment
 */
export class KeyManager {
  constructor() {
    this.keysDir = config.keysDir;
  }

  /**
   * Ensure keys directory exists
   */
  async ensureKeysDir() {
    try {
      await fs.mkdir(this.keysDir, { recursive: true });
      logger.debug('Keys directory ensured', { path: this.keysDir });
    } catch (error) {
      logger.error('Failed to create keys directory', { error: error.message });
      throw error;
    }
  }

  /**
   * Generate SSH key pair (ED25519)
   * @param {string} host - Remote host identifier
   * @returns {Promise<{publicKey: string, privateKey: string}>}
   */
  async generateKeyPair(host) {
    logger.info('Generating SSH key pair', { host, type: config.keyGen.type });

    try {
      const { publicKey, privateKey } = generateKeyPairSync('ed25519', {
        publicKeyEncoding: {
          type: 'spki',
          format: 'der'
        },
        privateKeyEncoding: {
          type: 'pkcs8',
          format: 'pem'
        }
      });

      // Convert public key to OpenSSH format
      const publicKeySSH = this.convertToOpenSSHFormat(publicKey, host);

      logger.info('Key pair generated successfully', { host });
      return { publicKey: publicKeySSH, privateKey };
    } catch (error) {
      logger.error('Failed to generate key pair', { error: error.message });
      throw error;
    }
  }

  /**
   * Convert DER public key to OpenSSH format
   * @param {Buffer} derKey - DER formatted public key
   * @param {string} host - Host identifier for comment
   * @returns {string} OpenSSH formatted public key
   */
  convertToOpenSSHFormat(derKey, host) {
    // ED25519 public key in DER format has a specific structure
    // For ED25519, the actual key is the last 32 bytes of the DER encoding
    // DER structure: SEQUENCE { SEQUENCE { OID }, BIT STRING { key } }
    
    // Extract the raw 32-byte public key from DER
    // The key starts after the DER header (typically at offset 12)
    const keyStart = derKey.length - 32;
    const rawPublicKey = derKey.slice(keyStart);
    
    // OpenSSH format for ED25519:
    // "ssh-ed25519" + space + base64(length + type + length + key) + space + comment
    const keyType = 'ssh-ed25519';
    const keyTypeBytes = Buffer.from(keyType);
    
    // Build the SSH wire format
    const sshWireFormat = Buffer.concat([
      // Key type length (4 bytes, big-endian)
      Buffer.from([0, 0, 0, keyTypeBytes.length]),
      // Key type string
      keyTypeBytes,
      // Public key length (4 bytes, big-endian)
      Buffer.from([0, 0, 0, 32]),
      // Public key (32 bytes)
      rawPublicKey
    ]);
    
    const base64Key = sshWireFormat.toString('base64');
    const comment = `${config.keyGen.comment}@${host}`;
    
    return `${keyType} ${base64Key} ${comment}`;
  }

  /**
   * Store private key to filesystem
   * @param {string} host - Remote host identifier
   * @param {string} privateKey - Private key content
   */
  async storePrivateKey(host, privateKey) {
    await this.ensureKeysDir();
    
    const keyPath = this.getPrivateKeyPath(host);
    
    try {
      await fs.writeFile(keyPath, privateKey, { mode: 0o600 });
      logger.info('Private key stored', { path: keyPath });
    } catch (error) {
      logger.error('Failed to store private key', { error: error.message });
      throw error;
    }
  }

  /**
   * Load private key from filesystem
   * @param {string} host - Remote host identifier
   * @returns {Promise<string|null>} Private key content or null if not found
   */
  async loadPrivateKey(host) {
    const keyPath = this.getPrivateKeyPath(host);
    
    try {
      const privateKey = await fs.readFile(keyPath, 'utf8');
      logger.debug('Private key loaded', { path: keyPath });
      return privateKey;
    } catch (error) {
      if (error.code === 'ENOENT') {
        logger.debug('Private key not found', { path: keyPath });
        return null;
      }
      logger.error('Failed to load private key', { error: error.message });
      throw error;
    }
  }

  /**
   * Check if key exists for host
   * @param {string} host - Remote host identifier
   * @returns {Promise<boolean>}
   */
  async hasKey(host) {
    const key = await this.loadPrivateKey(host);
    return key !== null;
  }

  /**
   * Deploy public key to remote server
   * @param {Client} sshClient - Active SSH connection
   * @param {string} publicKey - Public key to deploy
   */
  async deployPublicKey(sshClient, publicKey) {
    return new Promise((resolve, reject) => {
      logger.info('Deploying public key to remote server');

      const commands = [
        'mkdir -p ~/.ssh',
        'chmod 700 ~/.ssh',
        `echo '${publicKey}' >> ~/.ssh/authorized_keys`,
        'chmod 600 ~/.ssh/authorized_keys',
        // Remove duplicate keys
        'awk \'!seen[$0]++\' ~/.ssh/authorized_keys > ~/.ssh/authorized_keys.tmp && mv ~/.ssh/authorized_keys.tmp ~/.ssh/authorized_keys'
      ];

      const command = commands.join(' && ');

      sshClient.exec(command, (err, stream) => {
        if (err) {
          logger.error('Failed to execute key deployment command', { error: err.message });
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
          if (code !== 0) {
            logger.error('Key deployment failed', { code, stderr });
            return reject(new Error(`Key deployment failed with code ${code}: ${stderr}`));
          }
          logger.info('Public key deployed successfully');
          resolve();
        });
      });
    });
  }

  /**
   * Get private key file path for host
   * @param {string} host - Remote host identifier
   * @returns {string}
   */
  getPrivateKeyPath(host) {
    const sanitizedHost = host.replace(/[^a-zA-Z0-9.-]/g, '_');
    return path.join(this.keysDir, `id_ed25519_${sanitizedHost}`);
  }

  /**
   * Delete key for host
   * @param {string} host - Remote host identifier
   */
  async deleteKey(host) {
    const keyPath = this.getPrivateKeyPath(host);
    
    try {
      await fs.unlink(keyPath);
      logger.info('Private key deleted', { path: keyPath });
    } catch (error) {
      if (error.code !== 'ENOENT') {
        logger.error('Failed to delete private key', { error: error.message });
        throw error;
      }
    }
  }
}

export default KeyManager;
