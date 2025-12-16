module.exports = {
  newRequest: {
    title: "New Booking Request",
    message: ({ clientName, serviceName, date, time }) =>
      `${clientName} has requested a booking for ${serviceName} on ${date} at ${time}. Review and respond.`
  },

  requestAccepted: {
    title: "Booking Confirmed",
    message: ({ talentName, serviceName, date, time }) =>
      `Your booking request with ${talentName} for ${serviceName} on ${date} at ${time} has been accepted.`
  },

  requestRejected: {
    title: "Booking Declined",
    message: ({ talentName, serviceName }) =>
      `Unfortunately, ${talentName} has declined your booking request for ${serviceName}.`
  },

  requestPaymentPaid: {
    title: "Payment Successful",
    message: ({ serviceName, talentName }) =>
      `Your payment for ${serviceName} with ${talentName} has been completed successfully.`
  },

  sessionStarted: {
    title: "Session Started",
    message: ({ serviceName, otherPartyName }) =>
      `Your session for ${serviceName} with ${otherPartyName} has started. Join now.`
  },

  sessionCompleted: {
    title: "Session Completed",
    message: ({ serviceName, otherPartyName }) =>
      `Your session for ${serviceName} with ${otherPartyName} has been completed. We hope it went well.`
  },

  rescheduled: {
    title: "Session Rescheduled",
    message: ({ serviceName, newDate, newTime }) =>
      `Your session for ${serviceName} has been rescheduled to ${newDate} at ${newTime}. Please check the details.`
  },

  cancelAppointment: {
    title: "Appointment Cancelled",
    message: ({ serviceName, date, time }) =>
      `The appointment for ${serviceName} scheduled on ${date} at ${time} has been cancelled.`
  },

  feedbackSubmitted: {
    title: "Feedback Received",
    message: ({ clientName, serviceName }) =>
      `${clientName} has submitted feedback for your ${serviceName} session. Check it now.`
  },

  sendReminders: {
    title: "Session Reminder",
    message: ({ serviceName, date, time }) =>
      `Reminder: Your session for ${serviceName} is scheduled on ${date} at ${time}. Be prepared.`
  },

  appointmentComplete: {
    title: "Appointment Completed",
    message: ({ serviceName }) =>
      `Your appointment for ${serviceName} has been successfully completed. Thank you for using our platform.`
  },

  upcomingSession: {
    title: "Upcoming Session",
    message: ({ serviceName, otherPartyName, date, time }) =>
      `You have an upcoming session for ${serviceName} with ${otherPartyName} on ${date} at ${time}.`
  },

  notAvailable: {
    title: "Talent Not Available",
    message: ({ talentName }) =>
      `${talentName} is currently not available for bookings. Please choose another time or talent.`
  },

  liked: {
    title: "You Got a Like ❤",
    message: ({ userName }) =>
      `${userName} liked your profile. Keep shining and attracting more clients!`
  },

  wishlist: {
    title: "Added to Wishlist ⭐",
    message: ({ userName, serviceName }) =>
      `${userName} added your service ${serviceName} to their wishlist.`
  }
};
