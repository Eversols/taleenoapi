const { MediaWishlist, Media } = require('../models'); // Assuming Sequelize model exists
const { sendJson } = require('../utils/helpers');

exports.getAllWishlist = async (req, res) => {
  try {
    const wishlist = await MediaWishlist.findAll({
      where: { user_id: req.user.id },
      attributes: ['id', 'user_id', 'media_id', 'created_at'],
      include: [
        {
          model: Media,
          as: 'media',
          attributes: ['id', 'title', 'description', 'fileUrl', 'type']
        }
      ]
    });

    return res.status(200).json(
      sendJson(true, 'Wishlist retrieved successfully', {
        wishlist
      })
    );
  } catch (error) {
    return res.status(500).json(
      sendJson(false, 'Failed to retrieve wishlist', {
        error: error.message
      })
    );
  }
};

exports.getWishlistById = async (req, res) => {
  try {
    const wishlistItem = await MediaWishlist.findByPk(req.params.id, {
      include: [
        {
          model: Media,
          as: 'media',
          attributes: ['id', 'title', 'description', 'fileUrl', 'type']
        }
      ]
    });

    if (!wishlistItem) {
      return res.status(404).json(sendJson(false, 'Wishlist item not found'));
    }

    return res.status(200).json(
      sendJson(true, 'Wishlist item retrieved successfully', { wishlistItem })
    );
  } catch (error) {
    return res.status(500).json(
      sendJson(false, 'Failed to retrieve wishlist item', {
        error: error.message
      })
    );
  }
};

exports.addWishlist = async (req, res) => {
  try {
    const { media_id } = req.body;

    if (!media_id) {
      return res.status(400).json(sendJson(false, 'media_id is required'));
    }

    const newWishlist = await MediaWishlist.create({
      user_id: req.user.id,
      media_id
    });

    return res.status(201).json(
      sendJson(true, 'Added to wishlist', { wishlist: newWishlist })
    );
  } catch (error) {
    return res.status(500).json(
      sendJson(false, 'Failed to add wishlist item', {
        error: error.message
      })
    );
  }
};

exports.deleteWishlist = async (req, res) => {
  try {
    const wishlistItem = await MediaWishlist.findByPk(req.params.id);

    if (!wishlistItem) {
      return res.status(404).json(sendJson(false, 'Wishlist item not found'));
    }

    if (wishlistItem.user_id !== req.user.id) {
      return res.status(403).json(sendJson(false, 'Unauthorized to delete this wishlist item'));
    }

    await wishlistItem.destroy();

    return res.status(200).json(sendJson(true, 'Wishlist item removed'));
  } catch (error) {
    return res.status(500).json(
      sendJson(false, 'Failed to delete wishlist item', {
        error: error.message
      })
    );
  }
};
