# MCP Elicitation Integration Design

## Overview

This document describes the design for integrating MCP Elicitation into the onboarding tool.

## Background

### Current Issues

The current onboarding tool uses **MCP Sampling** to generate LLM narration, but the following actions require **true user approval**:

- `approve`: Requires explicit user consent before approving migration proposal
- `migrate`: Requires final confirmation before creating backup and rewriting files
- `rollback`: Requires confirmation before restoring from backup

### Sampling vs Elicitation

| Feature | MCP Sampling | MCP Elicitation |
|---------|--------------|-----------------|
| **Purpose** | LLM interpretation and narration | User input and approval |
| **Direction** | Server → LLM | Server → User |
| **Response** | LLM-generated text | User-provided structured data |
| **Use Case** | Situation explanation, proposal elaboration | Important decision approval, sensitive information input |

## Implementation Patterns from mcp-shell-server

### Elicitation Request

```typescript
// From src/security/enhanced-evaluator.ts
const requestPayload = {
  method: 'elicitation/create',
  params: {
    message: elicitationMessage,
    requestedSchema: elicitationSchema,
    timeoutMs: 180000,
    level: 'question',
  },
};

const response = await this.mcpServer.request(requestPayload, ElicitResultSchema);
```

### Schema Definition

```typescript
const elicitationSchema: ElicitationSchema = {
  type: 'object',
  properties: {
    confirmed: {
      type: 'boolean',
      title: 'Execute this command?',
      description: "Select 'Yes' if you understand the risks and want to proceed",
    },
    reason: {
      type: 'string',
      title: 'Why do you need to run this command?',
      description: 'Briefly explain your intent',
    },
  },
  required: ['confirmed'],
};
```

### Response Handling

```typescript
if (response && typeof response === 'object' && 'action' in response) {
  const result = response as { action: string; content?: Record<string, unknown> };
  
  if (result.action === 'accept' && result.content) {
    const confirmed = result.content['confirmed'] as boolean;
    const reason = result.content['reason'] as string;
    // Process confirmation...
  } else if (result.action === 'decline') {
    // User declined
  } else if (result.action === 'cancel') {
    // User canceled
  }
}
```

## Integration into Onboarding Tool

### 1. Elicitation Helper Function

Implement the new function `createElicitationRequest()`:

```typescript
/**
 * Create elicitation request for user approval
 */
async function createElicitationRequest(
  message: string,
  schema: ElicitationSchema
): Promise<ElicitationResponse> {
  if (!serverInstance) {
    throw new Error('Server instance not available for elicitation');
  }

  const requestPayload = {
    method: 'elicitation/create',
    params: {
      message,
      requestedSchema: schema,
      timeoutMs: 180000, // 3 minutes
      level: 'question',
    },
  };

  const response = await serverInstance.request(requestPayload);
  
  if (response && typeof response === 'object' && 'action' in response) {
    return response as ElicitationResponse;
  }
  
  throw new Error('Invalid elicitation response format');
}
```

### 2. Approve Action Integration

Modify `handleApprove()` to use elicitation:

**Before (Sampling)**:
```typescript
// Generate narration with LLM
const narrativeResponse = await generateApprovalNarrative(status);
```

**After (Elicitation)**:
```typescript
// Request approval from user
const elicitationResponse = await createElicitationRequest(
  '🔍 Migration Proposal Approval\n\nDo you approve this migration plan?\n\n' +
  `Analysis Result: ${status.pattern}\n` +
  `Proposal: ${JSON.stringify(status.proposal, null, 2)}`,
  {
    type: 'object',
    properties: {
      approved: {
        type: 'boolean',
        title: 'Approve this proposal?',
        description: 'If approved, migration can be executed in the next step',
      },
      comment: {
        type: 'string',
        title: 'Comment (optional)',
        description: 'Please provide the reason for approval or rejection',
      },
    },
    required: ['approved'],
  }
);

if (elicitationResponse.action === 'accept' && elicitationResponse.content?.['approved']) {
  // User approved!
} else if (elicitationResponse.action === 'decline') {
  // User declined
} else {
  // User canceled
}
```

### 3. Migrate Action Integration

`handleMigrate()` を修正:

```typescript
const elicitationResponse = await createElicitationRequest(
  '⚠️ Final Confirmation for Migration Execution\n\n' +
  'Backup will be created and existing instructions will be migrated.\n' +
  'Proceed?',
  {
    type: 'object',
    properties: {
      confirmed: {
        type: 'boolean',
        title: 'Execute migration?',
        description: 'A backup will be created',
      },
      understood_risks: {
        type: 'boolean',
        title: 'I understand the changes',
        description: 'I understand that existing instructions will be overwritten',
      },
    },
    required: ['confirmed', 'understood_risks'],
  }
);
```

