import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  userId:       { type: String, required: true, unique: true, index: true },
  name:         { type: String, default: 'User', trim: true, maxlength: 80 },
  email:        { type: String, trim: true, lowercase: true, sparse: true },
  passwordHash: { type: String },
  preferences: {
    character:    { type: String, default: 'minidora' },
    voiceEnabled: { type: Boolean, default: false },
    voicePreset:  { type: String, enum: ['soft', 'energetic', 'deep'], default: 'soft' },
    voiceRate:    { type: Number, default: 1.0, min: 0.5, max: 2.0 },
    voicePitch:   { type: Number, default: 1.1, min: 0.5, max: 2.0 },
    theme:        { type: String, enum: ['light', 'dark', 'system'], default: 'system' },
    userName:     { type: String, default: '' },
  },
  createdAt:  { type: Date, default: Date.now },
  lastSeenAt: { type: Date, default: Date.now },
}, { versionKey: false });

export default mongoose.model('User', UserSchema);
