import mongoose from 'mongoose';

const ConversationSchema = new mongoose.Schema({
  conversationId: { type: String, required: true, unique: true, index: true },
  userId:         { type: String, required: true, index: true },
  title:          { type: String, default: 'New Chat', maxlength: 120 },
  characterId:    { type: String, default: 'minidora' },
  messageCount:   { type: Number, default: 0 },
  createdAt:      { type: Date, default: Date.now },
  updatedAt:      { type: Date, default: Date.now },
}, { versionKey: false });

export default mongoose.model('Conversation', ConversationSchema);
