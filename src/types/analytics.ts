/** Every event the server sends to PostHog; pageviews and clicks come from the browser SDK. */
export type AnalyticsEvent =
  | "signed_up"
  | "logged_in"
  | "checkout_started"
  | "subscription_started"
  | "trial_converted"
  | "subscription_cancel_scheduled"
  | "subscription_cancel_reverted"
  | "subscription_ended"
  | "course_enrollment_paywalled"
  | "course_enrolled"
  | "lesson_completed"
  | "assignment_submitted"
  | "support_request_submitted"

export type LoginMethod = "email_code" | "magic_link" | "google" | "github"
