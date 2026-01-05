import { KeyManager } from '../src/ssh/KeyManager.js';

const keyManager = new KeyManager();

try {
  const { publicKey, privateKey } = await keyManager.generateKeyPair('test.example.com');
  
  console.log('Public Key:');
  console.log(publicKey);
  console.log('\nStarts with ssh-ed25519:', publicKey.startsWith('ssh-ed25519'));
  console.log('\nPrivate Key (first 50 chars):');
  console.log(privateKey.substring(0, 50));
  console.log('\nContains BEGIN PRIVATE KEY:', privateKey.includes('BEGIN PRIVATE KEY'));
} catch (error) {
  console.error('Error:', error.message);
  console.error(error.stack);
}
