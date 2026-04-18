import mongoose from 'mongoose';

const communitySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Community name is required'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Description is required']
  },
  admin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    joinedDate: {
      type: Date,
      default: Date.now
    }
  }],
  discount: {
    type: Number,
    default: 10,
    min: 0,
    max: 100
  }
}, {
  timestamps: true
});

export default mongoose.model('Community', communitySchema);
