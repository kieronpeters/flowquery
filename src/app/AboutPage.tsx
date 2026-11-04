import { Link } from 'react-router-dom'

/**
 * What this is, for the one person who lands here without being told.
 *
 * Deliberately plain: the product is two people and a handful of boards, and a
 * page that oversells it would be the first thing to feel dishonest.
 */
export function AboutPage() {
  return (
    <main className="page page-narrow about">
      <h1>About FlowQuery</h1>

      <p className="lede">
        A small, private Kanban board for planning and tracking real work — built for two people and
        a team of AI agents.
      </p>

      <section>
        <h2 className="section-heading">Why it exists</h2>
        <p>
          Most board tools are built for organisations: teams, permissions, custom fields,
          notifications. FlowQuery is the opposite. Five fixed columns, boards as the only
          container, and one API for an AI agent to read and update work on a single board.
        </p>
      </section>

      <section>
        <h2 className="section-heading">The columns</h2>
        <p>
          Backlog, To Do, In Progress, Review and Done. They cannot be renamed, reordered or added
          to, so “In Progress” means the same thing to both of us without anyone maintaining a
          configuration.
        </p>
      </section>

      <section>
        <h2 className="section-heading">Access</h2>
        <p>
          Sign-in is GitHub OAuth, checked against a server-side allowlist of two numeric account
          ids. There is no public sign-up and no password to reset — the allowlist is the whole
          access control.
        </p>
      </section>

      <section>
        <h2 className="section-heading">Agents</h2>
        <p>
          AI specialists are assignee profiles, never accounts. An agent reaches exactly one board
          through a scoped token, can only manage tasks and comments there, and cannot touch boards
          or see any other board. Every change it makes is attributed — you will see “Bob (agent)”
          in the activity history next to your own “Kieron (human)”.
        </p>
      </section>

      <section>
        <h2 className="section-heading">What it deliberately is not</h2>
        <p>
          No organisations, projects or workspaces. No custom fields. No email notifications. No
          public or anonymous board links. No archive — deleting a board is permanent and asks you
          to type its name.
        </p>
      </section>

      <section>
        <h2 className="section-heading">Privacy and cost</h2>
        <p>
          A private instance: no analytics, no third-party scripts, no external fonts or images. It
          runs on Cloudflare Workers Free and D1 Free, which is why the recurring cost is zero and
          why there is no paid tier to grow into.
        </p>
      </section>

      <p className="note">
        <Link to="/">Back to the board</Link>
      </p>
    </main>
  )
}
