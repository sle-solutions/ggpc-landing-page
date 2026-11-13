import {
  EVENT_LABELS,
  SCREEN_LABELS,
  type UsageDashboard,
} from "@/lib/identity/protocol"
import { IdentityShell } from "./identity-shell"
const number = (n: number) => new Intl.NumberFormat("en-US").format(n)
const percent = (a: number, b: number) =>
  b ? `${Math.round((a / b) * 100)}%` : "Not measured"
export function retainedRange(now = new Date()) {
  const today = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  )
  return {
    min: new Date(+today - 29 * 86_400_000).toISOString().slice(0, 10),
    max: today.toISOString().slice(0, 10),
  }
}
export function dailySeries(data: UsageDashboard) {
  const map = new Map(data.daily.map((r) => [r.day, r]))
  const rows = []
  for (
    let day = new Date(data.filters.from + "T00:00:00Z");
    day.toISOString().slice(0, 10) <= data.filters.to;
    day = new Date(+day + 86_400_000)
  ) {
    const key = day.toISOString().slice(0, 10)
    rows.push(map.get(key) ?? { day: key, events: 0, users: 0, sessions: 0 })
  }
  return rows
}
function Filters({
  data,
  query,
}: {
  data: UsageDashboard | null
  query: Record<string, string>
}) {
  const range = retainedRange(),
    selected = query.version || data?.filters.version || "",
    unknown =
      !!selected &&
      /^\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(selected) &&
      !data?.versions.some((r) => r.version === selected)
  return (
    <form
      action="/admin/usage"
      method="get"
      className="usage-filters"
      aria-label="Usage filters"
    >
      <label>
        From (UTC)
        <input
          type="date"
          name="from"
          min={range.min}
          max={range.max}
          defaultValue={query.from || data?.filters.from || range.min}
          required
        />
      </label>
      <label>
        Through (UTC)
        <input
          type="date"
          name="to"
          min={range.min}
          max={range.max}
          defaultValue={query.to || data?.filters.to || range.max}
          required
        />
      </label>
      <label>
        Extension version
        <select
          name="version"
          defaultValue={query.version || data?.filters.version || ""}
        >
          <option value="">All versions</option>
          {unknown ? (
            <option value={selected}>{selected} (no retained events)</option>
          ) : null}
          {data?.versions.map((r) => (
            <option key={r.version} value={r.version}>
              {r.version}
            </option>
          ))}
        </select>
      </label>
      <button className="btn btn-primary" type="submit">
        Apply filters
      </button>
      <a className="text-link" href="/admin/usage">
        Reset
      </a>
    </form>
  )
}
function Table({
  caption,
  children,
}: {
  caption: string
  children: React.ReactNode
}) {
  return (
    <div
      className="usage-table-wrap"
      role="region"
      aria-label={caption}
      tabIndex={0}
    >
      <table>
        <caption>{caption}</caption>
        {children}
      </table>
    </div>
  )
}
function Daily({ data }: { data: UsageDashboard }) {
  const series = dailySeries(data),
    max = Math.max(1, ...series.map((r) => r.events))
  return (
    <section className="usage-section">
      <h2>Recorded activity</h2>
      <p>
        Received events by UTC day. A zero means no consented events were
        recorded, not that nobody used the extension.
      </p>
      <div className="usage-chart">
        <svg
          viewBox="0 0 900 180"
          role="img"
          aria-label={`Daily recorded events from ${data.filters.from} through ${data.filters.to}. Exact counts are in the table below.`}
        >
          <line x1="0" y1="160" x2="900" y2="160" stroke="currentColor" />
          {series.map((r, i) => {
            const h = (r.events / max) * 145
            return (
              <rect
                key={r.day}
                x={(i * 900) / series.length + 2}
                y={160 - h}
                width={Math.max(1, 900 / series.length - 4)}
                height={h}
                fill="var(--red)"
              />
            )
          })}
        </svg>
        <div className="usage-chart-range">
          <span>{data.filters.from}</span>
          <span>{number(max)} events at the top</span>
          <span>{data.filters.to}</span>
        </div>
      </div>
      <details>
        <summary>Show exact daily counts</summary>
        <Table caption="Daily recorded counts">
          <thead>
            <tr>
              <th scope="col">UTC day</th>
              <th scope="col">Events</th>
              <th scope="col">Users</th>
              <th scope="col">Sessions</th>
            </tr>
          </thead>
          <tbody>
            {series.map((r) => (
              <tr key={r.day}>
                <th scope="row">{r.day}</th>
                <td>{number(r.events)}</td>
                <td>{number(r.users)}</td>
                <td>{number(r.sessions)}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </details>
    </section>
  )
}
function Funnel({ data }: { data: UsageDashboard }) {
  const steps: [[string, number], ...[string, number][]] = [
    ["Panel opened", data.funnel.opened],
    ["Search completed", data.funnel.searched],
    ["Comparison completed", data.funnel.compared],
    ["Part added", data.funnel.built],
    ["Purchase plan opened", data.funnel.planned],
    ["Website handoff", data.funnel.websiteHandoff],
  ]
  return (
    <section className="usage-section">
      <h2>Where the path drops off</h2>
      <p>
        Sessions completing these successful actions in this exact order. Other
        routes through the app are not counted as this funnel.
      </p>
      <Table caption="Ordered session funnel">
        <thead>
          <tr>
            <th scope="col">Step</th>
            <th scope="col">Sessions</th>
            <th scope="col">From previous step</th>
            <th scope="col">Dropped off</th>
          </tr>
        </thead>
        <tbody>
          {steps.map(([name, n], i) => (
            <tr key={name}>
              <th scope="row">{name}</th>
              <td>{number(n)}</td>
              <td>{i ? percent(n, steps[i - 1][1]) : "Start"}</td>
              <td>
                {i
                  ? number(Math.max(0, steps[i - 1][1] - n))
                  : "Not applicable"}
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </section>
  )
}
const duration = [
  "Under 1 second",
  "1 to under 3 seconds",
  "3 to under 10 seconds",
  "10 seconds or more",
]
const results = ["0", "1 to 5", "6 to 20", "21 or more"]
export function UsageView({
  data,
  csrf,
  authorized,
  error,
  query = {},
}: {
  data: UsageDashboard | null
  csrf?: string
  authorized: boolean
  error?: string
  query?: Record<string, string>
}) {
  return (
    <IdentityShell dashboard>
      <div className="usage-heading">
        <div>
          <h1>Feature usage</h1>
          <p>One place to see how people move through GG PC.</p>
        </div>
        {authorized && csrf ? (
          <form action="/api/identity/admin/logout" method="post">
            <input type="hidden" name="csrf" value={csrf} />
            <button className="btn btn-ghost" type="submit">
              Sign out
            </button>
          </form>
        ) : null}
      </div>
      {!authorized ? (
        <section className="frame identity-panel">
          <h2>Admin sign-in required</h2>
          <p>
            This dashboard is private. Sign in with an account that has
            administrator access.
          </p>
          {error ? <p role="alert">{error}</p> : null}
          <a
            className="btn btn-primary"
            href="/api/identity/browser/begin?mode=admin"
          >
            Admin sign-in
          </a>
        </section>
      ) : (
        <>
          <Filters data={data} query={query} />
          {error ? (
            <div className="identity-message" role="alert">
              {error}
            </div>
          ) : null}
          {data ? (
            <>
              <section className="usage-coverage">
                <h2>What this report covers</h2>
                <p>
                  Only users who opted in are measured. Nonconsenting activity
                  is not measured.
                </p>
                <p>
                  <strong>
                    {number(data.population.currentlyConsentingAccounts)} of{" "}
                    {number(data.population.eligibleAccounts)}
                  </strong>{" "}
                  currently eligible accounts have analytics enabled. This is
                  the current consent population, not a history of consent in
                  the selected range.
                </p>
                <p>
                  Raw usage is retained for 30 days. The range and daily counts
                  use UTC. No account identities, browsing history, searches,
                  part details or prices appear here.
                </p>
                <p className="usage-updated">
                  Updated{" "}
                  {new Intl.DateTimeFormat("en-US", {
                    dateStyle: "medium",
                    timeStyle: "short",
                    timeZone: "Asia/Dubai",
                  }).format(new Date(data.generatedAt))}{" "}
                  Dubai time.
                </p>
              </section>
              <dl className="usage-summary">
                <div>
                  <dt>Recorded events</dt>
                  <dd>{number(data.summary.events)}</dd>
                </div>
                <div>
                  <dt>Opted-in active users</dt>
                  <dd>{number(data.summary.users)}</dd>
                </div>
                <div>
                  <dt>Browser sessions</dt>
                  <dd>{number(data.summary.sessions)}</dd>
                </div>
              </dl>
              {data.summary.events === 0 ? (
                <section className="frame identity-panel usage-empty">
                  <h2>No feature events in this range</h2>
                  <p>
                    Patterns appear after people explicitly enable usage
                    analytics and use the extension. Try a different retained
                    date range or version. Nothing is filled with sample data.
                  </p>
                </section>
              ) : (
                <>
                  <Daily data={data} />
                  <section className="usage-section">
                    <h2>Features people use</h2>
                    <Table caption="Feature adoption and outcomes">
                      <thead>
                        <tr>
                          <th scope="col">Feature</th>
                          <th scope="col">Outcome</th>
                          <th scope="col">Events</th>
                          <th scope="col">Users</th>
                          <th scope="col">Sessions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.features.map((r) => (
                          <tr key={`${r.event}:${r.outcome}`}>
                            <th scope="row">{EVENT_LABELS[r.event]}</th>
                            <td>{r.outcome}</td>
                            <td>{number(r.events)}</td>
                            <td>{number(r.users)}</td>
                            <td>{number(r.sessions)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </section>
                  <Funnel data={data} />
                  <section className="usage-section">
                    <h2>Common paths</h2>
                    <p>
                      Screen paths need at least three sessions. Adjacent
                      repeats are collapsed, and each path stops after 20
                      screens.
                    </p>
                    {data.paths.length ? (
                      <Table caption="Most common screen paths">
                        <thead>
                          <tr>
                            <th scope="col">Path</th>
                            <th scope="col">Sessions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.paths.map((r) => (
                            <tr key={r.path}>
                              <th scope="row">
                                {r.path
                                  .split(" > ")
                                  .map(
                                    (s) =>
                                      SCREEN_LABELS[
                                        s as keyof typeof SCREEN_LABELS
                                      ],
                                  )
                                  .join(" → ")}
                              </th>
                              <td>{number(r.sessions)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    ) : (
                      <p className="usage-empty-line">
                        Not enough matching sessions to show common paths.
                      </p>
                    )}
                  </section>
                  <section className="usage-section">
                    <h2>Do people come back?</h2>
                    <div className="usage-columns">
                      <Table caption="Active days within this range">
                        <thead>
                          <tr>
                            <th scope="col">Active days</th>
                            <th scope="col">Users</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.repeated.map((r) => (
                            <tr key={r.bucket}>
                              <th scope="row">{r.bucket}</th>
                              <td>{number(r.users)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                      <Table caption="First-observed weekly cohorts in this range">
                        <thead>
                          <tr>
                            <th scope="col">Week starting</th>
                            <th scope="col">Users</th>
                            <th scope="col">Active on 2+ days</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.cohorts.map((r) => (
                            <tr key={r.week}>
                              <th scope="row">{r.week}</th>
                              <td>{number(r.users)}</td>
                              <td>
                                {number(r.repeatUsers)} (
                                {percent(r.repeatUsers, r.users)})
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </div>
                    <p>
                      A cohort starts at the first event observed within this
                      range. It is not a first-ever signup or activation cohort.
                    </p>
                  </section>
                  <section className="usage-section">
                    <h2>Errors and response patterns</h2>
                    <p>
                      Bounded outcome categories only. No error messages, stack
                      traces, URLs or account-level activity.
                    </p>
                    <Table caption="Outcomes, duration and result-count buckets">
                      <thead>
                        <tr>
                          <th scope="col">Feature</th>
                          <th scope="col">Outcome</th>
                          <th scope="col">Error category</th>
                          <th scope="col">Duration</th>
                          <th scope="col">Result count</th>
                          <th scope="col">Events</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.buckets.map((r, i) => (
                          <tr key={i}>
                            <th scope="row">{EVENT_LABELS[r.event]}</th>
                            <td>{r.outcome}</td>
                            <td>{r.error ?? "None"}</td>
                            <td>
                              {r.durationBucket === null
                                ? "Not measured"
                                : duration[r.durationBucket]}
                            </td>
                            <td>
                              {r.resultBucket === null
                                ? "Not measured"
                                : results[r.resultBucket]}
                            </td>
                            <td>{number(r.events)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </section>
                </>
              )}
            </>
          ) : null}
        </>
      )}
    </IdentityShell>
  )
}
