const { EncryptionKey } = require('../models/Encryption');
const { generateEncryptionKey } = require('../helpers/encryptionHelper');
const { Op } = require('sequelize');

class EncryptionKeyService {
  /**
   * Generate or retrieve an encryption key for a user-friend pair
   * @param {number} userId - The user ID
   * @param {number} friendId - The friend ID
   * @returns {Promise<string>} The encryption key
   */
  async getOrCreateEncryptionKey(userId, friendId) {
    // Always ensure userId is the smaller of the two IDs to maintain consistency
    let actualUserId = userId;
    let actualFriendId = friendId;
    
    if (userId > friendId) {
      actualUserId = friendId;
      actualFriendId = userId;
    }
    
    // Try to find existing key
    let keyRecord = await EncryptionKey.findOne({
      where: {
        userId: actualUserId,
        friendId: actualFriendId
      }
    });
    
    // If no key exists, create a new one
    if (!keyRecord) {
      const newKey = generateEncryptionKey();
      
      keyRecord = await EncryptionKey.create({
        userId: actualUserId,
        friendId: actualFriendId,
        encryptedKey: newKey
      });
    }
    
    return keyRecord.encryptedKey;
  }
  
  /**
   * Get the encryption key for a user-friend pair
   * @param {number} userId - The user ID
   * @param {number} friendId - The friend ID
   * @returns {Promise<string|null>} The encryption key or null if not found
   */
  async getEncryptionKey(userId, friendId) {
    // Always ensure userId is the smaller of the two IDs to maintain consistency
    let actualUserId = userId;
    let actualFriendId = friendId;
    
    if (userId > friendId) {
      actualUserId = friendId;
      actualFriendId = userId;
    }
    
    const keyRecord = await EncryptionKey.findOne({
      where: {
        userId: actualUserId,
        friendId: actualFriendId
      }
    });
    
    return keyRecord ? keyRecord.encryptedKey : null;
  }
  
  /**
   * Get all encryption keys for a user
   * @param {number} userId - The user ID
   * @returns {Promise<Array>} Array of encryption key records
   */
  async getAllKeysForUser(userId) {
    return await EncryptionKey.findAll({
      where: {
        [Op.or]: [
          { userId },
          { friendId: userId }
        ]
      }
    });
  }
}

module.exports = new EncryptionKeyService(); 