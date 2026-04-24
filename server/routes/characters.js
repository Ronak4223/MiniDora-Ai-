import express from 'express';
import { CHARACTER_LIST } from '../config/characters.js';

const router = express.Router();

// GET /api/characters — return character list (no system prompts)
router.get('/', (_, res) => res.json(CHARACTER_LIST));

export default router;
