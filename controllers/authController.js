const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const { PutObjectCommand } = require("@aws-sdk/client-s3");
const s3 = require("../config/s3");
const { User, Talent, Client,TalentAvailability, Follow , Skill,Block,Media,Booking,Review,Like,BookingSlot,Country,sequelize} = require('../models');
const { generateOTP, sendJson } = require('../utils/helpers');

const { Taqnyat } = require("../services/Taqnyat");
const path = require("path");
const fs = require("fs");

const smsClient = new Taqnyat(
  process.env.TAQNYAT_TOKEN,
  process.env.TAQNYAT_SENDER
);

exports.register = async (req, res) => {
  try {
    const { username, phone_number, role ,availability,player_id} = req.body;

    if (!username || !phone_number || !player_id) {
      return res.status(400).json(
        sendJson(false, 'Username , player_id and phone number are required.')
      );
    }

    // Always generate full name from username
    const usernameParts = (username || "").trim().split(/[\._]/);
    const full_name = usernameParts
      .filter(p => p.length > 0)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');

    if (!full_name || full_name.trim() === '') {
      return res.status(400).json(
        sendJson(false, 'Full name is required. Please provide a valid username.')
      );
    }

    // Check for existing username or phone number
    const existingUser = await User.findOne({
      where: {
        [Op.or]: [
          { username },
          { phone_number } 
        ]
      }
    });

    if (existingUser) {
      return res.status(400).json(
        sendJson(false, 'Username or phone number already exists.')
      );
    }

    // Set default email and password
    const defaultEmail = `${username}@gmail.com`;
    const defaultPassword = await bcrypt.hash('123456', 10);

    const user = await User.create({
      username,
      phone_number,
      email: defaultEmail,
      password: defaultPassword,
      status: "approved",
      role: role || 'client',
      player_id,
      availability
    });

    // Generate OTP
    const otp = "1234"; // keep your existing logic
    const otpExpire = new Date(Date.now() + 10 * 60 * 1000);

    await user.update({
      verification_code: otp,
      verification_code_expire: otpExpire
    });

    // Create Talent or Client with full_name
    if (role === 'talent') {
      await Talent.create({
        user_id: user.id,
        full_name
      });
    } else {
      await Client.create({
        user_id: user.id,
        full_name
      });
    }

    return res.status(201).json(
      sendJson(true, 'OTP sent to your phone number.', {
        phone_last_4: phone_number.slice(-4),
        otp,
        user_id: user.id
      })
    );
  } catch (error) {
    console.error(error);
    return res.status(500).json(
      sendJson(false, 'Server error', {
        error: error.message
      })
    );
  }
};

// Verify OTP and complete registration
exports.verifyOTP = async (req, res) => {
  try {
    const { phone_number, code } = req.body;

  
      if (!phone_number || !code) {
        return res.status(400).json(
          sendJson(false, "phone_number and code are required")
        );
      }

      let user;

      // Master / bypass OTP

      console.log("Verifying OTP code:", code);
      if (code == '0000') {
         user = await User.findOne({
            where: {
              phone_number 
            },
            include: [
              {
                association: 'talent',
                attributes: { exclude: ['user_id', 'createdAt', 'updatedAt'] }
              },
              {
                association: 'client',
                attributes: { exclude: ['user_id', 'createdAt', 'updatedAt'] }
              }
            ]
          });
      } else {
         user = await User.findOne({
            where: {
              phone_number,
              verification_code: code,
              verification_code_expire: { [Op.gt]: new Date() }
            },
            include: [
              {
                association: 'talent',
                attributes: { exclude: ['user_id', 'createdAt', 'updatedAt'] }
              },
              {
                association: 'client',
                attributes: { exclude: ['user_id', 'createdAt', 'updatedAt'] }
              }
            ]
          });
      }


    if (!user) {
      return res.status(400).json({ status: false, message: 'Invalid or expired OTP' });
    }
    if (user.deletedAt) {
      return res.status(400).json({ status: false, message: 'Unable to login: User is deleted' });
    }
    switch (user.status) {
      case 'pending':
        return res.status(403).json(
          sendJson(false, 'Your account is pending approval')
        );
      case 'rejected':
        return res.status(403).json(
          sendJson(false, 'Your account has been rejected')
        );
      case 'blocked':
        return res.status(403).json(
          sendJson(false, 'Your account has been blocked. Please contact support')
        );
      case 'approved':
      default:
        // allow access
        break;
    }
    // mark verified
    await user.update({
      is_verified: true,
      verification_code: null,
      verification_code_expire: null
    });

    // counts
    const [followersCount, followingsCount] = await Promise.all([
      Follow.count({ where: { followingId: user.id } }),
      Follow.count({ where: { followerId: user.id } })
    ]);

    // token
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRE
    });

    // 👉 Fetch all skills dictionary
    const allSkills = await Skill.findAll({ attributes: ['id', 'name'] });
    const skillsMap = allSkills.reduce((acc, s) => {
      acc[s.id] = s.name;
      return acc;
    }, {});

    // 👉 Attach skill names to talent
    let talentData = null;
    if (user.role === 'talent' && user.talent) {
      const mappedSkills = (user.talent.skills || []).map(s => ({
        id: s.id,
        name: skillsMap[s.id] || null,
        rate: s.rate
      }));

      let parsedAvailability = null;
      try {
        parsedAvailability = user.talent.availability ? JSON.parse(user.talent.availability) : null;
      } catch (err) {
        parsedAvailability = null;
      }

      talentData = {
        ...user.talent.toJSON(),
        skills: mappedSkills,
        availability: parsedAvailability
      };
    }
    const BASE_URL = process.env.APP_URL?.replace(/\/$/, '') || '';
    // response
    const userData = {
      token,
      id: user.id,
      username: user.username,
      phone_number: user.phone_number,
      email: user.email,
      role: user.role,
      is_verified: user.is_verified,
      on_board: user.on_board,
      notification_alert: user.notification_alert,
      availability: user.availability,
      followers: followersCount,
      followings: followingsCount,
      userInfo: user.role === "talent"
        ? {
            ...talentData,
            profile_photo: talentData?.profile_photo
              ? `${talentData.profile_photo}`
              : null
          }
        : user.client
          ? {
              ...user.client.toJSON(),
              profile_photo: user.client.profile_photo
                ? `${user.client.profile_photo}`
                : null
            }
          : null
    };

    return res.status(201).json({
      status: true,
      message: 'Successfully verified',
      data: userData
    });

  } catch (error) {
    console.error('OTP verification error:', error);
    return res.status(500).json({
      status: false,
      message: 'Server error during verification',
      error: error.message
    });
  }
};



