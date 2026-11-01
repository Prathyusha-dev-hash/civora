const { Notification } = require('../models');
const { ROLES } = require('../config/constants');

/**
 * Creates notifications. Failures are logged and never break the main flow.
 */
async function notify(data) {
  try {
    return await Notification.create(data);
  } catch (err) {
    console.error('[Notify] Failed to create notification:', err.message);
    return null;
  }
}

const toUser = (userId, data) => notify({ ...data, recipientUser: userId });
const toDepartment = (departmentId, data) => notify({ ...data, recipientDepartment: departmentId });
const toAdmins = (data) => notify({ ...data, recipientRole: ROLES.ADMIN });

module.exports = { notify, toUser, toDepartment, toAdmins };
