const { Setting } = require('../../../models/Setting');
const { response } = require('../../../utils/response.utils');

const show = async (req, res) => {
    try {
        const {
            key
        } = req.params;

        const setting = await Setting.findOne({
            where: {
                key,
                isForUser: true
            }
        });

        if (!setting) {
            return response(res, {}, 'Setting not found.', 404);
        }

        return response(res, setting, 'Setting fetched successfully.', 200);
        
    } catch (error) {
        return response(res, {}, error.message, 500);
    }
}

module.exports = {
    show
}