// Login with phone number (send OTP)
exports.loginWithPhone = async (req, res) => {
  try {
    const { phone_number , player_id} = req.body;

    const user = await User.findOne({ where: { 
        phone_number: phone_number
      } });

    if (!user) {
      return res.status(404).json(
        sendJson(false, 'User not found')
      );
    }
    if (user.deleted_at) {
      return res.status(400).json({ status: false, message: 'Unable to login: User is deleted' });
    }
    switch (user.status) {
      case 'pending':
        return res.status(403).json(
          sendJson(false, 'Your account is pending approval')
        );
      case 'rejected':
        return res.status(403).json(
          sendJson(false, 'Your account has been rejected')
        );
      case 'blocked':
        return res.status(403).json(
          sendJson(false, 'Your account has been blocked. Please contact support')
        );
      case 'approved':
      default:
        // allow access
        break;
    }
    // Generate OTP
     const otp = generateOTP();
    //const otp = "1234";
    const otpExpire = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await user.update({
      verification_code: otp,
      verification_code_expire: otpExpire,
      player_id: player_id || null
    });
 

    // -------- PHONE FORMATTING --------
    let formattedPhone = phone_number.replace(/\D/g, '');

    if (!formattedPhone.startsWith('966')) {
      formattedPhone = '966' + formattedPhone.replace(/^0/, '');
    }

    formattedPhone = '+' + formattedPhone;

   

    // -------- SEND SMS --------
    const smsMessage = `Your verification code is ${otp}. It will expire in 10 minutes.`;

    const smsResponse = await smsClient.sendSMS(
      smsMessage,
      formattedPhone,
      null
    );

    console.log("Formatted Phone:", formattedPhone);
    console.log("SMS Response:", smsResponse);

    if (!smsResponse || smsResponse.status === "failed") {
      return res.status(500).json(
        sendJson(false, "Failed to send OTP SMS")
      );
    }

    return res.status(200).json(
      sendJson(true, 'OTP sent to your phone number', {
        phone_number: formattedPhone.slice(-4), // Show last 4 digits for confirmation
        code: user.verification_code
      })
    );
  } catch (error) {
    return res.status(500).json(
      sendJson(false, 'Server error', {
        error: error.message
      })
    );
  }
};

// Verify OTP for login
exports.verifyLoginOTP = async (req, res) => {
  try {
    const { phone_number, code } = req.body;

    const user = await User.findOne({
      where: {
        phone_number,
        verification_code: code,
        verification_code_expire: {
          [Op.gt]: new Date()
        }
      }
    });

    if (!user) {
      return res.status(400).json(
        sendJson(false, 'Invalid or expired OTP')
      );
    }
    if (user.deleted_at) {
      return res.status(400).json({ status: false, message: 'Unable to login: User is deleted' });
    }
    switch (user.status) {
      case 'pending':
        return res.status(403).json(
          sendJson(false, 'Your account is pending approval')
        );
      case 'rejected':
        return res.status(403).json(
          sendJson(false, 'Your account has been rejected')
        );
      case 'blocked':
        return res.status(403).json(
          sendJson(false, 'Your account has been blocked. Please contact support')
        );
      case 'approved':
      default:
        // allow access
        break;
    }
    // Clear OTP
    await user.update({
      verification_code: null,
      verification_code_expire: null
    });

    // Generate JWT token
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRE
    });

    return res.status(200).json(
      sendJson(true, 'Login successful', {
        token,
        user: {
          id: user.id,
          username: user.username,
          phone_number: user.phone_number,
          role: user.role,
           player_id: user.player_id,
          is_verified: user.is_verified
        }
      })
    );
  } catch (error) {
    console.error(error);
    return res.status(500).json(
      sendJson(false, 'Server error', {
        error: error.message
      })
    );
  }
};

// Resend OTP
exports.resendOTP = async (req, res) => {
  try {
    const { phone_number } = req.body;

    const user = await User.findOne({ where: { phone_number } });

    if (!user) {
      return res.status(404).json(
        sendJson(false, 'User not found')
      );
    }
    if (user.deleted_at) {
      return res.status(400).json({ status: false, message: 'Unable to login: User is deleted' });
    }
    switch (user.status) {
      case 'pending':
        return res.status(403).json(
          sendJson(false, 'Your account is pending approval')
        );
      case 'rejected':
        return res.status(403).json(
          sendJson(false, 'Your account has been rejected')
        );
      case 'blocked':
        return res.status(403).json(
          sendJson(false, 'Your account has been blocked. Please contact support')
        );
      case 'approved':
      default:
        // allow access
        break;
    }
    // Generate new OTP
    // const otp = generateOTP();
    const otp = "1234";
    const otpExpire = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await user.update({
      verification_code: otp,
      verification_code_expire: otpExpire
    });

    return res.status(200).json(
      sendJson(true, 'New OTP sent to your phone number', {
        phone_number: phone_number.slice(-4)
      })
    );
  } catch (error) {
    console.error(error);
    return res.status(500).json(
      sendJson(false, 'Server error', {
        error: error.message
      })
    );
  }
};

// Get current user
exports.getMe = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password', 'verification_code', 'verification_code_expire'] },
      include: [
        {
          association: req.user.role === 'talent' ? 'talent' : 'client',
          attributes: { exclude: ['user_id', 'deleted_at'] }
        }
      ]
    });

    if (!user) {
      return res.status(404).json(
        sendJson(false, 'User not found')
      );
    }
    if (user.deleted_at) {
      return res.status(400).json({ status: false, message: 'Unable to login: User is deleted' });
    }
    switch (user.status) {
      case 'pending':
        return res.status(403).json(
          sendJson(false, 'Your account is pending approval')
        );
      case 'rejected':
        return res.status(403).json(
          sendJson(false, 'Your account has been rejected')
        );
      case 'blocked':
        return res.status(403).json(
          sendJson(false, 'Your account has been blocked. Please contact support')
        );
      case 'approved':
      default:
        // allow access
        break;
    }
    return res.status(200).json(
      sendJson(true, 'User retrieved successfully', {
        user
      })
    );
  } catch (error) {
    console.error(error);
    return res.status(500).json(
      sendJson(false, 'Server error', {
        error: error.message
      })
    );
  }
};

