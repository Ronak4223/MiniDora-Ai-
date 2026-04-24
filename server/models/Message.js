import mongoose from 'mongoose';

const MessageSchema = new mongoose.Schema({
  messageId:      { type: String, required: true, unique: true, index: true },
  conversationId: { type: String, required: true, index: true },
  userId:         { type: String, required: true },
  role:           { type: String, enum: ['user', 'assistant'], required: true },
  content:        { type: String, required: true, maxlength: 32000 },
  characterId:    { type: String, default: 'minidora' },
  provider:       { type: String, default: 'unknown' }, // free-form: tier1_vllm, tier2_ollama, tier3_openrouter, tier4_offline, cache
  timestamp:      { type: Date, default: Date.now, index: true },
}, { versionKey: false });

MessageSchema.index({ conversationId: 1, timestamp: 1 });

export default mongoose.model('Message', MessageSchema);
