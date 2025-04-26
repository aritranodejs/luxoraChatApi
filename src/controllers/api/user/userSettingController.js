const { response } = require('../../../utils/response.utils');
const { UserSetting } = require('../../../models/UserSetting');
const { Setting } = require('../../../models/Setting');

const index = async (req, res) => {
    try {
        const {
            userId
        } = req.user;

        const userSettings = await UserSetting.findAll({
            where: {
                userId
            },
            include: [
                {
                    model: Setting,
                    as: 'userSettings'
                }
            ]
        });

        return response(res, userSettings, 'User settings fetched successfully.', 200);
    } catch (error) {
        return response(res, {}, error.message, 500);
    }
}

const update = async (req, res) => {
    try {
        const {
            userId
        } = req.user;

        const {
            settingId,
            value
        } = req.body;

        let userSetting = await UserSetting.findOne({
            where: {
                userId,
                settingId
            }
        });

        if (!userSetting) {
            userSetting = await UserSetting.create({
                userId,
                settingId,
                value
            });
        } else {
            userSetting.value = value;
            await userSetting.save();
        }
        
        return response(res, userSetting, 'User setting updated successfully.', 200);
    } catch (error) {
        return response(res, {}, error.message, 500);
    }
}

module.exports = {
    index,
    update
}

