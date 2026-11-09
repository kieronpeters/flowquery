import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'

import { AboutPage } from './AboutPage'
import { AgentPage } from './AgentPage'
import { AgentsPage } from './AgentsPage'
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

export function App() {
  return (
    <div className="app">
      <header className="app-header">
        <a className="brand" href="/" aria-label="FlowQuery home">
          <img src="/brand/logos/flowquery-logo-dark.png" alt="FlowQuery" width={131} height={32} />
        </a>
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
            <Route path="/agent" element={<AgentPage />} />
            <Route path="/agents" element={<AgentsPage />} />
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

        <nav aria-label="Footer">
          <a href="/about">About</a>
          <a href="/docs">Docs</a>
          <a href="/people">People</a>
          <a href="/agents">Agents</a>
          <a href="/agent">Test a token</a>
        </nav>
      </footer>
    </div>
  )
}
