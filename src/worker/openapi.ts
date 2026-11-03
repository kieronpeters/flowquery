/**
 * OpenAPI 3.1 description of the FlowQuery API (API-004).
 *
 * Hand-written on purpose: the routes are few, and a generated document would
 * still need this much curation to be useful. It is served at
 * `/api/v1/openapi.json` so Bob — or anyone with the URL — can read the
 * contract without reading the source.
 */

const errorSchema = {
  type: 'object',
  required: ['error'],
  properties: {
    error: {
      type: 'object',
      required: ['code', 'message'],
      properties: {
        code: { type: 'string' },
        message: { type: 'string' },
        fields: { type: 'object', additionalProperties: { type: 'string' } },
      },
    },
  },
} as const

const taskSchema = {
  type: 'object',
  required: ['id', 'title', 'status', 'position', 'priority', 'version'],
  properties: {
    id: { type: 'string' },
    title: { type: 'string', maxLength: 200 },
    description: { type: 'string' },
    descriptionTruncated: { type: 'boolean' },
    status: { type: 'string', enum: ['backlog', 'todo', 'in_progress', 'review', 'done'] },
    position: { type: 'integer', minimum: 0 },
    priority: { type: 'string', enum: ['none', 'low', 'medium', 'high', 'urgent'] },
    assignee: {
      type: ['object', 'null'],
      properties: {
        id: { type: 'string' },
        displayName: { type: 'string' },
        roleTitle: { type: 'string' },
      },
    },
    dueDate: { type: ['string', 'null'], description: 'YYYY-MM-DD' },
    version: { type: 'integer' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
} as const

const commentSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    taskId: { type: 'string' },
    authorType: { type: 'string', enum: ['human', 'agent'] },
    authorName: { type: 'string' },
    body: { type: 'string', maxLength: 10000 },
    createdAt: { type: 'string', format: 'date-time' },
  },
} as const

const activitySchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    taskId: { type: ['string', 'null'] },
    actorType: { type: 'string', enum: ['human', 'agent', 'system'] },
    actorName: { type: 'string' },
    eventType: { type: 'string' },
    payload: { type: 'object', additionalProperties: true },
    createdAt: { type: 'string', format: 'date-time' },
  },
} as const

const json = (schema: object) => ({
  description: 'OK',
  content: { 'application/json': { schema } },
})

const errorResponse = (description: string) => ({
  description,
  content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
})

const boardIdParam = {
  name: 'boardId',
  in: 'path',
  required: true,
  schema: { type: 'string' },
} as const

const taskIdParam = {
  name: 'taskId',
  in: 'path',
  required: true,
  schema: { type: 'string' },
} as const

