module.exports = {
  pending: "newRequest",
  accepted: "requestAccepted",
  paymentPending: "requestAccepted",
  rejected: "requestRejected",
  isPaid: "requestPaymentPaid",
  inProgress: "sessionStarted",
  completed: "sessionCompleted",
  reviewPending: "appointmentComplete",
  talentReviewPending: "appointmentComplete",
  clientReviewPending: "appointmentComplete",
  requestedForRescheduleByUser: "rescheduled",
  requestedForRescheduleByTalent: "rescheduled",
  canceledByUser: "cancelAppointment",
  canceledByTalent: "cancelAppointment",
  confirm: "confirmSession"
};
