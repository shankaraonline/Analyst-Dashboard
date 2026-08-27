import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';

export const JWT_SECRET = process.env.JWT_SECRET || 'shankara-dashboard-secret-key-513982';

/**
 * Middleware: Verify Admin JWT Token
 */
export function verifyAdminToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Access denied. Admin authentication required.'
    });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.adminUser = decoded;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired session token. Please log in again.'
    });
  }
}

/**
 * Seed SuperAdmin user on server start
 * Default user: ShankaraSuperAdmin / ShankaraSuperAdmin513
 */
export async function seedAdminUser() {
  try {
    const adminUsername = process.env.ADMIN_USERNAME || 'ShankaraSuperAdmin';
    const adminPassword = process.env.ADMIN_PASSWORD || 'ShankaraSuperAdmin513';

    let user = await User.findOne({ username: adminUsername });
    if (!user) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(adminPassword, salt);

      user = new User({
        username: adminUsername,
        password: hashedPassword,
        role: 'superadmin'
      });
      await user.save();
      console.log(`🔐 SuperAdmin user "${adminUsername}" seeded successfully in MongoDB.`);
    } else {
      console.log(`🔐 SuperAdmin user "${adminUsername}" is active in MongoDB.`);
    }
  } catch (err) {
    console.warn('⚠️ Could not seed Admin user in MongoDB (will retry on next startup):', err.message);
  }
}