### 4. Rollback Action Integration

`handleRollback()` を修正:

```typescript
const elicitationResponse = await createElicitationRequest(
  '🔄 Rollback Confirmation\n\n' +
  'Restore from backup?\n' +
  'Current changes will be lost.',
  {
    type: 'object',
    properties: {
      confirmed: {
        type: 'boolean',
        title: 'Execute rollback?',
        description: 'Current changes will be lost',
      },
    },
    required: ['confirmed'],
  }
);
```

## Elicitation Trace Logging

### Log Format

```typescript
interface ElicitationTraceEntry {
  timestamp: string;
  action: 'approve' | 'migrate' | 'rollback';
  message: string;
  schema: ElicitationSchema;
  response: {
    action: 'accept' | 'decline' | 'cancel';
    content?: Record<string, unknown>;
  };
  duration_ms: number;
}
```

### Log Storage Location

```
.copilot-state/
  elicitation-traces/
    2025-01-15T10-30-45-approve.json
    2025-01-15T10-32-10-migrate.json
```

### Logger Implementation

Create a new file `server/src/utils/elicitationTraceLogger.ts`:

```typescript
import * as fs from 'fs/promises';
import * as path from 'path';

const TRACE_DIR = '.copilot-state/elicitation-traces';

export async function logElicitationTrace(
  action: string,
  message: string,
  schema: ElicitationSchema,
  response: ElicitationResponse,
  duration: number
): Promise<void> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${timestamp}-${action}.json`;
  const filepath = path.join(TRACE_DIR, filename);

  await fs.mkdir(TRACE_DIR, { recursive: true });
  await fs.writeFile(
    filepath,
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        action,
        message,
        schema,
        response,
        duration_ms: duration,
      },
      null,
      2
    )
  );
}
```

## Error Handling

### Elicitation Unavailable

```typescript
try {
  const response = await createElicitationRequest(message, schema);
  // Process response...
} catch (error) {
  // Fallback: Cannot proceed without user approval
  return {
    error: 'USER_APPROVAL_REQUIRED',
    message: 'This action requires explicit user approval via MCP Elicitation, but the feature is not available.',
    suggestion: 'Please ensure your MCP client supports elicitation.',
  };
}
```

### User Declined

```typescript
if (elicitationResponse.action === 'decline') {
  return {
    status: 'declined',
    message: 'User declined the operation.',
    comment: elicitationResponse.content?.['comment'] || 'No comment provided',
  };
}
```

### User Canceled

```typescript
if (elicitationResponse.action === 'cancel') {
  return {
    status: 'canceled',
    message: 'User canceled the operation.',
  };
}
```

## Documentation Update

### Update Scenario 2

Update Scenario 2 in `docs/operation-scenarios.md`:

- **Phase A (analyze, propose)**: Generate narration with Sampling (no change)
- **Phase B (approve)**: User approval with **Elicitation**
- **Phase C (migrate, rollback)**: Final confirmation with **Elicitation**

### New Section: "Sampling vs Elicitation"

```markdown
## When to Use Sampling vs Elicitation

### Sampling (LLM Narration)
- **analyze**: Explain analysis results
- **propose**: Detail proposal contents

### Elicitation (User Approval)
- **approve**: Approve migration proposal
- **migrate**: Final confirmation before execution
- **rollback**: Confirmation before restoration
```

## Implementation Steps

1. ✅ **Design Document Creation** (this file)
2. **Elicitation Helper Implementation** (`createElicitationRequest()`)
3. **Approve Integration** (use elicitation)
4. **Migrate Integration** (use elicitation)
5. **Rollback Integration** (use elicitation)
6. **Elicitation Trace Logger Implementation**
7. **Error Handling Addition**
8. **Documentation Update** (Scenario 2)
9. **Real Environment Testing** (verify elicitation prompt behavior)
10. **Publish 0.1.7**

## Expected Results

- **approve**: Cannot proceed without user explicitly clicking "Approve" button
- **migrate**: Will not execute until user checks "I understand" and clicks "Execute"
- **rollback**: Will not execute until user confirms "I understand current changes will be lost"

## Security Considerations

- Reject operations if Elicitation is unavailable (no graceful degradation)
- Never execute destructive operations without user approval
- Log all elicitation requests to trace logs
- Treat timeout as cancellation (never auto-approve)
