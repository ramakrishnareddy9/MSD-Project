import cron from 'node-cron';
import Community from '../models/Community.model.js';
import { notifyUser } from '../utils/notification.util.js';

const REMINDER_DAYS = Number(process.env.COMMUNITY_JOIN_REMINDER_DAYS || 3);
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

const shouldRemind = (joinRequest, now = new Date()) => {
  if (joinRequest.status !== 'pending') return false;
  if (joinRequest.reminderSentAt) return false;

  const requestedAt = new Date(joinRequest.requestedAt || now);
  return (now.getTime() - requestedAt.getTime()) >= REMINDER_DAYS * MILLISECONDS_PER_DAY;
};

export const runCommunityJoinReminders = async () => {
  const communities = await Community.find({ 'joinRequests.status': 'pending' });
  const now = new Date();

  for (const community of communities) {
    let changed = false;

    for (const joinRequest of community.joinRequests) {
      if (!shouldRemind(joinRequest, now)) continue;

      await notifyUser({
        userId: joinRequest.user,
        title: 'Join Request Still Pending',
        message: `Your request to join ${community.name} is still awaiting admin review.`,
        type: 'alert',
        relatedId: community._id
      });

      joinRequest.reminderSentAt = now;
      changed = true;
    }

    if (changed) {
      await community.save();
    }
  }
};

export const startCommunityJoinReminderScheduler = () => {
  const schedule = process.env.COMMUNITY_JOIN_REMINDER_CRON || '0 9 * * *';

  cron.schedule(schedule, async () => {
    try {
      await runCommunityJoinReminders();
    } catch (error) {
      console.error('❌ Community join reminder scheduler error:', error.message);
    }
  });

  console.log(`✅ Community reminder scheduler running with cron: ${schedule}`);
};
