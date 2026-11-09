import { useState } from 'react'

import { AI_ONBOARDING_PROMPT } from '../shared/ai-onboarding'
import { copyText } from './clipboard'

/**
 * The universal AI onboarding panel on the Boards landing page.
 *
 * One prompt, one button. The logos are shown as a visual shorthand for
 * "works with the assistant you already use"; they are not separate
 * integrations and imply no affiliation.
 */

const TOOLS = [
  { name: 'OpenAI', src: '/brand/ai/openai.svg' },
  { name: 'Claude', src: '/brand/ai/claude.svg' },
  { name: 'Gemini', src: '/brand/ai/gemini.svg' },
  { name: 'DeepSeek', src: '/brand/ai/deepseek.svg' },
  { name: 'Grok', src: '/brand/ai/grok.svg' },
  { name: 'Meta AI', src: '/brand/ai/meta-ai.svg' },
  { name: 'GitHub Copilot', src: '/brand/ai/github-copilot.svg' },
  { name: 'Cursor', src: '/brand/ai/cursor.svg' },
  { name: 'Cline', src: '/brand/ai/cline.svg' },
  { name: 'OpenCode', src: '/brand/ai/opencode.svg' },
]

type CopyState = 'idle' | 'copied' | 'error'

export function AiOnboardingPanel() {
  const [state, setState] = useState<CopyState>('idle')

  async function copyPrompt() {
    try {
      await copyText(AI_ONBOARDING_PROMPT)
      setState('copied')
    } catch {
      setState('error')
    }
  }

  return (
    <section className="ai-onboarding" aria-labelledby="ai-onboarding-title">
      <div className="ai-onboarding-main">
        <p className="ai-onboarding-eyebrow">Universal AI onboarding</p>
        <h2 id="ai-onboarding-title">Bring your AI agent into FlowQuery</h2>
        <p className="ai-onboarding-copy">
          Give ChatGPT, DeepSeek, Claude or any AI coding agent the context it needs to understand
          your FlowQuery workspace and workflow.
        </p>

        <div className="ai-onboarding-actions">
          <button className="button button-primary" type="button" onClick={() => void copyPrompt()}>
            {state === 'copied' ? 'Copied' : 'Copy AI onboarding prompt'}
          </button>

          {state === 'copied' && (
            <span className="ai-onboarding-feedback" role="status">
              Prompt copied to clipboard.
            </span>
          )}
          {state === 'error' && (
            <span className="ai-onboarding-feedback" role="alert">
              Could not copy. Select the prompt below.
            </span>
          )}
        </div>

        {state === 'error' && (
          <textarea
            className="input textarea ai-onboarding-fallback"
            readOnly
            value={AI_ONBOARDING_PROMPT}
            aria-label="AI onboarding prompt"
          />
        )}

        <p className="ai-onboarding-note">
          Paste it into any assistant before explaining your project. No tokens or board data are
          included.
        </p>
      </div>

      <ul className="ai-logo-grid" aria-label="Works with these AI tools">
        {TOOLS.map((tool) => (
          <li className="ai-logo" key={tool.name} title={tool.name}>
            <img src={tool.src} alt={tool.name} width={24} height={24} loading="lazy" />
          </li>
        ))}
      </ul>

      <p className="ai-onboarding-legal">
        Logos are trademarks of their respective owners. FlowQuery is not affiliated with them.
      </p>
    </section>
  )
}