// Update user profile
exports.updateProfile = async (req, res) => {
  try {
    const { 
      full_name, gender, age, country, location, nationality, city, 
      languages, hourly_rate, interests, availability, skills, about ,latitude, longitude
    } = req.body;

    const user = await User.findByPk(req.user.id, {
      include: [
        {
          association: req.user.role === 'talent' ? 'talent' : 'client'
        }
      ]
    });

    if (!user) {
      return res.status(404).json(sendJson(false, 'User not found'));
    }
    if (user.deleted_at) {
      return res.status(400).json({ status: false, message: 'Unable to login: User is deleted' });
    }
    switch (user.status) {
      case 'pending':
        return res.status(403).json(
          sendJson(false, 'Your account is pending approval')
        );
      case 'rejected':
        return res.status(403).json(
          sendJson(false, 'Your account has been rejected')
        );
      case 'blocked':
        return res.status(403).json(
          sendJson(false, 'Your account has been blocked. Please contact support')
        );
      case 'approved':
      default:
        // allow access
        break;
    }
    const BASE_URL = process.env.APP_URL?.replace(/\/$/, '') || '';
    let profile_photo = req.file?.filename ? `${BASE_URL}/uploads/${req.file.filename}` : null;
     await user.update({
            availability // <-- new line added safely
          });
    // Update based on role
        // Parse languages properly
    let parsedLanguages = [];

    if (Array.isArray(languages)) {
      // Case: ["1,2"] OR ["1","2"]
      parsedLanguages = languages
        .map(v => v.toString().split(",")) // split comma-separated values
        .flat()
        .map(v => v.trim())
        .filter(v => v !== "")
        .map(Number)
        .filter(v => !isNaN(v));
    } else if (typeof languages === "string") {
      // Case: "1,2"
      parsedLanguages = languages
        .split(",")
        .map(v => v.trim())
        .filter(v => v !== "")
        .map(Number);
    }

    // ✅ Validate location/country/city depending on role
    if (req.user.role === 'talent') {
      if (!country || !city) {
        return res.status(400).json(sendJson(false, 'Country and city are required for talent'));
      }
    } else if (req.user.role === 'client') {
      if (!location) {
        return res.status(400).json(sendJson(false, 'Location is required for client'));
      }
    }

    if (req.user.role === 'talent') {
      await user.talent.update({
        full_name,
        gender,
        age,
        country,
        city,
        languages:parsedLanguages,
        hourly_rate,
        skills,
        about,
        nationality,
        location,
        latitude,      // <-- ADD
        longitude      // <-- ADD
      });
    } else {
      await user.update({ on_board: 1 });
      await user.client.update({
        full_name,
        gender,
        age,
        country,
        city,
        interests,
        languages:parsedLanguages,
        about,
        nationality,
        location,
        latitude,      // <-- ADD
        longitude      // <-- ADD
      });
    }

    // Reload updated client/talent
    await user.reload({
      include: [
        {
          association: req.user.role === 'talent' ? 'talent' : 'client'
        }
      ]
    });

    // Prepare interests for response
    const talents = await Talent.findAll();
    const TalentsMap = {};
    talents.forEach(t => {
      TalentsMap[t.id] = t.full_name;
    });

    let clientInterests = [];
    if (req.user.role === 'client' && user.client?.interests) {
      const interestIds = Array.isArray(user.client.interests)
        ? user.client.interests
            .map(i => i.toString().split(','))
            .flat()
            .map(id => parseInt(id))
            .filter(id => !isNaN(id))
        : [];

      clientInterests = interestIds.map(id => ({
        id,
        name: TalentsMap[id] || null
      }));
    }

    // 👉 Fetch all skills dictionary
    const allSkills = await Skill.findAll({ attributes: ['id', 'name'] });
    const skillsMap = allSkills.reduce((acc, s) => {
      acc[s.id] = s.name;
      return acc;
    }, {});

// 👉 Attach skill names to talent
  let talentData = null;
    if (user.role === 'talent' && user.talent) {
      const mappedSkills = (user.talent.skills || []).map(s => ({
        id: s.id,
        name: skillsMap[s.id] || null,
        rate: s.rate
      }));

      let parsedAvailability = null;
      try {
        parsedAvailability = user.talent.availability ? JSON.parse(user.talent.availability) : null;
      } catch (err) {
        parsedAvailability = null;
      }

      talentData = {
        ...user.talent.toJSON(),
        skills: mappedSkills,
        availability: parsedAvailability
      };
    }


    const userData = user.toJSON();
    
    // ✅ Build unified userInfo
    let userInfo = req.user.role === 'talent' ? userData.talent : userData.client;
    if (req.user.role === 'client') userInfo.interests = clientInterests;
    if (req.user.role === 'talent') userInfo.skills = talentData;

    if (userInfo.country) {
      const countryRecord = await Country.findByPk(userInfo.country);
      userInfo.country = countryRecord ? countryRecord.name : null;
    }
    if (userInfo.nationality) {
      const nationalityRecord = await Country.findByPk(userInfo.nationality);
      userInfo.nationality = nationalityRecord ? nationalityRecord.name : null;
    }
    // ✅ Final shaped response
    const response = {
      id: userData.id,
      username: userData.username,
      phone_number: userData.phone_number,
      email: userData.email,
      role: userData.role,
      is_verified: userData.is_verified,
      on_board: userData.on_board,
      notification_alert: userData.notification_alert,
      followers: 0,   // replace with real DB count if needed
      followings: 1,  // replace with real DB count if needed
      availability: userData.availability,
      userInfo
    };

    return res.status(200).json(
      sendJson(true, 'Profile updated successfully', response)
    );
  } catch (error) {
    console.error(error);
     return res.status(500).json(
      sendJson(false, 'Server error', { error: error.message })
    );
  }
};
exports.updateTalentDetails = async (req, res) => {
  try {
    const { skills, experience_level, availability } = req.body;

    // Validate required fields
    if (!skills && !experience_level && !availability) {
      return res.status(400).json(
        sendJson(false, 'At least one field (skills, experience_level, or availability) is required for update')
      );
    }

    // Fetch talent with user data
    const user = await User.findByPk(req.user.id, {
      include: [{
        association: 'talent',
        attributes: ['id', 'skills', 'experience_level', 'availability']
      }],
      attributes: ['id', 'username', 'email']
    });
    
    if (!user || !user.talent) {
      return res.status(404).json(
        sendJson(false, 'Talent profile not found')
      );
    }

    // Prepare update data
    const updateData = {};
    if (experience_level) updateData.experience_level = experience_level;
    if (availability) updateData.availability = JSON.stringify(availability);

    // Update talent details
    await Talent.update(updateData, {
      where: { id: user.talent.id }
    });

    // Fetch updated talent data
    const updatedTalent = await Talent.findByPk(user.talent.id, {
      attributes: ['id', 'experience_level', 'availability'],
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'username', 'email']
      }]
    });
    await user.update({ on_board: 1 });
    // Parse availability if it exists
    const responseData = {
      ...updatedTalent.get({ plain: true }),
      availability: updatedTalent.availability ? JSON.parse(updatedTalent.availability) : null
    };

    return res.status(200).json(
      sendJson(true, 'Talent details updated successfully', {
        talent: responseData
      })
    );

  } catch (error) {
    console.error('Error updating talent details:', error);
    return res.status(500).json(
      sendJson(false, 'Failed to update talent details', {
        error: error.message
      })
    );
  }
};
exports.Setnotificationalert = async (req, res) => {
  try {
    // Fetch user by ID
    let user = await User.findByPk(req.user.id);
    const { notification_alert } = req.body;

    if (!user) {
      return res.status(404).json(
      sendJson(false, 'Talent profile not found',)
    );
    }

    // Toggle notification_alert
    const newAlertValue = notification_alert;
    await user.update({ notification_alert: newAlertValue });

    // Fetch updated user with full details and relations
    const updatedUser = await User.findOne({
      where: { id: user.id },
      include: [
        {
          model: Client,  // adjust according to your associations
          as: "client"
        },
        {
          model: Talent, // adjust according to your associations
          as: "talent"
        }
      ]
    });

     return res.status(200).json(
      sendJson(true, 'Talent details updated successfully', {
         data: updatedUser
      })
    );


  } catch (error) {
    return res.status(500).json(
      sendJson(false, 'Failed to update talent details',)
    );
  }
};

