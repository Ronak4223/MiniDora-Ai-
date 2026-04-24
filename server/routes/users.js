import express from 'express';
import User from '../models/User.js';
import { dbReady } from '../config/db.js';

const router = express.Router();

// POST /api/users/signup
router.post('/signup', async (req, res) => {
  const { userId, name, email, password } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId is required' });

  if (!dbReady()) {
    // DB offline — auth handled by localStorage on client
    return res.json({ ok: true, userId, name, offline: true });
  }

  try {
    const exists = await User.findOne({
      $or: [{ userId }, ...(email ? [{ email: email.toLowerCase() }] : [])],
    });
    if (exists) return res.status(409).json({ error: 'An account with this email already exists' });

    const user = await User.create({
      userId,
      name: name?.trim() || 'User',
      email: email?.toLowerCase()?.trim(),
      passwordHash: password ? btoa(password) : undefined,
    });
    const { passwordHash: _pw, ...safe } = user.toObject();
    res.status(201).json({ ok: true, user: safe });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/users/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });

  if (!dbReady()) return res.json({ ok: true, offline: true });

  try {
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) return res.status(404).json({ error: 'No account found with this email' });
    if (user.passwordHash !== btoa(password)) return res.status(401).json({ error: 'Incorrect password' });

    user.lastSeenAt = new Date();
    await user.save();

    const { passwordHash: _pw, ...safe } = user.toObject();
    res.json({ ok: true, user: safe });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/users/:userId/preferences
router.get('/:userId/preferences', async (req, res) => {
  if (!dbReady()) return res.json({});
  try {
    const user = await User.findOne({ userId: req.params.userId }).select('preferences -_id').lean();
    res.json(user?.preferences || {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/users/:userId/preferences
router.put('/:userId/preferences', async (req, res) => {
  if (!dbReady()) return res.json({ ok: true });
  try {
    await User.findOneAndUpdate(
      { userId: req.params.userId },
      { $set: { preferences: req.body } },
      { upsert: true }
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
