module.exports = {
  User: require('./User'),
  Department: require('./Department'),
  Complaint: require('./Complaint'),
  MasterIncident: require('./MasterIncident'),
  Evidence: require('./Evidence'),
  AiAnalysis: require('./AiAnalysis'),
  WorkOrder: require('./WorkOrder'),
  AuditLog: require('./AuditLog'),
  Notification: require('./Notification'),
  ...require('./Counter'),
};
