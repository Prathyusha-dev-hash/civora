const mongoose = require('mongoose');
const { Notification } = require('../models');
const { AUTHORITY_ROLES } = require('../config/constants');
const { serializeNotification } = require('../services/serializers');
const { ApiError, ok, asyncHandler } = require('../utils/http');
const { parseBool } = require('../utils/validate');

/** Server-enforced isolation: users only ever see their own, their department's or their role's notifications. */
function visibleTo(user) {
  const or = [{ recipientUser: user._id }, { recipientRole: user.role }];
  if (AUTHORITY_ROLES.includes(user.role) && user.department) or.push({ recipientDepartment: user.department._id || user.department });
  return { $or: or };
}

const list = asyncHandler(async (req, res) => {
  const base = visibleTo(req.user);
  const filter = { ...base };
  const unreadOnly = parseBool(req.query.unread_only ?? req.query.unreadOnly);
  const actionOnly = parseBool(req.query.action_required ?? req.query.actionRequired);
  if (unreadOnly) filter.readBy = { $ne: req.user._id };
  if (actionOnly) filter.actionRequired = true;
  if (req.query.type) filter.type = String(req.query.type);

  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
  const page = Math.max(1, Number(req.query.page) || 1);
  const [items, total, unread, action] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Notification.countDocuments(filter),
    Notification.countDocuments({ ...base, readBy: { $ne: req.user._id } }),
    Notification.countDocuments({ ...base, actionRequired: true }),
  ]);
  ok(res, items.map((n) => serializeNotification(n, req.user)), 200, { total, unread_count: unread, action_required_count: action, page, limit });
});

const markRead = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw ApiError.notFound('Notification not found.');
  const n = await Notification.findOneAndUpdate({ _id: req.params.id, ...visibleTo(req.user) }, { $addToSet: { readBy: req.user._id } }, { new: true }).lean();
  if (!n) throw ApiError.notFound('Notification not found.');
  ok(res, { ...serializeNotification(n, req.user), read_at: new Date().toISOString() });
});

const markAllRead = asyncHandler(async (req, res) => {
  const r = await Notification.updateMany({ ...visibleTo(req.user), readBy: { $ne: req.user._id } }, { $addToSet: { readBy: req.user._id } });
  ok(res, { marked_count: r.modifiedCount });
});

module.exports = { list, markRead, markAllRead };
