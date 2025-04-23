/**
 * Slug generation utilities for URL-friendly identifiers
 */

const { User } = require('../models/User');
const slugify = require('slugify');

/**
 * Generates a URL-friendly slug from a string
 * @param {string} text - The text to convert to slug
 * @returns {string} - The generated slug
 */
const generateSlug = (text) => {
    return slugify(text, {
        lower: true,
        strict: true,
        remove: /[*+~.()'"!:@]/g
    });
};

/**
 * Generates a unique slug by checking if it exists in the database
 * @param {string} name - The name to generate slug from
 * @returns {Promise<string>} - The unique slug
 */
const generateUniqueSlug = async (name) => {
    let baseSlug = generateSlug(name);
    let slug = baseSlug;
    let counter = 1;

    // Check if slug exists in database
    while (true) {
        const existingUser = await User.findOne({ where: { slug } });
        if (!existingUser) {
            break;
        }
        slug = `${baseSlug}-${counter}`;
        counter++;
    }

    return slug;
};

module.exports = {
    generateSlug,
    generateUniqueSlug
}; 