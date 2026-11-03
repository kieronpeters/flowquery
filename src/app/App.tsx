import { Navigate, Route, Routes } from 'react-router-dom'

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
        <span className="phase">M8 · release candidate</span>
      </header>

      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/boards" element={<BoardsPage />} />
        <Route path="/boards/:boardId" element={<BoardPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}
