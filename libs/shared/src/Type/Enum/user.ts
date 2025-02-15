export enum StudentCommands {
  GET_STUDENT = 'get_student',
  SEND_COACHING_REGUEST = 'send_coaching_request',
  GET_MY_COACHING_REGUEST = 'get_my_coaching_request',
  CANCEL_MY_COACHING_REGUEST = 'cancel_my_coaching_request',
}

export enum CoachCommands {
  UPDATE_COACHING_REQUEST_STATUS = 'update_coaching_request_status',
  GET_COACHING_REQUEST = 'get_coaching_request',
  GET_COACH = 'get_coach',
  GET_COACHED_STUDENTS = 'get_coached_students',
}

export enum UserCommands {
  GET_USER = 'get_USER',
  FORGOT_PASSWORD = 'forgot_password',
  RESET_PASSWORD = 'reset_password',
}

export enum NotificationCommands {
  GET_NOTIFICATION = 'get_notification',
  SEND_NOTIFICATION = 'send_notification',
}
