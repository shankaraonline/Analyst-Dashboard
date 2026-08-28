import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import User from '../models/User.js';
import { JWT_SECRET, verifyAdminToken } from '../middleware/auth.js';

const router = express.Router();

// -------------------------------------------------------------
// POST /api/auth/login — Admin Login
// -------------------------------------------------------------
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Username and password are required.'
      });
    }

    const adminUsername = process.env.ADMIN_USERNAME || 'ShankaraSuperAdmin';
    const adminPassword = process.env.ADMIN_PASSWORD || 'ShankaraSuperAdmin513';

    // 1. If MongoDB is offline, verify directly against SuperAdmin credentials
    if (mongoose.connection.readyState !== 1) {
      if (
        username.trim().toLowerCase() === adminUsername.toLowerCase() &&
        password === adminPassword
      ) {
        const token = jwt.sign(
          {
            id: 'superadmin_offline_id',
            username: adminUsername,
            role: 'superadmin'
          },
          JWT_SECRET,
          { expiresIn: '7d' }
        );

        return res.json({
          success: true,
          token,
          user: {
            id: 'superadmin_offline_id',
            username: adminUsername,
            role: 'superadmin'
          },
          message: 'Admin authenticated successfully.'
        });
      } else {
        return res.status(401).json({
          success: false,
          error: 'Invalid username or password.'
        });
      }
    }

    // 2. Normal database lookup in MongoDB
    const user = await User.findOne({
      username: { $regex: new RegExp(`^${username.trim()}$`, 'i') }
    });

    // Fallback check if user hasn't been seeded yet in DB
    if (!user) {
      if (
        username.trim().toLowerCase() === adminUsername.toLowerCase() &&
        password === adminPassword
      ) {
        const token = jwt.sign(
          {
            id: 'superadmin_seed_id',
            username: adminUsername,
            role: 'superadmin'
          },
          JWT_SECRET,
          { expiresIn: '7d' }
        );

        return res.json({
          success: true,
          token,
          user: {
            id: 'superadmin_seed_id',
            username: adminUsername,
            role: 'superadmin'
          },
          message: 'Admin authenticated successfully.'
        });
      }

      return res.status(401).json({
        success: false,
        error: 'Invalid username or password.'
      });
    }

    // Verify password with bcrypt
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid username or password.'
      });
    }

    // Update last login timestamp
    user.lastLoginAt = new Date();
    await user.save().catch(() => {});

    // Generate JWT token (valid for 7 days)
    const token = jwt.sign(
      {
        id: user._id,
        username: user.username,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        role: user.role
      },
      message: 'Admin authentication successful.'
    });
  } catch (err) {
    console.error('❌ Login Error:', err);
    return res.status(500).json({
      success: false,
      error: 'Authentication failed due to a server error.'
    });
  }
});

// -------------------------------------------------------------
// GET /api/auth/verify — Verify Session Token
// -------------------------------------------------------------
router.get('/verify', verifyAdminToken, (req, res) => {
  return res.json({
    success: true,
    authenticated: true,
    user: req.adminUser
  });
});

export default router;
