/**
 * Runs once when the server starts. In production it checks the settings the
 * site can't run without (and refuses to start if they're missing), then warns
 * about optional ones that switch a feature off. See .env.example for all of them.
 * Then, in development too, it makes sure the admin account exists.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") (await import("./instrumentation-node")).start();
}
