import express from 'express';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import { dbReady } from '../config/db.js';

const router = express.Router();

// GET /api/conversations?userId=xxx
router.get('/', async (req, res) => {
  if (!dbReady()) return res.json([]);
  try {
    const { userId = 'anonymous' } = req.query;
    const docs = await Conversation.find({ userId })
      .sort({ updatedAt: -1 })
      .limit(100)
      .select('conversationId title characterId messageCount createdAt updatedAt -_id')
      .lean();
    res.json(docs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/conversations
router.post('/', async (req, res) => {
  const { conversationId, userId = 'anonymous', title = 'New Chat', characterId = 'minidora' } = req.body;
  if (!conversationId) return res.status(400).json({ error: 'conversationId required' });

  if (!dbReady()) {
    return res.json({ conversationId, userId, title, characterId, createdAt: new Date() });
  }
  try {
    const doc = await Conversation.findOneAndUpdate(
      { conversationId },
      { $setOnInsert: { conversationId, userId, title, characterId, createdAt: new Date(), updatedAt: new Date() } },
      { upsert: true, new: true }
    ).lean();
    res.status(201).json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/conversations/:conversationId (rename)
router.put('/:conversationId', async (req, res) => {
  if (!dbReady()) return res.json({ ok: true });
  try {
    await Conversation.updateOne(
      { conversationId: req.params.conversationId },
      { $set: { title: req.body.title, updatedAt: new Date() } }
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/conversations/:conversationId
router.delete('/:conversationId', async (req, res) => {
  if (!dbReady()) return res.json({ ok: true });
  try {
    const { conversationId } = req.params;
    await Conversation.deleteOne({ conversationId });
    await Message.deleteMany({ conversationId });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