// Delete User API
exports.deleteUser = async (req, res) => {
  try {
    const { userId } = req.body;

    // Find user with relations
    const user = await User.findByPk(userId, {
      include: [
        { model: Talent, as: 'talent' },
        { model: Client, as: 'client' }
      ]
    });

    if (!user) {
      return res.status(404).json(
        sendJson(false, 'User not found')
      );
    }

    // Delete associated talent/client
    if (user.role === 'talent' && user.talent) {
      await user.talent.destroy({ force: true });
    } else if (user.role === 'client' && user.client) {
      await user.client.destroy({ force: true });
    }

    // Finally delete the user itself
    await user.destroy({ force: true });

    return res.status(200).json(
      sendJson(true, 'User deleted successfully')
    );
  } catch (error) {
    console.error('Error deleting user:', error);
    return res.status(500).json(
      sendJson(false, 'Failed to delete user', {
        error: error.message
      })
    );
  }
};

// Block or Unblock User API
exports.blockUser = async (req, res) => {
  try {
    const { user_id } = req.body;   // 👈 user being blocked/unblocked
    const blockerId = req.user.id;  // 👈 current logged-in user (admin or talent/client)

    const user = await User.findByPk(user_id);
    if (!user) {
      return res.status(404).json(sendJson(false, 'User not found'));
    }

    // Check if block already exists
    const existingBlock = await Block.findOne({
      where: { blocker_id: blockerId, blocked_id: user_id }
    });

    if (existingBlock) {
      // ✅ Unblock
      await existingBlock.destroy();
      await user.update({ is_blocked: 0 });

      return res.status(200).json(
        sendJson(true, 'User unblocked successfully', {
          user_id: user.id,
          is_blocked: 0
        })
      );
    } else {
      // ✅ Block
      await Block.create({
        blocker_id: blockerId,
        blocked_id: user_id
      });
      await user.update({ is_blocked: 1 });

      return res.status(200).json(
        sendJson(true, 'User blocked successfully', {
          user_id: user.id,
          is_blocked: 1
        })
      );
    }
  } catch (error) {
    console.error('Error blocking user:', error);
    return res.status(500).json(
      sendJson(false, 'Failed to block/unblock user', {
        error: error.message
      })
    );
  }
};
exports.uploadProfileImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json(sendJson(false, "No image uploaded"));
    }

    const file = req.file; // ✅ Changed from req.profile_photo to req.file

    const fileKey = `uploads/${Date.now()}-${file.originalname}`;

    const params = {
      Bucket: process.env.AWS_BUCKET,
      Key: fileKey,
      Body: file.buffer,
      ContentType: file.mimetype,
    };

    await s3.send(new PutObjectCommand(params));

    // S3 URL
    const profile_photo = `https://${process.env.AWS_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileKey}`;

    // Save into DB
    const user = await User.findByPk(req.user.id, {
      include: [
        { association: req.user.role === "talent" ? "talent" : "client" },
      ],
    });

    if (!user) {
      return res.status(404).json(sendJson(false, "User not found"));
    }

    if (req.user.role === "talent") {
      await user.talent.update({ profile_photo });
    } else {
      await user.client.update({ profile_photo });
    }

    return res
      .status(200)
      .json(sendJson(true, "Profile photo updated successfully", { 
        profile_photo 
      }));
  } catch (error) {
    console.error("Profile image upload error:", error);
    return res
      .status(500)
      .json(sendJson(false, "Server error", { error: error.message }));
  }
};

