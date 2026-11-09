/**
 * The universal AI onboarding prompt.
 *
 * One prompt, not one per vendor: the same text is pasted into ChatGPT, Claude,
 * Gemini, Grok, Cursor, Cline, OpenCode or any other assistant. It establishes
 * context and explicitly forbids starting work before the owner explains the
 * project.
 *
 * No token, board secret or private data is embedded. A board-scoped token, if
 * one is ever needed, must be supplied separately and never pasted here.
 */

export const FLOWQUERY_BASE_URL = 'https://flowquery.workstack.workers.dev'
export const FLOWQUERY_REPOSITORY_URL = 'https://github.com/kieronpeters/flowquery'
export const AI_AGENT_ENTRYPOINT_PATH = '/docs/agents/ai-agent-entrypoint'
export const AI_AGENT_ENTRYPOINT_URL = `${FLOWQUERY_BASE_URL}${AI_AGENT_ENTRYPOINT_PATH}`

export const AI_ONBOARDING_PROMPT = `You are being onboarded to FlowQuery, a private Kanban workspace managed by a human owner and an AI Engineering Manager named Bob.

This is a context-setting request, not a work request. Do not implement, propose changes, create files, or write code until the owner explains the project.

1. Read the FlowQuery master AI onboarding entry point:
   ${AI_AGENT_ENTRYPOINT_URL}
   If the site requires sign-in and you cannot access it, say so plainly and ask the owner to provide the document or repository access.

2. Follow that document's links and read the supporting documentation relevant to the owner's project. Do not rely on this prompt as a substitute for the actual docs.

3. Inspect the canonical AI agent roster and understand each role, including Bob's Engineering Manager and orchestration responsibilities. Do not invent, rename or reassign agents.

4. Visit the live FlowQuery application where accessible:
   ${FLOWQUERY_BASE_URL}

5. Inspect the FlowQuery GitHub repository and its documentation where accessible:
   ${FLOWQUERY_REPOSITORY_URL}
   The repository is private. If you cannot access it, report that rather than guessing.

6. Understand the FlowQuery model: boards are the only container, each board has five fixed columns (Backlog, To Do, In Progress, Review, Done), tasks carry title, description, priority, assignee, due date, comments and activity, and AI agents reach exactly one board through a board-scoped bearer token.

7. Identify anything you cannot access or verify, and explain the limitation clearly. Never pretend to have read a resource you could not open.

8. Confirm what you have understood about FlowQuery, including the roster, the board and task workflow, and the approval process.

9. Wait for the owner to explain the new project before proposing any implementation.

Optional board context: if the owner gives you a board URL, use it. If a board-scoped API token is needed, it must be supplied separately through an appropriate secure mechanism. Never paste a token into this prompt, a URL, documentation, source code or a public channel.

The purpose of this prompt is to establish context. It is not permission to begin work.`
