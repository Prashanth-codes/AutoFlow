const mongoose = require('mongoose');
const User = require('../models/User');
const Organization = require('../models/Organization');
const jwt = require('jsonwebtoken');

exports.register = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { name, email, password, organizationName } = req.body;

    // Check if user exists
    let user = await User.findOne({ email });
    if (user) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'User already exists',
      });
    }

    // Create organization (within transaction)
    const [organization] = await Organization.create(
      [
        {
          name: organizationName || name,
          email,
          owner: null,
        },
      ],
      { session }
    );

    // Create user (within transaction)
    [user] = await User.create(
      [
        {
          name,
          email,
          password,
          organizationId: organization._id,
          role: 'admin',
        },
      ],
      { session }
    );

    // Update organization owner
    organization.owner = user._id;
    organization.members.push(user._id);
    await organization.save({ session });

    await session.commitTransaction();
    session.endSession();

    // Generate token so user is logged in immediately after registration
    const token = jwt.sign(
      {
        userId: user._id,
        organizationId: organization._id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      organization: {
        id: organization._id,
        name: organization.name,
      },
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Error registering user',
      error: error.message,
    });
  }
};

// Login User
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate email and password
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password',
      });
    }

    // Check user
    const user = await User.findOne({ email }).select('+password').populate('organizationId');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // Check password
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // Generate token
    const token = jwt.sign(
      {
        userId: user._id,
        organizationId: user.organizationId._id,
        role: user.role,
      },
      process.env.JWT_SECRET || 'your_jwt_secret',
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      organization: {
        id: user.organizationId._id,
        name: user.organizationId.name,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Error logging in',
      error: error.message,
    });
  }
};

// Get User Profile
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).populate('organizationId');

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching profile',
      error: error.message,
    });
  }
};
