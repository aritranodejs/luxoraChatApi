const crypto = require('crypto');

/**
 * Generate a random encryption key
 * @returns {string} The base64 encoded encryption key
 */
const generateEncryptionKey = () => {
  // Generate a random 256-bit (32-byte) key
  const key = crypto.randomBytes(32);
  return key.toString('base64');
};

/**
 * Encrypt a message using AES-256-GCM
 * @param {string} message - The message to encrypt
 * @param {string} key - The base64 encoded encryption key
 * @returns {string} The encrypted message in format: iv:authTag:ciphertext (all base64 encoded)
 */
const encryptMessage = (message, key) => {
  // Convert key from base64 to Buffer
  const keyBuffer = Buffer.from(key, 'base64');
  
  // Generate a random initialization vector
  const iv = crypto.randomBytes(16);
  
  // Create cipher
  const cipher = crypto.createCipheriv('aes-256-gcm', keyBuffer, iv);
  
  // Encrypt the message
  let encrypted = cipher.update(message, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  
  // Get the auth tag
  const authTag = cipher.getAuthTag().toString('base64');
  
  // Return IV, auth tag and encrypted message
  return `${iv.toString('base64')}:${authTag}:${encrypted}`;
};

/**
 * Decrypt a message using AES-256-GCM
 * @param {string} encryptedMessage - The encrypted message in format: iv:authTag:ciphertext
 * @param {string} key - The base64 encoded encryption key
 * @returns {string} The decrypted message
 * @throws {Error} If decryption fails
 */
const decryptMessage = (encryptedMessage, key) => {
  try {
    // Split the encrypted message into its components
    const [ivBase64, authTagBase64, ciphertext] = encryptedMessage.split(':');
    
    // Convert from base64
    const iv = Buffer.from(ivBase64, 'base64');
    const authTag = Buffer.from(authTagBase64, 'base64');
    const keyBuffer = Buffer.from(key, 'base64');
    
    // Create decipher
    const decipher = crypto.createDecipheriv('aes-256-gcm', keyBuffer, iv);
    decipher.setAuthTag(authTag);
    
    // Decrypt the message
    let decrypted = decipher.update(ciphertext, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    throw new Error(`Decryption failed: ${error.message}`);
  }
};

/**
 * Securely encrypt the shared key with user's public key
 * @param {string} sharedKey - The shared key to encrypt
 * @param {string} publicKey - The user's public key (PEM format)
 * @returns {string} The encrypted key
 */
const encryptKeyForUser = (sharedKey, publicKey) => {
  const encrypted = crypto.publicEncrypt(
    {
      key: publicKey,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256'
    },
    Buffer.from(sharedKey)
  );
  return encrypted.toString('base64');
};

/**
 * Decrypt the shared key using user's private key
 * @param {string} encryptedKey - The encrypted shared key
 * @param {string} privateKey - The user's private key (PEM format)
 * @returns {string} The decrypted shared key
 */
const decryptKeyWithPrivateKey = (encryptedKey, privateKey) => {
  const decrypted = crypto.privateDecrypt(
    {
      key: privateKey,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256'
    },
    Buffer.from(encryptedKey, 'base64')
  );
  return decrypted.toString();
};

module.exports = {
  generateEncryptionKey,
  encryptMessage,
  decryptMessage,
  encryptKeyForUser,
  decryptKeyWithPrivateKey
}; 