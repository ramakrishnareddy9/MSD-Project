import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['order', 'delivery', 'payment', 'system', 'alert', 'message', 'promotion'],
    default: 'system'
  },
  relatedId: {
    type: mongoose.Schema.Types.ObjectId,
    // Can point to an Order, DeliveryTask, etc. depending on type
  },
  isRead: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

notificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });

export default mongoose.model('Notification', notificationSchema);