// DELETE /api/talent/skills/:id
exports.deleteSkill = async (req, res) => {
  try {
    const skillId = parseInt(req.params.id);

    const talent = await Talent.findOne({ where: { user_id: req.user.id } });

    if (!talent) {
      return res.status(404).json(sendJson(false, "Talent not found"));
    }

    // Parse skills
    let skills = [];
    if (Array.isArray(talent.skills)) {
      skills = talent.skills;
    } else if (typeof talent.skills === "string") {
      try {
        skills = JSON.parse(talent.skills);
      } catch (e) {
        skills = [];
      }
    }

    // Filter skill by ID
    const updatedSkills = skills.filter(s => parseInt(s.id) !== skillId);

    // Save back
    await talent.update({ skills: updatedSkills });

    return res.status(200).json(
      sendJson(true, "Skill deleted successfully", { skills: updatedSkills })
    );
  } catch (error) {
    console.error("Delete skill error:", error);
    return res.status(500).json(
      sendJson(false, "Failed to delete skill", { error: error.message })
    );
  }
};
// DELETE /api/client/interests/:id
exports.deleteInterest = async (req, res) => {
  try {
    const interestId = parseInt(req.params.id);

    const client = await Client.findOne({ where: { user_id: req.user.id } });

    if (!client) {
      return res.status(404).json(sendJson(false, "Client not found"));
    }

    let interests = [];

    if (Array.isArray(client.interests)) {
      // Example: ["17,18"]
      interests = client.interests
        .map(i => i.toString().split(",")) // split "17,18" → ["17","18"]
        .flat()
        .map(i => parseInt(i))
        .filter(i => !isNaN(i));
    } else if (typeof client.interests === "string") {
      // Example: "17,18"
      interests = client.interests
        .split(",")
        .map(i => parseInt(i))
        .filter(i => !isNaN(i));
    }

    // Remove the one we want
    const updatedInterests = interests.filter(i => i !== interestId);

    // Save back in same format (string array with comma-separated values)
    const saveFormat = [updatedInterests.join(",")];

    await client.update({ interests: saveFormat });

    return res.status(200).json(
      sendJson(true, "Interest deleted successfully", { interests: saveFormat })
    );
  } catch (error) {
    console.error("Delete interest error:", error);
    return res.status(500).json(
      sendJson(false, "Failed to delete interest", { error: error.message })
    );
  }
};

