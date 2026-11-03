import { Navigate, Route, Routes } from 'react-router-dom'

import { BoardPage } from './BoardPage'
import { HomePage } from './HomePage'

export function App() {
  return (
    <div className="app">
      <header className="app-header">
        <a className="brand" href="/">
          FlowQuery
        </a>
        <span className="phase">M2 · read-only preview</span>
      </header>

      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/boards/:boardId" element={<BoardPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}
