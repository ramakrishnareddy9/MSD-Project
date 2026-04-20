import Notification from '../models/Notification.model.js';

const toId = (value) => String(value || '').trim();

export const notifyUser = async ({ userId, title, message, type = 'system', relatedId = null }) => {
  const normalizedUserId = toId(userId);
  if (!normalizedUserId || !title || !message) return null;

  try {
    return await Notification.create({
      user: normalizedUserId,
      title,
      message,
      type,
      relatedId
    });
  } catch (error) {
    // Best-effort notifications must not break business actions.
    if (process.env.NODE_ENV === 'development') {
      console.error('Notification create failed:', error.message);
    }
    return null;
  }
};

export const notifyUsers = async (users = [], payload = {}) => {
  const uniqueUserIds = [...new Set((users || []).map(toId).filter(Boolean))];
  if (uniqueUserIds.length === 0) return [];

  const docs = uniqueUserIds.map((userId) => ({
    user: userId,
    title: payload.title,
    message: payload.message,
    type: payload.type || 'system',
    relatedId: payload.relatedId || null
  }));

  try {
    return await Notification.insertMany(docs, { ordered: false });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Bulk notification create failed:', error.message);
    }
    return [];
  }
};