// Get all clients with full details
exports.getAllClients = async (req, res) => {
  try {
    const BASE_URL = process.env.APP_URL?.replace(/\/$/, "") || "";

    // Fetch all users with role=client including their client info
    const clients = await User.findAll({
      where: { role: "client" },
      attributes: { exclude: ["password", "verification_code", "verification_code_expire"] },
      include: [
        {
          model: Client,
          as: "client",
          attributes: { exclude: ["user_id", "createdAt", "updatedAt", "deleted_at"] },
        },
      ],
      paranoid: false, // include soft-deleted users
    });

    if (!clients || clients.length === 0) {
      return res.status(404).json(sendJson(false, "No clients found"));
    }

    // Fetch all talents (for mapping interests → names)
    const talents = await Talent.findAll({ attributes: ["id", "full_name"] });
    const TalentsMap = {};
    talents.forEach((t) => {
      TalentsMap[t.id] = t.full_name;
    });

    // Shape response data
    const response = clients.map((u) => {
      const clientInfo = u.client ? u.client.toJSON() : {};

      // 👉 Parse interests
      let clientInterests = [];
      if (clientInfo.interests) {
        const interestIds = Array.isArray(clientInfo.interests)
          ? clientInfo.interests
              .map((i) => i.toString().split(","))
              .flat()
              .map((id) => parseInt(id))
              .filter((id) => !isNaN(id))
          : typeof clientInfo.interests === "string"
          ? clientInfo.interests
              .split(",")
              .map((id) => parseInt(id))
              .filter((id) => !isNaN(id))
          : [];

        clientInterests = interestIds.map((id) => ({
          id,
          name: TalentsMap[id] || null,
        }));
      }

      return {
        id: u.id,
        username: u.username,
        phone_number: u.phone_number,
        status: u.status,
        email: u.email,
        role: u.role,
        is_verified: u.is_verified,
        on_board: u.on_board,
        notification_alert: u.notification_alert,
        availability: u.availability,
        deleted_at: u.deleted_at,
        userInfo: {
          ...clientInfo,
          interests: clientInterests,
          profile_photo: clientInfo.profile_photo
            ? `${clientInfo.profile_photo}`
            : null,
        },
      };
    });

    return res.status(200).json(sendJson(true, "Clients retrieved successfully", response));
  } catch (error) {
    console.error("Get clients error:", error);
    return res
      .status(500)
      .json(sendJson(false, "Server error while retrieving clients", { error: error.message }));
  }
};
exports.detailsUser = async (req, res) => {
  try {
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({ status: false, message: "id and role are required" });
    }

    // fetch user
    let user = await User.findOne({
      where: { id },
      include: [
        {
          association: "talent",
          attributes: { exclude: ["user_id", "createdAt", "updatedAt"] }
        },
        {
          association: "client",
          attributes: { exclude: ["user_id", "createdAt", "updatedAt"] }
        }
      ]
    });

    if (!user) {
      return res.status(404).json({ status: false, message: "User not found" });
    }

    // ✅ Convert user to plain JSON
    user = user.toJSON();

    // counts
    const [followersCount, followingsCount] = await Promise.all([
      Follow.count({ where: { followingId: user.id } }),
      Follow.count({ where: { followerId: user.id } })
    ]);

    // fetch all skills dictionary
    const allSkills = await Skill.findAll({ attributes: ["id", "name"] });
    const skillsMap = allSkills.reduce((acc, s) => {
      acc[s.id] = s.name;
      return acc;
    }, {});

    let mediaItems = await Media.findAll({
      where: {
        userId: id
      },
      order: [["id", "DESC"]]
    });

    // ✅ Convert mediaItems to plain JSON
    mediaItems = mediaItems.map(m => m.toJSON());

    // attach skill names if talent
    let talentData = null;
    if (user.role === "talent" && user.talent) {
      talentData = {
        ...user.talent,
        skills: (user.talent.skills || []).map((s) => ({
          id: s.id,
          name: skillsMap[s.id] || null,
          rate: s.rate
        }))
      };
    }

    const BASE_URL = process.env.APP_URL?.replace(/\/$/, "") || "";

    // Corrected media URL mapping
    mediaItems.forEach((media) => {
      if (media.fileUrl && !media.fileUrl.startsWith("http")) {
        media.fileUrl = `${BASE_URL}${media.fileUrl}`;
      }
    });

    // ✅ Reviews with rating breakdown
    let reviews = await Review.findAll({
      where: { reviewed_id: id },
      include: [
        {
          model: User,
          as: "reviewer",
          attributes: ["id", "username", "role"],
          include: [
            { association: "talent", attributes: ["profile_photo"] },
            { association: "client", attributes: ["profile_photo"] }
          ]
        },
        { model: Booking, as: "booking", attributes: ["id", "note"] }
      ],
      order: [["created_at", "DESC"]]
    });

    // ✅ Convert reviews to plain JSON
    reviews = reviews.map(r => r.toJSON());

    // Attach extra fields (profile photo, date, likes)
    const loggedInUserId = req.user?.id || null;

    for (const rev of reviews) {
      const reviewer = rev.reviewer;

      if (reviewer) {
        let photo = null;
        if (reviewer.role === "talent" && reviewer.talent?.profile_photo) {
          photo = `${BASE_URL}${reviewer.talent.profile_photo}`;
        } else if (reviewer.role === "client" && reviewer.client?.profile_photo) {
          photo = `${BASE_URL}${reviewer.client.profile_photo}`;
        }
        rev.reviewer = {
          ...reviewer,
          profile_photo: photo
        };
      }

      rev.createdAtFormatted = new Date(rev.created_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric"
      });

      const likesCount = await Like.count({
        where: { talent_id: rev.reviewed_id, type: "like" }
      });

      let userLiked = false;
      if (loggedInUserId) {
        const existingLike = await Like.findOne({
          where: { user_id: loggedInUserId, talent_id: rev.reviewed_id, type: "like" }
        });
        userLiked = !!existingLike;
      }

      rev.likesCount = likesCount;
      rev.userLiked = userLiked;
    }

    const totalReviews = reviews.length;
    let rating = 0;
    let ratingBreakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    if (totalReviews > 0) {
      reviews.forEach((rev) => {
        const r = rev.rating || 0;
        rating += r;
        if (ratingBreakdown[r] !== undefined) {
          ratingBreakdown[r] += 1;
        }
      });

      rating = parseFloat((rating / totalReviews).toFixed(1));

      Object.keys(ratingBreakdown).forEach((star) => {
        ratingBreakdown[star] = Math.round((ratingBreakdown[star] / totalReviews) * 100);
      });
    }

    let bookings = await Booking.findAll({
      where: {
        [Op.or]: [{ talent_id: id }, { client_id: id }]
      },
      attributes: [
        "id",
        "note",
        "amount",
        "status",
        "booking_date",
        "time_slot",
        "payment_status",
        "currency",
        "total_price",
        "created_at"
      ],
      include: [
        {
          model: User,
          as: "client",
          attributes: ["id", "username"],
          include: [{ association: "client", attributes: ["profile_photo"] }]
        },
        {
          model: User,
          as: "talent",
          attributes: ["id", "username"],
          include: [{ association: "talent", attributes: ["profile_photo"] }]
        },
        {
          model: BookingSlot,
          as: "slots",   // ✅ New include
          attributes: ["id", "slot", "slot_date"]
        }
      ],
      order: [["created_at", "DESC"]]
    });


        // ✅ Convert bookings to plain JSON
        bookings = bookings.map(b => b.toJSON());

    const formattedBookings = bookings.map((b) => {
      return {
        ...(b.get ? b.get({ plain: true }) : b),
        createdAtFormatted: new Date(b.created_at).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric"
        }),
        client: b.client
          ? {
              ...b.client,
              profile_photo: b.client.client?.profile_photo
                ? `${BASE_URL}${b.client.client.profile_photo}`
                : null,
            }
          : null,
        talent: b.talent
          ? {
              ...b.talent,
              profile_photo: b.talent.talent?.profile_photo
                ? `${BASE_URL}${b.talent.talent.profile_photo}`
                : null,
            }
          : null,
        slots: b.slots ? b.slots.map(s => ({
          id: s.id,
          slot: s.slot,
          slot_date: s.slot_date
        })) : []
      };
    });


    const userData = {
      id: user.id,
      username: user.username,
      phone_number: user.phone_number,
      email: user.email,
      role: user.role,
      is_verified: user.is_verified,
      on_board: user.on_board,
      notification_alert: user.notification_alert,
      availability: user.availability,
      followers: followersCount,
      followings: followingsCount,
      mediaItems,
      reviews,
      rating,
      totalReviews,
      ratingBreakdown,
      userInfo:
        user.role === "talent"
          ? {
              ...talentData,
              profile_photo: talentData?.profile_photo
                ? `${BASE_URL}${talentData.profile_photo}`
                : null
            }
          : user.client
          ? {
              ...user.client,
              profile_photo: user.client.profile_photo
                ? `${BASE_URL}${user.client.profile_photo}`
                : null
            }
          : null,
      bookings: formattedBookings
    };

    return res.status(200).json({
      status: true,
      message: "User details fetched successfully",
      data: userData
    });
  } catch (error) {
    console.error("detailsUser API error:", error);
    return res.status(500).json({
      status: false,
      message: "Server error fetching user details",
      error: error.message
    });
  }
};
exports.updateUserStatus = async (req, res) => {
  try {
    const { userId, status ,reason} = req.body;

    if (!userId || !status) {
      return res.status(400).json(sendJson(false, 'User ID and status are required'));
    }

    const allowedStatuses = ['pending', 'approved', 'rejected', 'blocked'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json(sendJson(false, 'Invalid status value'));
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json(sendJson(false, 'User not found'));
    }
    if(status === "approved"){
      user.is_verified_by_admin = 1;
    }else{
      user.is_verified_by_admin = 0;
    }
    user.status = status;
    user.reason = reason;
    await user.save();

    // ✅ SendJson for every status
    return res.status(200).json(
      sendJson(true, `User status updated to ${status}`, {
        userId: user.id,
        status: user.status
      })
    );

  } catch (error) {
    console.error('Error updating user status:', error);
    return res.status(500).json(
      sendJson(false, 'Failed to update user status', { error: error.message })
    );
  }
};

