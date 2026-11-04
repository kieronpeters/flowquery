import { Navigate, Route, Routes } from 'react-router-dom'

import { AboutPage } from './AboutPage'
import { AgentPage } from './AgentPage'
import { AgentsPage } from './AgentsPage'
import { BoardPage } from './BoardPage'
import { BoardsPage } from './BoardsPage'
import { HomePage } from './HomePage'
import { LoginPage } from './LoginPage'
import { ProfileMenu } from './ProfileMenu'
import { SignupPage } from './SignupPage'

export function App() {
  return (
    <div className="app">
      <header className="app-header">
        <a className="brand" href="/" aria-label="FlowQuery home">
          <img src="/brand/flowquery-wordmark.png" alt="FlowQuery" width={131} height={32} />
        </a>
        <ProfileMenu />
      </header>

      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/boards" element={<BoardsPage />} />
        <Route path="/boards/:boardId" element={<BoardPage />} />
        <Route path="/agent" element={<AgentPage />} />
        <Route path="/agents" element={<AgentsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <footer className="app-footer">
        <a className="footer-brand" href="/">
          <img src="/brand/flowquery-wordmark.png" alt="FlowQuery" height={20} />
        </a>

        <nav aria-label="Footer">
          <a href="/about">About</a>
          <a href="/agents">Agents</a>
          <a href="/agent">Agent access</a>
        </nav>
      </footer>
    </div>
  )
}