export const openApiDocument = {
  openapi: '3.1.0',
  info: {
    title: 'FlowQuery API',
    version: '1.0.0',
    description:
      'Two doors, one application. Human routes use a session cookie; /agent routes use a board-scoped bearer token. An agent token cannot reach any board other than its own, and no agent route accepts a board identifier.',
  },
  servers: [{ url: '/api/v1' }],
  security: [{ sessionCookie: [] }],
  components: {
    securitySchemes: {
      sessionCookie: { type: 'apiKey', in: 'cookie', name: '__Host-fq_session' },
      agentToken: { type: 'http', scheme: 'bearer', bearerFormat: 'fq_...' },
    },
    schemas: {
      Error: errorSchema,
      Task: taskSchema,
      Comment: commentSchema,
      ActivityEvent: activitySchema,
      Board: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
          taskCount: { type: 'integer' },
        },
      },
      BoardView: {
        type: 'object',
        properties: {
          board: { $ref: '#/components/schemas/Board' },
          columns: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                key: { type: 'string' },
                name: { type: 'string' },
                position: { type: 'integer' },
                taskCount: { type: 'integer' },
                tasks: { type: 'array', items: { $ref: '#/components/schemas/Task' } },
              },
            },
          },
        },
      },
      TaskInput: {
        type: 'object',
        required: ['title'],
        properties: {
          title: { type: 'string', minLength: 1, maxLength: 200 },
          description: { type: 'string', maxLength: 20000 },
          status: { type: 'string', enum: ['backlog', 'todo', 'in_progress', 'review', 'done'] },
          priority: { type: 'string', enum: ['none', 'low', 'medium', 'high', 'urgent'] },
          assigneeProfileId: { type: ['string', 'null'] },
          dueDate: { type: ['string', 'null'], description: 'YYYY-MM-DD' },
        },
      },
      TaskPatch: {
        type: 'object',
        properties: {
          title: { type: 'string', minLength: 1, maxLength: 200 },
          description: { type: 'string', maxLength: 20000 },
          status: { type: 'string', enum: ['backlog', 'todo', 'in_progress', 'review', 'done'] },
          priority: { type: 'string', enum: ['none', 'low', 'medium', 'high', 'urgent'] },
          assigneeProfileId: { type: ['string', 'null'] },
          dueDate: { type: ['string', 'null'] },
          expectedVersion: { type: 'integer', minimum: 1 },
        },
      },
      MoveInput: {
        type: 'object',
        required: ['status', 'position'],
        properties: {
          status: { type: 'string', enum: ['backlog', 'todo', 'in_progress', 'review', 'done'] },
          position: {
            type: 'integer',
            minimum: 0,
            description: 'Final index in the target column',
          },
          expectedVersion: { type: 'integer', minimum: 1 },
        },
      },
    },
  },
  paths: {
    '/health': {
      get: { summary: 'Liveness', security: [], responses: { '200': json({ type: 'object' }) } },
    },
    '/columns': {
      get: {
        summary: 'The five fixed columns',
        security: [],
        responses: { '200': json({ type: 'object' }) },
      },
    },
    '/profiles': {
      get: {
        summary: 'Assignable profiles',
        responses: { '200': json({ type: 'object' }), '401': errorResponse('Not signed in') },
      },
    },
    '/auth/start': {
      get: {
        summary: 'Begin GitHub sign-in',
        security: [],
        parameters: [{ name: 'next', in: 'query', schema: { type: 'string' } }],
        responses: {
          '302': { description: 'Redirect to GitHub' },
          '503': errorResponse('Not configured'),
        },
      },
    },
    '/auth/callback': {
      get: {
        summary: 'GitHub callback',
        security: [],
        parameters: [
          { name: 'code', in: 'query', schema: { type: 'string' } },
          { name: 'state', in: 'query', schema: { type: 'string' } },
        ],
        responses: { '302': { description: 'Redirect to /boards or /login?error=' } },
      },
    },
    '/auth/me': {
      get: {
        summary: 'Current identity',
        responses: { '200': json({ type: 'object' }), '401': errorResponse('Not signed in') },
      },
    },
    '/auth/logout': {
      post: {
        summary: 'End the session',
        responses: { '204': { description: 'Signed out' }, '403': errorResponse('Cross-origin') },
      },
    },
    '/boards': {
      get: {
        summary: 'List boards',
        responses: { '200': json({ type: 'object' }), '401': errorResponse('Not signed in') },
      },
      post: {
        summary: 'Create a board',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name'],
                properties: { name: { type: 'string', maxLength: 120 } },
              },
            },
          },
        },
        responses: {
          '201': json({ $ref: '#/components/schemas/Board' }),
          '400': errorResponse('Invalid name'),
        },
      },
    },
    '/boards/{boardId}': {
      parameters: [boardIdParam],
      get: {
        summary: 'Board view',
        responses: {
          '200': json({ $ref: '#/components/schemas/BoardView' }),
          '404': errorResponse('Unknown board'),
        },
      },
      patch: {
        summary: 'Rename a board',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name'],
                properties: { name: { type: 'string' } },
              },
            },
          },
        },
        responses: { '200': json({ type: 'object' }), '404': errorResponse('Unknown board') },
      },
      delete: {
        summary: 'Permanently delete a board',
        description:
          'Requires the exact board name. Cascades to tasks, comments, activity and tokens.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['confirmName'],
                properties: { confirmName: { type: 'string' } },
              },
            },
          },
        },
        responses: {
          '204': { description: 'Deleted' },
          '404': errorResponse('Unknown board'),
          '409': errorResponse('Name did not match'),
        },
      },
    },
    '/boards/{boardId}/tokens': {
      parameters: [boardIdParam],
      get: { summary: 'List agent tokens', responses: { '200': json({ type: 'object' }) } },
      post: {
        summary: 'Create an agent token',
        description: 'The plaintext token is returned once and never again.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['label'],
                properties: { label: { type: 'string', maxLength: 80 } },
              },
            },
          },
        },
        responses: { '201': json({ type: 'object' }), '400': errorResponse('Invalid label') },
      },
    },
    '/boards/{boardId}/tokens/{tokenId}': {
      parameters: [
        boardIdParam,
        { name: 'tokenId', in: 'path', required: true, schema: { type: 'string' } },
      ],
      delete: {
        summary: 'Revoke an agent token',
        responses: { '204': { description: 'Revoked' }, '404': errorResponse('Unknown token') },
      },
    },
    '/boards/{boardId}/tasks': {
      parameters: [boardIdParam],
      post: {
        summary: 'Create a task',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/TaskInput' } } },
        },
        responses: {
          '201': json({ $ref: '#/components/schemas/Task' }),
          '400': errorResponse('Validation failed'),
        },
      },
    },
    '/boards/{boardId}/tasks/{taskId}': {
      parameters: [boardIdParam, taskIdParam],
      get: {
        summary: 'Task detail (full description)',
        responses: {
          '200': json({ $ref: '#/components/schemas/Task' }),
          '404': errorResponse('Unknown task'),
        },
      },
      patch: {
        summary: 'Update a task',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/TaskPatch' } } },
        },
        responses: {
          '200': json({ $ref: '#/components/schemas/Task' }),
          '409': errorResponse('Version conflict'),
        },
      },
      delete: {
        summary: 'Delete a task',
        responses: { '204': { description: 'Deleted' }, '404': errorResponse('Unknown task') },
      },
    },
    '/boards/{boardId}/tasks/{taskId}/move': {
      parameters: [boardIdParam, taskIdParam],
      post: {
        summary: 'Move a task to a column and index',
        description: 'Returns the whole board view so the client can replace its state.',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/MoveInput' } } },
        },
        responses: {
          '200': json({ $ref: '#/components/schemas/BoardView' }),
          '409': errorResponse('Version conflict'),
        },
      },
    },
    '/boards/{boardId}/tasks/{taskId}/comments': {
      parameters: [boardIdParam, taskIdParam],
      get: {
        summary: 'List comments, oldest first',
        responses: { '200': json({ type: 'object' }) },
      },
      post: {
        summary: 'Add a comment',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['body'],
                properties: { body: { type: 'string', maxLength: 10000 } },
              },
            },
          },
        },
        responses: {
          '201': json({ $ref: '#/components/schemas/Comment' }),
          '400': errorResponse('Invalid body'),
        },
      },
    },
    '/boards/{boardId}/activity': {
      parameters: [boardIdParam],
      get: {
        summary: 'Board activity, newest first',
        parameters: [
          { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 50 } },
          {
            name: 'before',
            in: 'query',
            schema: { type: 'integer' },
            description: 'Cursor from nextBefore',
          },
          {
            name: 'since',
            in: 'query',
            schema: { type: 'integer' },
            description: 'Inclusive lower bound on createdAt, in milliseconds',
          },
          {
            name: 'actors',
            in: 'query',
            schema: { type: 'string' },
            description: 'Comma-separated actor names; omit for everyone',
          },
        ],
        responses: { '200': json({ type: 'object' }) },
      },
    },

    // ---- Agent door -------------------------------------------------------
    '/agent/board': {
      get: {
        summary: "The token's own board",
        security: [{ agentToken: [] }],
        responses: {
          '200': json({ $ref: '#/components/schemas/BoardView' }),
          '401': errorResponse('Invalid token'),
        },
      },
    },
    '/agent/columns': {
      get: {
        summary: 'Fixed columns',
        security: [{ agentToken: [] }],
        responses: { '200': json({ type: 'object' }) },
      },
    },
    '/agent/profiles': {
      get: {
        summary: 'Assignable profiles',
        security: [{ agentToken: [] }],
        responses: { '200': json({ type: 'object' }) },
      },
    },
    '/agent/tasks': {
      get: {
        summary: 'List and filter tasks',
        security: [{ agentToken: [] }],
        parameters: [
          { name: 'status', in: 'query', schema: { type: 'string' } },
          { name: 'priority', in: 'query', schema: { type: 'string' } },
          {
            name: 'assignee',
            in: 'query',
            schema: { type: 'string' },
            description: 'Profile id, or "none"',
          },
          {
            name: 'q',
            in: 'query',
            schema: { type: 'string' },
            description: 'Title substring, max 40 bytes',
          },
          { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100 } },
        ],
        responses: { '200': json({ type: 'object' }), '400': errorResponse('Invalid filter') },
      },
      post: {
        summary: 'Create a task',
        security: [{ agentToken: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/TaskInput' } } },
        },
        responses: { '201': json({ $ref: '#/components/schemas/Task' }) },
      },
    },
    '/agent/tasks/{taskId}': {
      parameters: [taskIdParam],
      get: {
        summary: 'Task detail',
        security: [{ agentToken: [] }],
        responses: {
          '200': json({ $ref: '#/components/schemas/Task' }),
          '404': errorResponse('Not on this board'),
        },
      },
      patch: {
        summary: 'Update a task',
        security: [{ agentToken: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/TaskPatch' } } },
        },
        responses: {
          '200': json({ $ref: '#/components/schemas/Task' }),
          '409': errorResponse('Version conflict'),
        },
      },
      delete: {
        summary: 'Delete a task',
        security: [{ agentToken: [] }],
        responses: { '204': { description: 'Deleted' }, '404': errorResponse('Not on this board') },
      },
    },
    '/agent/tasks/{taskId}/move': {
      parameters: [taskIdParam],
      post: {
        summary: 'Move a task',
        security: [{ agentToken: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/MoveInput' } } },
        },
        responses: { '200': json({ $ref: '#/components/schemas/BoardView' }) },
      },
    },
    '/agent/tasks/{taskId}/comments': {
      parameters: [taskIdParam],
      get: {
        summary: 'List comments',
        security: [{ agentToken: [] }],
        responses: { '200': json({ type: 'object' }) },
      },
      post: {
        summary: 'Add a comment',
        security: [{ agentToken: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['body'],
                properties: { body: { type: 'string' } },
              },
            },
          },
        },
        responses: { '201': json({ $ref: '#/components/schemas/Comment' }) },
      },
    },
    '/agent/activity': {
      get: {
        summary: 'Board activity',
        security: [{ agentToken: [] }],
        responses: { '200': json({ type: 'object' }) },
      },
    },
  },
} as const