exports.softDeleteUser = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json(sendJson(false, "User ID is required"));
    }

    // Include soft-deleted users
    const user = await User.findByPk(userId, { paranoid: false });
    if (!user) {
      return res.status(404).json(sendJson(false, "User not found"));
    }

    if (user.deleted_at) {
      // ✅ Already soft-deleted → restore
      await user.restore();
      return res.json(sendJson(true, "User restored successfully", { userId }));
    } else {
      // ✅ Not deleted → soft delete
      await user.destroy();
      return res.json(sendJson(true, "User soft deleted successfully", { userId }));
    }
  } catch (error) {
    console.error("Toggle delete/restore error:", error);
    return res
      .status(500)
      .json(
        sendJson(false, "Failed to update user status", { error: error.message })
      );
  }
};
exports.getDashboardCounts = async (req, res) => {
  try {
    // Count clients (including soft deleted)
    const totalClients = await User.count({
      where: { role: "client" },
      paranoid: false, // count even if deleted_at is not null
    });

    // Count talents
    const totalTalents = await User.count({
      where: { role: "talent" },
      paranoid: false, // count even if deleted_at is not null
    });

    // Count bookings
    const totalBookings = await Booking.count({
      paranoid: false,
    });

    return res.status(200).json(
      sendJson(true, "Counts retrieved successfully", {
        bookings: totalBookings,
        talents: totalTalents,
        clients: totalClients,
      })
    );
  } catch (error) {
    console.error("❌ Get Dashboard Counts Error:", error);
    return res.status(500).json(
      sendJson(false, "Failed to retrieve counts", {
        error: error.message,
      })
    );
  }
  
};
exports.switchAccount = async (req, res) => {
  try {
    const userId = req.user.id; // ✅ fix: proper way to get current user ID

    const currentUser = await User.findByPk(userId, {
      include: [
        {
          association: 'talent',
          attributes: { exclude: ['user_id', 'createdAt', 'updatedAt'] }
        },
        {
          association: 'client',
          attributes: { exclude: ['user_id', 'createdAt', 'updatedAt'] }
        }
      ]
    });

    if (!currentUser) {
      return res.status(404).json({ status: false, message: 'User not found' });
    }

    // ✅ Extract base number from username or phone_number
    const baseValue = currentUser.phone_number.split('-')[0]; // 8904
    const oppositeRole = currentUser.role === 'talent' ? 'client' : 'talent';

    // ✅ Find the opposite account by phone_number (not username)
    const oppositeUser = await User.findOne({
      where: { phone_number: `${baseValue}-${oppositeRole}` },
      include: [
        {
          association: 'talent',
          attributes: { exclude: ['user_id', 'createdAt', 'updatedAt'] }
        },
        {
          association: 'client',
          attributes: { exclude: ['user_id', 'createdAt', 'updatedAt'] }
        }
      ]
    });

    if (!oppositeUser) {
      return res.status(404).json({
        status: false,
        message: `No ${oppositeRole} account found for ${baseValue}`
      });
    }

    if (oppositeUser.deletedAt) {
      return res.status(400).json({ status: false, message: 'User is deleted' });
    }
    switch (oppositeUser.status) {
      case 'pending':
        return res.status(403).json({ status: false, message: 'Account pending approval' });
      case 'rejected':
        return res.status(403).json({ status: false, message: 'Account rejected' });
      case 'blocked':
        return res.status(403).json({ status: false, message: 'Account blocked. Contact support.' });
      default:
        break;
    }

    const token = jwt.sign({ id: oppositeUser.id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRE
    });

    const [followersCount, followingsCount] = await Promise.all([
      Follow.count({ where: { followingId: oppositeUser.id } }),
      Follow.count({ where: { followerId: oppositeUser.id } })
    ]);

    const allSkills = await Skill.findAll({ attributes: ['id', 'name'] });
    const skillsMap = allSkills.reduce((acc, s) => {
      acc[s.id] = s.name;
      return acc;
    }, {});

    let talentData = null;
    if (oppositeUser.role === 'talent' && oppositeUser.talent) {
      const mappedSkills = (oppositeUser.talent.skills || []).map(s => ({
        id: s.id,
        name: skillsMap[s.id] || null,
        rate: s.rate
      }));

      let parsedAvailability = null;
      try {
        parsedAvailability = oppositeUser.talent.availability ? JSON.parse(oppositeUser.talent.availability) : null;
      } catch (err) {
        parsedAvailability = null;
      }

      talentData = {
        ...oppositeUser.talent.toJSON(),
        skills: mappedSkills,
        availability: parsedAvailability
      };
    }

    const BASE_URL = process.env.APP_URL?.replace(/\/$/, '') || '';

    const userData = {
      token,
      id: oppositeUser.id,
      username: oppositeUser.username,
      phone_number: oppositeUser.phone_number,
      email: oppositeUser.email,
      role: oppositeUser.role,
      is_verified: oppositeUser.is_verified,
      on_board: oppositeUser.on_board,
      notification_alert: oppositeUser.notification_alert,
      availability: oppositeUser.availability,
      followers: followersCount,
      followings: followingsCount,
      userInfo:
        oppositeUser.role === 'talent'
          ? {
              ...talentData,
              profile_photo: talentData?.profile_photo
                ? `${BASE_URL}${talentData.profile_photo}`
                : null
            }
          : oppositeUser.client
          ? {
              ...oppositeUser.client.toJSON(),
              profile_photo: oppositeUser.client.profile_photo
                ? `${BASE_URL}${oppositeUser.client.profile_photo}`
                : null
            }
          : null
    };

    return res.status(200).json({
      status: true,
      message: `Switched to ${oppositeRole} account`,
      data: userData
    });
  } catch (error) {
    console.error('Switch account error:', error);
    return res.status(500).json({
      status: false,
      message: 'Server error during account switch',
      error: error.message
    });
  }
};

