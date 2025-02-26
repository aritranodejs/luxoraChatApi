const response = (res, data = [], message = 'success', status = 200) => {
    return res.status(status).json({
        success: status === 200,
        message,
        data,
    });
};

module.exports = {
    response
};