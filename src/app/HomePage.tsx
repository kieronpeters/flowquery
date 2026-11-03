import { Link } from 'react-router-dom'

/**
 * Temporary landing page for M2.
 *
 * The real route `/` becomes the board dashboard in M4. Until boards can be
 * created, it exists only to reach the seeded demo board.
 */
export function HomePage() {
  return (
    <main className="page">
      <h1>FlowQuery</h1>
      <p className="lede">
        A small, private Kanban board. This is the M2 walking skeleton: data comes from the
        database, and nothing can be edited yet.
      </p>

      <nav className="home-links" aria-label="Boards">
        <Link className="button" to="/boards/brd_demo">
          Open the demo board
        </Link>
      </nav>

      <p className="note">
        The board dashboard and sign-in arrive in later milestones. Unknown paths return here.
      </p>
    </main>
  )
}