exports.getBothProfiles = async (req, res) => {
  try {
    const { phone_number } = req.body;

    if (!phone_number) {
      return res.status(400).json({
        status: false,
        message: 'phone_number is required'
      });
    }

    const baseValue = phone_number.split('-')[0]; // e.g. 8904
    const roles = ['talent', 'client'];

    const results = [];

    for (const role of roles) {
      const fullPhone = `${baseValue}-${role}`;

      const user = await User.findOne({
        where: { phone_number: fullPhone },
        include: [
          {
            association: 'talent',
            attributes: { exclude: ['user_id', 'createdAt', 'updatedAt'] }
          },
          {
            association: 'client',
            attributes: { exclude: ['user_id', 'createdAt', 'updatedAt'] }
          }
        ]
      });

      if (!user) continue;

      const [followersCount, followingsCount] = await Promise.all([
        Follow.count({ where: { followingId: user.id } }),
        Follow.count({ where: { followerId: user.id } })
      ]);

      const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE
      });

      const allSkills = await Skill.findAll({ attributes: ['id', 'name'] });
      const skillsMap = allSkills.reduce((acc, s) => {
        acc[s.id] = s.name;
        return acc;
      }, {});

    let talentData = null;
    if (user.role === 'talent' && user.talent) {
      const mappedSkills = (user.talent.skills || []).map(s => ({
        id: s.id,
        name: skillsMap[s.id] || null,
        rate: s.rate
      }));

      let parsedAvailability = null;
      try {
        parsedAvailability = user.talent.availability ? JSON.parse(user.talent.availability) : null;
      } catch (err) {
        parsedAvailability = null;
      }

      talentData = {
        ...user.talent.toJSON(),
        skills: mappedSkills,
        availability: parsedAvailability
      };
    }

      const BASE_URL = process.env.APP_URL?.replace(/\/$/, '') || '';

      // ✅ EXACT SAME STRUCTURE AS YOUR EXISTING RESPONSE
      const userData = {
        // token,
        id: user.id,
        username: user.username,
        phone_number: user.phone_number,
        email: user.email,
        role: user.role,
        is_verified: user.is_verified,
        on_board: user.on_board,
        notification_alert: user.notification_alert,
        availability: user.availability,
        followers: followersCount,
        followings: followingsCount,
        userInfo:
          user.role === 'talent'
            ? {
                ...talentData,
                profile_photo: talentData?.profile_photo
                  ? `${BASE_URL}${talentData.profile_photo}`
                  : null
              }
            : user.client
            ? {
                ...user.client.toJSON(),
                profile_photo: user.client.profile_photo
                  ? `${BASE_URL}${user.client.profile_photo}`
                  : null
              }
            : null
      };

      results.push(userData);
    }

    if (results.length === 0) {
      return res.status(404).json({
        status: false,
        message: 'No accounts found for this phone number'
      });
    }

    return res.status(200).json({
      status: true,
      message: 'Profiles fetched successfully',
      data: results
    });
  } catch (error) {
    console.error('Get both profiles error:', error);
    return res.status(500).json({
      status: false,
      message: 'Server error while fetching profiles',
      error: error.message
    });
  }
};
const normalizeTime = (time) => {
  return time.length === 5 ? `${time}:00` : time;
};
exports.save_talent_availability = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const userId = req.user.id;
    const { availability, experience_level, skills } = req.body;

    /* ===================== REQUIRED VALIDATION ===================== */

    if (!availability) {
      await transaction.rollback();
      return res.status(400).json(sendJson(false, 'Availability is required'));
    }

    if (!experience_level) {
      await transaction.rollback();
      return res.status(400).json(sendJson(false, 'Experience level is required'));
    }

    if (!skills) {
      await transaction.rollback();
      return res.status(400).json(sendJson(false, 'Skills are required'));
    }

    /* ===================== PARSE AVAILABILITY ===================== */

    let parsedAvailability;
    try {
      parsedAvailability = typeof availability === 'string'
        ? JSON.parse(availability)
        : availability;
    } catch (err) {
      await transaction.rollback();
      return res.status(400).json(sendJson(false, 'Invalid availability format'));
    }

    if (!Array.isArray(parsedAvailability) || parsedAvailability.length === 0) {
      await transaction.rollback();
      return res.status(400).json(
        sendJson(false, 'Availability must be a non-empty array')
      );
    }

    /* ===================== VALIDATE AVAILABILITY ITEMS ===================== */

    for (let i = 0; i < parsedAvailability.length; i++) {
      const item = parsedAvailability[i];

      if (!item.date) {
        await transaction.rollback();
        return res.status(400).json(
          sendJson(false, `availability[${i}].date is required`)
        );
      }

      if (!item.slot) {
        await transaction.rollback();
        return res.status(400).json(
          sendJson(false, `availability[${i}].slot is required`)
        );
      }

      if (item.price === undefined || item.price === null) {
        await transaction.rollback();
        return res.status(400).json(
          sendJson(false, `availability[${i}].price is required`)
        );
      }

      if (item.discount === undefined || item.discount === null) {
        await transaction.rollback();
        return res.status(400).json(
          sendJson(false, `availability[${i}].discount is required`)
        );
      }
    }

    /* ===================== PARSE & NORMALIZE SKILLS ===================== */

    let parsedSkills;
    try {
      parsedSkills = typeof skills === 'string'
        ? JSON.parse(skills)
        : skills;
    } catch (err) {
      await transaction.rollback();
      return res.status(400).json(sendJson(false, 'Invalid skills format'));
    }

    if (!Array.isArray(parsedSkills) || parsedSkills.length === 0) {
      await transaction.rollback();
      return res.status(400).json(
        sendJson(false, 'Skills must be a non-empty array')
      );
    }

    parsedSkills = parsedSkills.map((s, index) => {
      if (!s.id) {
        throw new Error(`skills[${index}].id is required`);
      }

      return {
        id: Number(s.id),
        rate: s.rate !== null && s.rate !== undefined
          ? Number(s.rate)
          : null
      };
    });

    /* ===================== FETCH TALENT ===================== */

    const talent = await Talent.findOne({
      where: { user_id: userId },
      transaction
    });

    if (!talent) {
      await transaction.rollback();
      return res.status(404).json(sendJson(false, 'Talent not found'));
    }

    /* ===================== SAVE SKILLS (REAL JSON) ===================== */

    await talent.update(
      {
        experience_level,
        skills: parsedSkills
      },
      { transaction }
    );

    /* ===================== RESET AVAILABILITY ===================== */

    await TalentAvailability.destroy({
      where: { talent_id: talent.id },
      transaction
    });

    const rows = parsedAvailability.map(item => {
      let [start_time, end_time] = item.slot.split(' - ').map(t => t.trim());

      start_time = normalizeTime(start_time);
      end_time = normalizeTime(end_time);

      return {
        talent_id: talent.id,
        date: item.date,
        start_time,
        end_time,
        price: Number(item.price),
        discount: Number(item.discount)
      };
    });

    await TalentAvailability.bulkCreate(rows, { transaction });

    await transaction.commit();

    return res.json(
      sendJson(true, 'Talent availability saved successfully')
    );
  } catch (error) {
    await transaction.rollback();
    return res.status(500).json(
      sendJson(false, 'Server error', { error: error.message })
    );
  }
};

