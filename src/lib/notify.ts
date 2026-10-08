import "server-only";

// Email notifications. No provider is wired up yet, so messages are logged.
// Plug Resend/Postmark/SES in here; callers don't need to change.
export async function notify(to: string, subject: string, body: string) {
  console.info(`[notify] to=${to} subject="${subject}"\n  ${body}`);
}
