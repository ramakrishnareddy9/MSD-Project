import mongoose from 'mongoose';

const communityAnnouncementSchema = new mongoose.Schema({
  community: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Community',
    required: true,
    index: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 120
  },
  message: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000
  },
  type: {
    type: String,
    enum: ['offer', 'event', 'info', 'alert'],
    default: 'info'
  }
}, {
  timestamps: true
});

communityAnnouncementSchema.index({ community: 1, createdAt: -1 });

export default mongoose.model('CommunityAnnouncement', communityAnnouncementSchema);