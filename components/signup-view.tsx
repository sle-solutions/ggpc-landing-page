import Image from "next/image"
import type { Flow } from "@/lib/identity/protocol"
import { IdentityShell } from "./identity-shell"
function TermsFields({ flow }: { flow: Flow }) {
  return (
    <>
      <input type="hidden" name="csrf" value={flow.csrf} />
      <input type="hidden" name="termsVersion" value={flow.termsVersion} />
      <input type="hidden" name="privacyVersion" value={flow.privacyVersion} />
      <input
        type="hidden"
        name="usageConsentVersion"
        value={flow.usageConsentVersion}
      />
      <label className="identity-check">
        <input type="checkbox" name="acceptTerms" required />
        <span>
          I agree to the{" "}
          <a href="/terms" target="_blank" rel="noreferrer">
            Terms
          </a>{" "}
          and acknowledge the{" "}
          <a href="/privacy" target="_blank" rel="noreferrer">
            Privacy policy
          </a>
          .
        </span>
      </label>
      {flow.kind === "extension" ? (
        <label className="identity-check">
          <input type="checkbox" name="usageConsent" />
          <span>
            Help improve GG PC with optional feature-usage analytics.
            <small>
              Off unless you choose it. No store URLs, searches, part details or
              prices. You can change this in extension Settings.
            </small>
          </span>
        </label>
      ) : (
        <p className="identity-note">
          Admin sign-in does not change your existing analytics choice.
        </p>
      )}
    </>
  )
}
export function SignupView({
  flow,
  id,
  error,
}: {
  flow: Flow | null
  id?: string
  error?: string | null
}) {
  const admin = flow?.kind === "admin"
  return (
    <IdentityShell>
      <section className="identity-intro">
        <h1>
          {admin
            ? "Sign in to your dashboard."
            : "Your build starts with an account."}
        </h1>
        <p>
          {admin
            ? "Use an account with administrator access. This page never grants or changes that access."
            : "Sign in to use the GG PC extension. Your existing device builds stay on this device until you choose to save or import them."}
        </p>
      </section>
      {error ? (
        <div className="identity-message" role="alert">
          {error}
        </div>
      ) : null}
      {!flow || !id ? (
        <section className="frame identity-panel">
          <h2>Start from GG PC</h2>
          <p>
            Open the extension in Chrome and choose Sign in. It opens a secure
            sign-in window linked to that extension session.
          </p>
          <p>
            If a window expired, close it and start again from the extension.
            Keep the new window open until GG PC confirms sign-in.
          </p>
          <a className="text-link" href="/">
            Back to ggpc.app
          </a>
        </section>
      ) : flow.providerStarted ? (
        <section className="frame identity-panel">
          <h2>Finish the open sign-in</h2>
          <p>
            This sign-in has already started with a provider. Return to that
            window to finish. If it closed or failed, start a new sign-in from
            GG PC.
          </p>
          {admin ? (
            <a
              className="text-link"
              href="/api/identity/browser/begin?mode=admin"
            >
              Start a new admin sign-in
            </a>
          ) : null}
        </section>
      ) : (
        <section className="frame identity-panel">
          <h2>
            {admin ? "Administrator account" : "Sign in or create an account"}
          </h2>
          <p className="identity-note">
            {admin
              ? "Only an existing administrator can continue."
              : "New accounts use a verified Google or Discord identity. Already have a password account? You can keep using it below."}
          </p>
          <form
            action={`/api/identity/flow/${id}/provider/google`}
            method="post"
            className="identity-form"
          >
            <TermsFields flow={flow} />
            <div className="identity-providers">
              <button
                className="btn btn-ghost"
                type="submit"
                disabled={!flow.providers.google}
                formAction={`/api/identity/flow/${id}/provider/google`}
              >
                <span className="identity-provider-mark" aria-hidden="true">
                  <Image
                    src="/identity/google-signin.png"
                    alt=""
                    width={40}
                    height={40}
                    loading="eager"
                    unoptimized
                  />
                </span>
                <span className="identity-provider-label">
                  Continue with Google
                </span>
              </button>
              <button
                className="btn btn-discord"
                type="submit"
                disabled={!flow.providers.discord}
                formAction={`/api/identity/flow/${id}/provider/discord`}
              >
                <span className="identity-provider-mark" aria-hidden="true">
                  <Image
                    src="/identity/discord-white.svg"
                    alt=""
                    width={28}
                    height={21}
                    loading="eager"
                    unoptimized
                  />
                </span>
                <span className="identity-provider-label">
                  Continue with Discord
                </span>
              </button>
            </div>
            {!flow.providers.google || !flow.providers.discord ? (
              <p className="identity-note">
                {!flow.providers.google && !flow.providers.discord
                  ? "Google and Discord sign-in are not configured yet. Existing password accounts can still sign in below."
                  : `${!flow.providers.google ? "Google" : "Discord"} sign-in is not configured yet. Use an available method.`}
              </p>
            ) : null}
          </form>
          <details className="identity-password">
            <summary>Use an existing password account</summary>
            <form
              action={`/api/identity/flow/${id}/password`}
              method="post"
              className="identity-form"
            >
              <label>
                Email or username
                <input
                  name="emailOrUsername"
                  autoComplete="username"
                  maxLength={254}
                  required
                  spellCheck={false}
                  autoCapitalize="none"
                />
              </label>
              <label>
                Password
                <input
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  maxLength={200}
                  required
                />
              </label>
              <TermsFields flow={flow} />
              <button className="btn btn-primary" type="submit">
                Sign in with password
              </button>
              <p className="identity-note">
                This signs in to an existing account. New password signup and
                password-reset emails are not available.
              </p>
            </form>
          </details>
        </section>
      )}
      <p className="identity-bounds">
        Comparisons, stores, AED prices and build services support the UAE.
        Installing the extension is available worldwide.
      </p>
    </IdentityShell>
  )
}
