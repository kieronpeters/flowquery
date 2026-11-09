import { lazy, Suspense } from 'react'
import { NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom'

import { AboutPage } from './AboutPage'
import { AgentPage } from './AgentPage'
import { BoardPage } from './BoardPage'
import { BoardsPage } from './BoardsPage'
import { ErrorBoundary } from './ErrorBoundary'
import { HomePage } from './HomePage'
import { LoginPage } from './LoginPage'
import { PeoplePage } from './PeoplePage'
import { ProfileMenu } from './ProfileMenu'
import { ProfilePage } from './ProfilePage'
import { SignupPage } from './SignupPage'

// The Markdown renderer is only needed on the docs route, so keep it out of the
// main bundle and load it when someone opens the documentation.
const DocsPage = lazy(() => import('./DocsPage').then((module) => ({ default: module.DocsPage })))

function navClass(active: boolean): string {
  return active ? 'app-nav-link app-nav-link-active' : 'app-nav-link'
}

export function App() {
  const { pathname } = useLocation()
  // A profile page belongs to the People section even though its URL is under
  // /profiles, so the tab stays highlighted while reading someone's profile.
  const peopleActive = pathname === '/people' || pathname.startsWith('/profiles/')

  return (
    <div className="app">
      <header className="app-header">
        <a className="brand" href="/" aria-label="FlowQuery home">
          <img src="/brand/logos/flowquery-logo-dark.png" alt="FlowQuery" width={131} height={32} />
        </a>

        <nav className="app-nav" aria-label="Primary">
          <NavLink to="/boards" className={({ isActive }) => navClass(isActive)}>
            Boards
          </NavLink>
          <NavLink to="/people" className={({ isActive }) => navClass(isActive || peopleActive)}>
            People
          </NavLink>
          <NavLink to="/docs" className={({ isActive }) => navClass(isActive)}>
            Docs
          </NavLink>
          <NavLink to="/about" className={({ isActive }) => navClass(isActive)}>
            About
          </NavLink>
          <NavLink to="/agent" className={({ isActive }) => navClass(isActive)}>
            Test a token
          </NavLink>
        </nav>

        <ProfileMenu />
      </header>

      <ErrorBoundary>
        <Suspense
          fallback={
            <main className="page">
              <p role="status">Loading documentation…</p>
            </main>
          }
        >
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/boards" element={<BoardsPage />} />
            <Route path="/boards/:boardId" element={<BoardPage />} />
            <Route path="/boards/:boardId/tickets/:ticketId" element={<BoardPage />} />
            <Route path="/agent" element={<AgentPage />} />
            <Route path="/agents" element={<Navigate to="/people" replace />} />
            <Route path="/docs" element={<DocsPage />} />
            <Route path="/docs/*" element={<DocsPage />} />
            <Route path="/people" element={<PeoplePage />} />
            <Route path="/profiles/:profileId" element={<ProfilePage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>

      <footer className="app-footer">
        <a className="footer-brand" href="/">
          <img src="/brand/logos/flowquery-logo-dark.png" alt="FlowQuery" width={82} height={20} />
        </a>
      </footer>
    </div>
  )
}
