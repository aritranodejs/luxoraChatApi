const { response } = require('../../../helpers/response');
const { Op } = require('sequelize');
const { User } = require('../../../models/User');

const index = async (req, res) => {
    try {
        const {
            id
        } = req.query;

        const users = await User.findAll({
            where: {
                ...id ? { id: { [Op.ne]: id } } : {},
                status: 'active',
                role: 'user'
            },
            attributes: {
                exclude: ['password']
            }
        });

        return response(res, users, 'Global Users list.', 200);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}

module.exports = {
    index
}