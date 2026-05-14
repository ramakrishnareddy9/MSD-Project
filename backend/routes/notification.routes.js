import express from 'express';
import { 
  getNotifications, 
  markAsRead, 
  markAllAsRead, 
  deleteNotification 
} from '../controllers/notification.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';
import { notifyUser, notifyUsers } from '../utils/notification.util.js';

const router = express.Router();

router.use(authenticate);

router.route('/')
  .get(getNotifications)
  .post(authenticate, authorize('admin'), async (req, res) => {
    try {
      const { userId, users, title, message, type = 'system', relatedId = null } = req.body;

      if (!title || !message) {
        return res.status(400).json({ success: false, message: 'title and message are required' });
      }

      if (userId) {
        const notification = await notifyUser({ userId, title, message, type, relatedId });
        return res.status(201).json({ success: true, data: notification });
      }

      if (Array.isArray(users) && users.length > 0) {
        const notifications = await notifyUsers(users, { title, message, type, relatedId });
        return res.status(201).json({ success: true, data: notifications });
      }

      return res.status(400).json({ success: false, message: 'userId or users array required' });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  });

router.put('/read-all', markAllAsRead);

router.route('/:id')
  .delete(deleteNotification);

router.put('/:id/read', markAsRead);

export default router;
