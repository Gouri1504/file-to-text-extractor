// models/User.model.js
// User accounts for both auth strategies (email/password AND Google OAuth).
// passwordHash and googleId are both optional because either path may be
// missing - a Google-only user has no password, and an email-only user has
// no googleId. Index on email is unique; on googleId it's sparse-unique so
// many users without googleId don't collide on null.

import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      // Not required - Google-only users have no password.
      select: false, // never returned by default queries
    },
    googleId: {
      type: String,
      index: { unique: true, sparse: true },
    },
    name: { type: String, trim: true },
    avatar: { type: String },
  },
  { timestamps: true },
);

// Strip sensitive fields whenever a User is serialized to JSON (e.g. res.json).
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  delete obj.__v;
  return obj;
};

export default mongoose.model('User', userSchema);
