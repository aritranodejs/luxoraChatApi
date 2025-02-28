const { User } = require('./User');
const { Friend } = require('./Friend');

// User Relationship
User.hasMany(Friend, {
    foreignKey: 'senderId',
    as: 'sender'
});
User.hasMany(Friend, {
    foreignKey: 'receiverId',
    as: 'receiver'
});

// Friend Relationship
Friend.belongsTo(User, {
    foreignKey: 'senderId',
    as: 'sender'
});
Friend.belongsTo(User, {
    foreignKey: 'receiverId',
    as: 'receiver'
});

