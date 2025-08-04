const { User, Talent, Review, Like, Booking, Message } = require('../models');

exports.getFeed = async (req, res) => {
  try {
    const users = await User.findAll({
      where: { role: 'talent' },
      include: [
        {
          association: 'talent',
          attributes: ['full_name', 'city', 'country', 'profile_photo', 'video_url', 'main_talent']
        },
        {
          association: 'reviewsReceived', // if you're counting reviews
          attributes: []
        },
        {
          association: 'sentMessages', // if you're counting messages
          attributes: []
        }
        // Add other includes if needed
      ]
    });
    const BASE_URL = process.env.APP_URL;

    const feed = users.map(user => ({
      id: user.id,
      username: user.username,
      city: user.talent?.city || null,
      country: user.talent?.country || null,
      profile_photo: `${BASE_URL}${user.talent?.profile_photo}` || null,
      video_url: user.talent?.video_url || null,
      main_talent: user.talent?.main_talent || null,
      full_name: user.talent?.full_name || null,
      likes: user.likes?.count || 0,        // use optional chaining or fallback
      comments: user.comments?.count || 0,
      messages: user.messages?.count || 0,
      rating: user.rating || 5.0            // default to 5.0 if needed
    }));

    res.status(200).json({ success: true, feed });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
