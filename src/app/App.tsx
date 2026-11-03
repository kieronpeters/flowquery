import { Navigate, Route, Routes } from 'react-router-dom'

import { AgentPage } from './AgentPage'
import { BoardPage } from './BoardPage'
import { BoardsPage } from './BoardsPage'
import { HomePage } from './HomePage'
import { LoginPage } from './LoginPage'
import { SignupPage } from './SignupPage'

export function App() {
  return (
    <div className="app">
      <header className="app-header">
        <a className="brand" href="/">
          FlowQuery
        </a>
      </header>

      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/boards" element={<BoardsPage />} />
        <Route path="/boards/:boardId" element={<BoardPage />} />
        <Route path="/agent" element={<AgentPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}
