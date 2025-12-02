# Operation Scenarios: mcp-copilot-instructions Development

**Created**: December 1, 2025  
**Version**: 1.0.0

---

## Preamble (Project Assumptions and Objectives)

- **User State is Given Condition**: While respecting user memory accuracy, judgment, logical thinking, and learning ability, this project does not directly aim to improve the user side.
- **Overcoming LLM Constraints**: Overcome current LLM context window limitations and lack of persistent memory ("forgetting," "reproducibility variance") through "dynamic instruction updates" rather than conversation logs.
- **Instructions = External Memory Backbone**: The `.github/copilot-instructions.md` file, which is read at the beginning of each chat turn, is continuously, structurally, and consistently updated via MCP tools, maintaining a state where Copilot can make decisions from the same foundation every time.
- **Primary Target is AI Behavior Stabilization**: User instructions remain minimal intent presentations, while Copilot proactively CRUDs instructions, context, and feedback to achieve behavior stabilization and quality improvement.

## Persona Definitions

### 1. Makoto (Developer)
- **Role**: Programmer developing MCP server
- **Goal**: Implement the `mcp-copilot-instructions` MCP server
- **Challenges**: 
  - AI tends to forget past decisions due to small chat context window
  - Need AI to autonomously update instructions without manual maintenance
- **Strengths**: 
  - Understands that instructions are "external memory" read by AI every turn
  - Keeps instruction presentation minimal, delegates updates to Copilot

#### User-Side Challenges (Interaction Perspective)
- **Memory Misconception**: LLM context window is small. If conversation proceeds assuming past instructions/points are always "remembered," AI may not recall them.
- **Policy Fluctuation**: User's own instructions may be incorrect or contradictory (containing policies and beliefs). These contradictions are hard to resolve through conversation alone.
- **Human-Treatment Pitfall**: Treating AI like humans with persistent memory causes discrepancies. Need explicit reflection to external memory (instructions).
- **Lack of Reproducibility**: Same intent expressed differently each time makes consistent AI tracking difficult.

#### User-Side Best Practices (Conversation Management)
- **Keep Instructions Short and Focused**: Present requirements, constraints, and priorities in bullet points, not long text.
- **Reflect Changes to Instructions**: Have Copilot reflect new policies or corrections to instructions via tools (don't rely on conversation logs).
- **Explicitly State Contradictions**: Clearly show difference between old and new policies, record old policy deletion/update in instructions.
- **Allow Confirmation Questions**: When inconsistencies exist, allow Copilot's questions and include instruction update in completion definition.

### 2. Copilot (AI Assistant)
- **Role**: MCP server user (also has MCP client functionality)
- **Capabilities**: 
  - Reads instructions at the beginning of every turn, detects differences, and autonomously complies
  - Proactively CRUDs instructions, context, and feedback via MCP tools for self-improvement
  - Generates/modifies code, records failures, and reflects them
- **Constraints**: 
  - Context window is finite, but can leverage instructions as external memory
  - Conversation history fades, so must always reconstruct from instructions and context

---

## Scenario 0: Goal Management System - Never Losing Sight of Objectives

### Situation
During long development sessions spanning multiple days, both developers and AI assistants tend to lose sight of the ultimate goal, getting absorbed in implementation details and sub-tasks. This scenario demonstrates how the Goal Management System prevents this problem.

### Conversation Flow

#### Turn 1: Setting Up Project Goals

**Makoto**: 
> Let's implement Phase 2 of the MCP server. Set up the goal hierarchy so we don't lose track of what we're trying to achieve.

**Copilot (Internal Processing)**:
```
1. Turn starts → Read .github/copilot-instructions.md
2. Check if goal management is initialized
3. If not, create initial goal hierarchy
```

**Copilot → MCP Server**:
```typescript
goal_management({
  action: "create",
  goal: {
    title: "Complete MCP Copilot Instructions Server",
    description: "Build fully functional MCP server with dynamic instruction management",
    parentId: null  // This is the main goal
  }
})

goal_management({
  action: "create",
  goal: {
    title: "Phase 2: Dynamic Generation Engine",
    description: "Implement context-aware instruction filtering and generation",
    parentId: "goal-main",
    order: 2
  }
})

goal_management({
  action: "create",
  goal: {
    title: "Implement change_context tool",
    description: "Lightweight tool for updating development state",
    parentId: "goal-phase2",
    order: 1
  }
})
```

**Copilot**: 
> Goal hierarchy initialized. Current focus: "Implement change_context tool"
> 
> **Goal Path**:
> Main Goal → Phase 2: Dynamic Generation → Implement change_context
> 
> This structure will be visible in every instruction set, ensuring we never lose sight of the ultimate objective.

---

#### Turn 2: Working on Implementation (Next Day)

**Makoto** (starts new chat session):
> Continue with the change_context implementation.

**Copilot (Internal Processing)**:
```
1. Turn starts → Read .github/copilot-instructions.md
2. Goal section is present:
   🎯 Ultimate Goal: Complete MCP Server
   📍 Current: Phase 2 → change_context tool
   ⬅️ Previous: (Phase 1 completed)
   ➡️ Next: Implement scoring algorithm
3. Immediately understands context without asking
```

**Copilot**: 
> Continuing with change_context implementation. Based on the current goal structure:
> - Main objective: Dynamic instruction generation
> - Current task: change_context tool (auto-regeneration trigger)
> - Next up: Scoring algorithm
> 
> Let me check the existing implementation...

[Proceeds with work immediately, no context loss]

---

#### Turn 3: Completing a Goal

**Makoto**:
> The change_context tool is working. Mark it complete and move on.

**Copilot → MCP Server**:
```typescript
goal_management({
  action: "complete",
  goalId: "task-change-context"
})
```

**Copilot (Internal Processing)**:
```
1. Mark task-change-context as completed
2. Auto-advance to next sibling: task-scoring-algorithm
3. Update current-context.json
4. Move task-change-context to "recently completed"
5. Regenerate instructions with updated goals
```

**Copilot**:
> ✓ "Implement change_context tool" marked as completed.
> 
> **Updated Goal Context**:
> - Ultimate: Complete MCP Server
> - Current Path: Phase 2 → **Implement scoring algorithm** ← New focus
> - Recently Completed: Implement change_context ✓
> - Next Up: Implement generate_instructions tool
> 
> Instructions automatically updated. Ready to start scoring algorithm implementation.

---

#### Turn 4: Discovering Need for Sub-Goal (1 Week Later)

**Makoto** (new chat session):
> The scoring algorithm needs proper validation. Add that as a requirement.

**Copilot (Internal Processing)**:
```
1. Turn starts → Read instructions
2. Goal section shows:
   Current: Phase 2 → Implement scoring algorithm
3. User wants to add sub-task
```

**Copilot → MCP Server**:
```typescript
goal_management({
  action: "create",
  goal: {
    title: "Add scoring validation and tests",
    description: "Validate scoring rules and add comprehensive tests",
    parentId: "task-scoring-algorithm",  // Sub-task of current goal
    order: 1
  }
})

goal_management({
  action: "set-current",
  goalId: "subtask-scoring-validation"
})
```

**Copilot**:
> Added sub-goal: "Add scoring validation and tests"
> 
> **Updated Structure**:
> ```
> Phase 2: Dynamic Generation Engine
> └── Implement scoring algorithm (In Progress)
>     ├── Core algorithm implementation ← Previous
>     ├── Add scoring validation and tests ← Current
>     └── Performance optimization ← Next
> ```
> 
> Focus shifted to validation. Ultimate goal remains: Complete MCP Server.

---

#### Turn 5: Checking Overall Progress (2 Weeks Later)

**Makoto**:
> Where are we in the overall project?

**Copilot → MCP Server**:
```typescript
goal_management({
  action: "get-context"
})
```

**Copilot**:
> **Project Progress Overview**:
> 
> 🎯 **Ultimate Goal**: Complete MCP Copilot Instructions Server
> 
> **Phase Status**:
> - ✅ Phase 1: MVP (Completed)
>   - ✓ Basic CRUD operations
>   - ✓ Git integration
>   - ✓ Conflict detection
> 
> - 🔄 Phase 2: Dynamic Generation Engine (In Progress - 60%)
>   - ✓ change_context tool
>   - 🔄 Scoring algorithm (Current: Validation)
>   - ⏭️ generate_instructions tool
> 
> - ⏸️ Phase 3: Advanced Features (Not Started)
> 
> **Current Focus**: Adding scoring validation
> **Next Milestone**: Complete generate_instructions tool
> **Ultimate Target**: Full dynamic instruction management

---

### Key Benefits Demonstrated

1. **No Context Loss**: Even after weeks and multiple chat sessions, current goal is immediately clear
2. **Automatic Advancement**: Completing goals automatically moves focus to next item
3. **Hierarchical Clarity**: Always see ultimate goal, current path, and next steps
4. **Flexible Structure**: Can add sub-goals dynamically as needs arise
5. **Progress Visibility**: Clear view of what's done, current, and upcoming

---

## Scenario 1: Project First Day - Setup and Initial Implementation

### Situation
Project in pre-initialization state. Copilot checks for instructions and current state, leads initial setup.

### 会話の流れ

#### ターン1: プロジェクト開始

**まこと**: 
> 目的: `.github/copilot-instructions.md`を動的にメンテするMCPサーバ。ツール: guidance / instructions_structure / project_context / user_feedback / adaptive_instructions。
> セットアップはCopilotが主導して進めてください。

**Copilot（内部処理）**:
```
1. ターン開始 → .github/copilot-instructions.md を読み込む（まだ存在しない）
2. guidance ツールを使って現在の状態を確認
```

**Copilot → MCPサーバ**:
```typescript
guidance({ topic: "current-state" })
// 結果: プロジェクトは未初期化
```

**Copilot**: 
> 現状: 未初期化。指示書は未存在。
> 実施計画: (1) プロジェクト構造作成 (2) 設定ファイル整備 (3) 指示書初期化。
> まず`project_context`へ初期アーキテクチャを登録し、指示書に要旨を作成します。

**Copilot → MCPサーバ**:
```typescript
project_context({
  action: "create",
  context: {
    category: "architecture",
    title: "MCP Server Structure",
    description: "TypeScript based MCP server with 5 main tools",
    priority: "high",
    tags: ["mcp", "typescript", "server"],
    details: {
      frameworks: ["@modelcontextprotocol/sdk"],
      languages: ["TypeScript"],
      rules: [
        "Use action parameter for CRUD operations",
        "Keep tool count minimal",
        "Validate all inputs"
      ]
    }
  }
})
```

**Copilot → 指示書作成**:
```typescript
instructions_structure({
  action: "create",
  element: {
    type: "heading",
    level: 1,
    content: "# mcp-copilot-instructions Development Guidelines"
  }
})

instructions_structure({
  action: "create",
  element: {
    type: "paragraph",
    content: "This project implements an MCP server for dynamic management of copilot-instructions.md",
    position: "last-child"
  }
})
```

**まこと**: 
> よし、いい感じ。次にTypeScriptの設定とフォルダ構造を作ってくれ。

---

#### ターン2: 実装開始

**Copilot（内部処理）**:
```
1. ターン開始 → .github/copilot-instructions.md を読み込む
   内容: "MCP server with 5 main tools, use action parameter, TypeScript"
2. project_context を読んで詳細を確認
```

**Copilot → MCPサーバ**:
```typescript
project_context({
  action: "read",
  filter: { category: "architecture" }
})
// 結果: MCP Server Structure の詳細を取得
```

**Copilot**: 
> 了解しました。設計ドキュメントに基づいてフォルダ構造を作成します。
> 
> ```
> src/
>   ├── tools/
>   │   ├── guidance.ts
>   │   ├── instructions_structure.ts
>   │   ├── project_context.ts
>   │   ├── user_feedback.ts
>   │   └── adaptive_instructions.ts
>   ├── types/
>   │   └── schemas.ts
>   ├── storage/
>   │   └── storage.ts
>   └── index.ts
> ```

[ファイルを作成...]

**まこと**: 
> 次は`guidance`ツールの実装をお願いします（設計準拠）。

---

## Scenario 2: Onboarding Day (Using MCP Sampling to Narrate Analyze → Propose)

### Situation
A legacy `.github/copilot-instructions.md` already exists in the repository. We need to analyze it, summarize risks, and draft a migration proposal while keeping the process observable. MCP Sampling in this context is **not** a file-access guard; it is the mechanism the MCP server uses to ask the host client to run an LLM on its behalf. The server gathers raw facts locally, then uses sampling to turn those facts into human-ready explanations that stay traceable.

### Roles
- **Sampling Orchestrator**: Packages collected evidence, issues `sampling` requests (e.g., `intent: "analysis-narrative"` or `intent: "proposal-draft"`), and stores the prompt/response pair so another human can replay the reasoning later.
- **instructionsAnalyzer**: Reads `.github/copilot-instructions.md` directly from disk, classifies the file (clean / structured / unstructured / messy), and surfaces supporting evidence.
- **onboardingStatusManager**: Reads and writes `.copilot-state/onboarding.json`, capturing when and why status changes occur.
- **Propose logic**: Inside `onboarding({ action: "propose" })`, recomputes the latest analysis, asks sampling to describe the dry-run migration, and records backup settings without touching `.github/copilot-instructions.md` yet.

### Conversation Flow

#### Phase A: Analysis and Proposal (Read-Only)

1. **Analyze (local read → sampled narration)**
  - `instructionsAnalyzer` reads `.github/copilot-instructions.md`, runs the heuristics described below, and returns structured JSON (pattern, sections, problems, suggested sections).
  - The orchestrator embeds that JSON into a `sampling` request so the host LLM can produce the friendly report that appears in chat.
  - `onboardingStatusManager` updates `.copilot-state/onboarding.json` with `status: analyzed` plus the computed pattern and restriction flag; no writes happen to the instruction file itself.

2. **Human decision checkpoint**
  - Review the narrated output, compare it with the raw evidence reference in the log, and decide whether to continue.
  - Each sampling envelope records the prompt, anonymized snippets, and intent, so anyone can audit which facts were fed into the LLM.

3. **Propose (analysis refresh → sampled draft)**
  - `onboarding({ action: "propose" })` re-runs the analyzer to ensure it is operating on the latest file contents.
  - The orchestrator prepares a dry-run plan (backup location, migration steps, rollback window) and asks sampling to turn it into a narrative proposal.
  - Status transitions to `proposed`, `.copilot-state/onboarding.json` gains the backup metadata, and `.github/copilot-instructions.md` still stays untouched.

#### Phase B: Approval and Migration Preparation

4. **Approve (commitment without execution)**
  - `onboarding({ action: "approve" })` validates that status is `proposed` and the dry-run plan is still current.
  - Uses sampling to generate an approval confirmation narrative explaining:
    - What will be backed up and where
    - How the migration will preserve existing content
    - Rollback window and restoration procedure
  - Status transitions to `approved`, timestamp recorded in `.copilot-state/onboarding.json`.
  - `.github/copilot-instructions.md` still unchanged—approval is a checkpoint, not execution.

5. **Migrate (execution with sampling trace)**
  - `onboarding({ action: "migrate" })` performs the actual migration:
    1. Creates timestamped backup at `.copilot-state/backups/copilot-instructions-{timestamp}.md`
    2. Reads current instructions one final time to detect conflicts
    3. Transforms content according to approved plan (section extraction, heading normalization, metadata insertion)
    4. Writes new structure to `.github/copilot-instructions.md`
  - Uses sampling to narrate each step as it happens:
    - "Backing up current instructions to..."
    - "Extracting sections: Found 5 sections..."
    - "Writing new structure with metadata frontmatter..."
    - "Migration complete. Restricted mode disabled."
  - Status transitions to `completed`, `restrictedMode: false`, `canRollback: true` with rollback deadline (default 7 days).
  - Sampling trace preserves the complete execution log for audit.

#### Phase C: Post-Migration and Rollback

6. **Status monitoring**
  - After migration, all tools check `isOnboardingCompleted()` before operations.
  - If completed, tools operate normally; `change_context` regenerates instructions freely.
  - Rollback remains available until deadline expires.

7. **Rollback (if issues arise)**
  - `onboarding({ action: "rollback" })` reverses the migration:
    1. Validates rollback is within deadline window
    2. Reads backup file from `.copilot-state/backups/`
    3. Restores backup to `.github/copilot-instructions.md`
  - Uses sampling to explain restoration:
    - "Rolling back to backup from {timestamp}..."
    - "Original instructions restored"
    - "Status reset to 'analyzed' for re-evaluation"
  - Status transitions to `analyzed`, `restrictedMode: true`, preserving the original analysis for review.
  - User can now re-propose with different strategy or skip onboarding.

8. **Skip (opt-out at any stage)**
  - `onboarding({ action: "skip" })` can be called during analysis, proposal, or even after approval (before migration).
  - Uses sampling to confirm skip decision and implications:
    - "Onboarding skipped. Existing instructions preserved."
    - "Restricted mode disabled. Tools will operate freely."
    - "You can restart onboarding later with 'analyze' if needed."
  - Status transitions to `skipped`, `restrictedMode: false`, no backup created.
  - Allows users to defer migration or use the system without onboarding.

### What Sampling Guarantees
- The exact prompt, intent, and anonymized snippets that the server shared with the LLM are preserved, so another human can replay or challenge the reasoning.
- Narratives stay reproducible: repeating the same analysis with the same evidence produces the same sampling envelope.
- When something stalls, the log shows which sampling intent (analysis narrative vs. proposal draft) was last completed.

### Benefits
- Existing instructions stay intact while we gather context and craft proposals because sampling never writes; it only describes.
- Multiple agents can review the sampling trace plus the raw analyzer JSON to reach the same conclusion.
- Human-in-the-loop decisions remain in control while automation handles the parsing and narration.

### How Pattern Classification Works
- **Clean**: `readInstructionsFile` returns empty/undefined, so the analyzer reports no existing instructions and onboarding exits restricted mode immediately.
- **Structured**: The file contains at least one `##` heading, `extractSections` succeeds, and `detectProblems` finds no duplicates or keyword-level contradictions.
- **Unstructured**: The file has content but no `##` headings. There are no detected contradictions, so `suggestSections` (keyword clustering + lightweight confidence scoring) proposes headings.
- **Messy**: Either (a) structured sections exist but `detectProblems` finds duplicates or polarity conflicts (e.g., "any禁止" vs "any OK"), or (b) the text is unstructured and still registers contradictions. In both cases onboarding enforces restricted mode until a human cleans things up.
- **Evidence surfaces**: Each returned pattern includes line numbers, sample text, and (for unstructured files) suggested headings so the subsequent sampling prompt can cite concrete facts.

---

#### Detailed Onboarding Walkthrough (Sampling in Action)

**ターン1: Onboarding開始**

**まこと**:
> 既存の指示書がある。安全にマイグレーションできるか分析してくれ。

**Copilot（内部処理）**:
```
1. ターン開始 → .github/copilot-instructions.md を読み込む
2. Onboarding状態を確認 → not_started
3. 既存指示書が存在 → 分析が必要
```

**Copilot → MCPサーバ**:
```typescript
onboarding({ action: "analyze" })
```

**MCPサーバ内部（Sampling Orchestrator）**:
```typescript
// 1. Local file analysis (no sampling yet)
const analysis = await instructionsAnalyzer.analyze('.github/copilot-instructions.md');
// → { pattern: "structured", sections: 8, problems: [], suggestedSections: null }

// 2. Prepare sampling request
const samplingRequest = {
  intent: "analysis-narrative",
  prompt: `You are analyzing existing Copilot instructions for safe migration.

Analysis Results (Raw JSON):
${JSON.stringify(analysis, null, 2)}

Generate a human-friendly report explaining:
1. What pattern was detected and why
2. Whether migration is safe
3. What the next steps are
4. Any risks or concerns

Keep it concise but informative.`,
  context: {
    analysisData: analysis,
    timestamp: new Date().toISOString()
  }
};

// 3. Request sampling from host client
const response = await server.createMessage({
  messages: [{
    role: 'user',
    content: { type: 'text', text: samplingRequest.prompt }
  }],
  maxTokens: 1000,
});

// 4. Log the sampling envelope for audit
await logSamplingTrace({
  intent: "analysis-narrative",
  request: samplingRequest,
  response: response,
  timestamp: new Date().toISOString()
});

// 5. Update status
await saveOnboardingStatus({
  version: '1.0.0',
  status: 'analyzed',
  pattern: analysis.pattern,
  analyzedAt: new Date().toISOString(),
  restrictedMode: analysis.pattern === 'messy' || analysis.pattern === 'unstructured',
  canRollback: false
});
```

**Copilot（Sampling経由の返答）**:
> # Analysis Report
> 
> **Pattern Detected**: Structured ✓
> 
> Your existing instructions are well-organized with 8 clear sections and proper heading hierarchy. No contradictions or duplications detected.
> 
> **Migration Safety**: LOW RISK
> - Content is already compatible with this system
> - No restructuring needed
> - Can proceed directly to normal operation
> 
> **Next Steps**:
> - You can skip migration (already compatible)
> - Or proceed to see the proposed structure
> 
> **Status**: Restricted mode OFF (compatible pattern detected)

**まこと**:
> 提案を見てみたい。

---

**ターン2: Migration提案**

**Copilot → MCPサーバ**:
```typescript
onboarding({ action: "propose" })
```

**MCPサーバ内部（Sampling Orchestrator）**:
```typescript
// 1. Refresh analysis (ensure latest state)
const latestAnalysis = await instructionsAnalyzer.analyze('.github/copilot-instructions.md');

// 2. Prepare dry-run migration plan
const migrationPlan = {
  backupPath: `.copilot-state/backups/copilot-instructions-${Date.now()}.md`,
  strategy: latestAnalysis.pattern === 'structured' 
    ? 'preserve-and-enhance' 
    : 'restructure-and-merge',
  steps: [
    'Create timestamped backup',
    'Add frontmatter metadata (category, tags, priority)',
    'Normalize section headings',
    'Insert migration markers for traceability',
    'Update git ignore patterns'
  ],
  rollbackDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  risks: latestAnalysis.pattern === 'messy' 
    ? ['Content contradictions may require manual resolution']
    : ['Minimal risk - content already structured']
};

// 3. Prepare sampling request
const samplingRequest = {
  intent: "proposal-draft",
  prompt: `You are drafting a migration proposal for existing Copilot instructions.

Analysis Summary:
- Pattern: ${latestAnalysis.pattern}
- Sections: ${latestAnalysis.sections?.length || 0}
- Problems: ${latestAnalysis.problems?.length || 0}

Migration Plan (Dry-Run):
${JSON.stringify(migrationPlan, null, 2)}

Generate a proposal explaining:
1. What will be backed up and where
2. How existing content will be preserved
3. What enhancements will be added
4. Rollback procedure and deadline
5. Approval recommendation

Be clear about what changes and what stays the same.`,
  context: {
    analysisData: latestAnalysis,
    migrationPlan: migrationPlan,
    timestamp: new Date().toISOString()
  }
};

// 4. Request sampling
const response = await server.createMessage({
  messages: [{
    role: 'user',
    content: { type: 'text', text: samplingRequest.prompt }
  }],
  maxTokens: 1500,
});

// 5. Log sampling trace
await logSamplingTrace({
  intent: "proposal-draft",
  request: samplingRequest,
  response: response,
  timestamp: new Date().toISOString()
});

// 6. Update status with migration plan
await saveOnboardingStatus({
  version: '1.0.0',
  status: 'proposed',
  pattern: latestAnalysis.pattern,
  analyzedAt: latestAnalysis.analyzedAt,
  backupPath: migrationPlan.backupPath,
  rollbackUntil: migrationPlan.rollbackDeadline,
  restrictedMode: true, // Keep restricted until approved
  canRollback: false // Not yet migrated
});
```

**Copilot（Sampling経由の返答）**:
> # Migration Proposal
> 
> **Summary**: Your structured instructions will be preserved and enhanced with metadata.
> 
> **What Gets Backed Up**:
> - Current `.github/copilot-instructions.md` → `.copilot-state/backups/copilot-instructions-1733097600000.md`
> - Automatic backup before any changes
> 
> **What Will Be Preserved**:
> - ✓ All 8 existing sections unchanged
> - ✓ All content word-for-word preserved
> - ✓ Section ordering maintained
> 
> **What Will Be Enhanced**:
> - Add YAML frontmatter to each section (category, tags, priority)
> - Normalize heading levels for consistency
> - Insert migration metadata comments for traceability
> 
> **Rollback Procedure**:
> - Available for 7 days after migration
> - Simple restore command: `onboarding({ action: "rollback" })`
> - Original file restored from backup immediately
> 
> **Risk Assessment**: ⭐ MINIMAL RISK
> - Strategy: preserve-and-enhance (non-destructive)
> - No content restructuring required
> - Backup ensures safe rollback
> 
> **Recommendation**: ✅ SAFE TO APPROVE
> 
> Ready to proceed? Use `onboarding({ action: "approve" })` to commit.

**まこと**:
> 承認する。

---

**ターン3: 承認と実行準備**

**Copilot → MCPサーバ**:
```typescript
onboarding({ action: "approve" })
```

**MCPサーバ内部（Sampling Orchestrator）**:
```typescript
// 1. Validate status is 'proposed'
const status = await getOnboardingStatus();
if (status.status !== 'proposed') {
  throw new Error('Must propose before approving');
}

// 2. Prepare approval confirmation via sampling
const samplingRequest = {
  intent: "approval-confirmation",
  prompt: `Confirm migration approval.

Current Status:
- Pattern: ${status.pattern}
- Backup: ${status.backupPath}
- Rollback Until: ${status.rollbackUntil}

Generate a brief confirmation message explaining:
1. What approval means (commitment without execution yet)
2. What happens next (migrate action required)
3. That rollback will be available for 7 days

Keep it short and clear.`,
  context: {
    status: status,
    timestamp: new Date().toISOString()
  }
};

// 3. Request sampling
const response = await server.createMessage({
  messages: [{
    role: 'user',
    content: { type: 'text', text: samplingRequest.prompt }
  }],
  maxTokens: 500,
});

// 4. Update status to approved
await saveOnboardingStatus({
  ...status,
  status: 'approved',
  decidedAt: new Date().toISOString()
});
```

**Copilot（Sampling経由の返答）**:
> # Approval Confirmed ✓
> 
> **What This Means**:
> - Migration plan is approved but not yet executed
> - No files changed yet—this is a checkpoint
> 
> **Next Step**:
> - Run `onboarding({ action: "migrate" })` to execute the approved plan
> - Backup will be created automatically before any changes
> 
> **Safety Net**:
> - Rollback available for 7 days after migration
> - Original content fully restorable
> 
> Ready when you are.

**まこと**:
> 実行してください。

---

**ターン4: Migration実行（Sampling Trace付き）**

**Copilot → MCPサーバ**:
```typescript
onboarding({ action: "migrate" })
```

**MCPサーバ内部（Sampling Orchestrator + Executor）**:
```typescript
// 1. Validate approved status
const status = await getOnboardingStatus();
if (status.status !== 'approved') {
  throw new Error('Must approve before migrating');
}

// 2. Execute migration with streaming sampling trace
const migrationSteps = [];

// Step 1: Backup
const backupPath = status.backupPath;
await fs.copyFile('.github/copilot-instructions.md', backupPath);
migrationSteps.push(`Backup created: ${backupPath}`);

// Step 2: Read current content
const currentContent = await readInstructionsFile();
migrationSteps.push(`Read ${currentContent.length} characters from existing file`);

// Step 3: Detect conflicts (final check)
const conflicts = await detectLastMinuteConflicts(currentContent);
if (conflicts.length > 0) {
  migrationSteps.push(`⚠️ Conflicts detected: ${conflicts.length}`);
  // Abort and explain via sampling
}

// Step 4: Transform content
const sections = await extractSections(currentContent);
migrationSteps.push(`Extracted ${sections.length} sections`);

const enhanced = await enhanceSectionsWithMetadata(sections);
migrationSteps.push(`Added frontmatter metadata to ${enhanced.length} sections`);

// Step 5: Write new structure
await writeInstructionsFile(enhanced.join('\n\n'));
migrationSteps.push(`Wrote new structure to .github/copilot-instructions.md`);

// Step 6: Narrate execution via sampling
const samplingRequest = {
  intent: "migration-execution-trace",
  prompt: `Migration just completed successfully.

Execution Steps:
${migrationSteps.map((step, i) => `${i + 1}. ${step}`).join('\n')}

Final Status:
- Backup: ${backupPath}
- Rollback Available Until: ${status.rollbackUntil}
- Restricted Mode: Disabled

Generate a completion message explaining:
1. What was executed
2. Where backup is stored
3. That system is now in normal operation mode
4. How to rollback if needed

Keep it concise and reassuring.`,
  context: {
    migrationSteps: migrationSteps,
    status: status,
    timestamp: new Date().toISOString()
  }
};

// 7. Request sampling for execution summary
const response = await server.createMessage({
  messages: [{
    role: 'user',
    content: { type: 'text', text: samplingRequest.prompt }
  }],
  maxTokens: 800,
});

// 8. Log full sampling trace
await logSamplingTrace({
  intent: "migration-execution-trace",
  request: samplingRequest,
  response: response,
  timestamp: new Date().toISOString()
});

// 9. Update status to completed
await saveOnboardingStatus({
  ...status,
  status: 'completed',
  migratedAt: new Date().toISOString(),
  restrictedMode: false,
  canRollback: true
});
```

**Copilot（Sampling経由の返答）**:
> # Migration Complete ✓
> 
> **Execution Summary**:
> 1. ✓ Backup created: `.copilot-state/backups/copilot-instructions-1733097600000.md`
> 2. ✓ Read 12,847 characters from existing instructions
> 3. ✓ Extracted 8 sections with preserved content
> 4. ✓ Enhanced sections with frontmatter metadata (category, tags, priority)
> 5. ✓ Wrote new structure to `.github/copilot-instructions.md`
> 
> **Status**: ✅ SYSTEM READY
> - Restricted mode: DISABLED
> - All tools now operate freely
> - Dynamic instruction generation: ACTIVE
> 
> **Rollback Safety Net**:
> - Available until: December 9, 2025
> - Command: `onboarding({ action: "rollback" })`
> - Restores: `.copilot-state/backups/copilot-instructions-1733097600000.md`
> 
> Your instructions are now under dynamic management. I'll update them automatically as we work.

**まこと**:
> 完璧だ！ 記録もちゃんと残ってるのが分かって安心。

---

**ターン5: Rollback（問題発生時）**

**まこと（1日後）**:
> やっぱり元に戻したい。何か問題が出た。

**Copilot → MCPサーバ**:
```typescript
onboarding({ action: "rollback" })
```

**MCPサーバ内部（Sampling Orchestrator + Rollback Executor）**:
```typescript
// 1. Validate rollback is available
const status = await getOnboardingStatus();
if (!status.canRollback) {
  throw new Error('Rollback not available');
}

const deadline = new Date(status.rollbackUntil);
if (Date.now() > deadline.getTime()) {
  throw new Error('Rollback deadline expired');
}

// 2. Execute rollback
const rollbackSteps = [];

// Step 1: Read backup
const backupContent = await fs.readFile(status.backupPath, 'utf-8');
rollbackSteps.push(`Read backup from ${status.backupPath}`);

// Step 2: Restore backup
await writeInstructionsFile(backupContent);
rollbackSteps.push(`Restored original instructions to .github/copilot-instructions.md`);

// 3. Narrate rollback via sampling
const samplingRequest = {
  intent: "rollback-confirmation",
  prompt: `Rollback just completed successfully.

Rollback Steps:
${rollbackSteps.map((step, i) => `${i + 1}. ${step}`).join('\n')}

Original Status (before migration):
- Pattern: ${status.pattern}
- Analyzed At: ${status.analyzedAt}

Generate a rollback confirmation explaining:
1. What was restored
2. Current system status (back to analyzed state)
3. Options for next steps (re-propose, skip, or keep as-is)

Be supportive and clear.`,
  context: {
    rollbackSteps: rollbackSteps,
    status: status,
    timestamp: new Date().toISOString()
  }
};

// 4. Request sampling
const response = await server.createMessage({
  messages: [{
    role: 'user',
    content: { type: 'text', text: samplingRequest.prompt }
  }],
  maxTokens: 600,
});

// 5. Update status back to analyzed
await saveOnboardingStatus({
  version: '1.0.0',
  status: 'analyzed',
  pattern: status.pattern,
  analyzedAt: status.analyzedAt,
  restrictedMode: true, // Re-enable for safety
  canRollback: false // Can't rollback a rollback
});
```

**Copilot（Sampling経由の返答）**:
> # Rollback Complete ✓
> 
> **What Happened**:
> 1. ✓ Original instructions restored from backup
> 2. ✓ Status reset to 'analyzed' (before migration)
> 
> **Current State**:
> - Your original instructions are back
> - Restricted mode: ENABLED (for safety)
> - Previous analysis: Pattern was 'structured'
> 
> **Next Options**:
> 1. **Re-propose**: Try migration again with different strategy
> 2. **Skip**: Keep original instructions, disable restrictions
> 3. **Review**: Examine what went wrong before deciding
> 
> I'm here to help with any of these paths.

---

### Key Benefits of Sampling-Driven Onboarding

1. **Transparency**: Every decision (analyze, propose, migrate, rollback) is narrated with sampling traces that preserve the exact prompts and context.

2. **Auditability**: The `.copilot-state/sampling-traces/` directory contains full logs showing:
   - What raw data was analyzed
   - What prompt was sent to the LLM
   - What narrative was generated
   - When each step occurred

3. **Reproducibility**: Given the same analysis JSON and sampling prompt, another LLM would generate a similar narrative, ensuring consistency.

4. **Human Control**: Sampling never writes files—it only explains. All file operations are explicit and logged separately.

5. **Graceful Degradation**: If sampling fails (client doesn't support it), the system falls back to formatted string output, ensuring functionality.

---

## Scenario 1: Project First Day - Setup and Initial Implementation

### Situation
Project in pre-initialization state. Copilot checks for instructions and current state, leads initial setup.

### 会話の流れ

#### ターン1: プロジェクト開始

**まこと**: 
> 目的: `.github/copilot-instructions.md`を動的にメンテするMCPサーバ。ツール: guidance / instructions_structure / project_context / user_feedback / adaptive_instructions。
> セットアップはCopilotが主導して進めてください。

**Copilot（内部処理）**:
```
1. ターン開始 → .github/copilot-instructions.md を読み込む（まだ存在しない）
2. guidance ツールを使って現在の状態を確認
```

**Copilot → MCPサーバ**:
```typescript
guidance({ topic: "current-state" })
// 結果: プロジェクトは未初期化
```

**Copilot**: 
> 現状: 未初期化。指示書は未存在。
> 実施計画: (1) プロジェクト構造作成 (2) 設定ファイル整備 (3) 指示書初期化。
> まず`project_context`へ初期アーキテクチャを登録し、指示書に要旨を作成します。

**Copilot → MCPサーバ**:
```typescript
project_context({
  action: "create",
  context: {
    category: "architecture",
    title: "MCP Server Structure",
    description: "TypeScript based MCP server with 5 main tools",
    priority: "high",
    tags: ["mcp", "typescript", "server"],
    details: {
      frameworks: ["@modelcontextprotocol/sdk"],
      languages: ["TypeScript"],
      rules: [
        "Use action parameter for CRUD operations",
        "Keep tool count minimal",
        "Validate all inputs"
      ]
    }
  }
})
```

**Copilot → 指示書作成**:
```typescript
instructions_structure({
  action: "create",
  element: {
    type: "heading",
    level: 1,
    content: "# mcp-copilot-instructions Development Guidelines"
  }
})

instructions_structure({
  action: "create",
  element: {
    type: "paragraph",
    content: "This project implements an MCP server for dynamic management of copilot-instructions.md",
    position: "last-child"
  }
})
```

**まこと**: 
> よし、いい感じ。次にTypeScriptの設定とフォルダ構造を作ってくれ。

---

#### ターン2: 実装開始

**Copilot（内部処理）**:
```
1. ターン開始 → .github/copilot-instructions.md を読み込む
   内容: "MCP server with 5 main tools, use action parameter, TypeScript"
2. project_context を読んで詳細を確認
```

**Copilot → MCPサーバ**:
```typescript
project_context({
  action: "read",
  filter: { category: "architecture" }
})
// 結果: MCP Server Structure の詳細を取得
```

**Copilot**: 
> 了解しました。設計ドキュメントに基づいてフォルダ構造を作成します。
> 
> ```
> src/
>   ├── tools/
>   │   ├── guidance.ts
>   │   ├── instructions_structure.ts
>   │   ├── project_context.ts
>   │   ├── user_feedback.ts
>   │   └── adaptive_instructions.ts
>   ├── types/
>   │   └── schemas.ts
>   ├── storage/
>   │   └── storage.ts
>   └── index.ts
> ```

[ファイルを作成...]

**まこと**: 
> 次は`guidance`ツールの実装をお願いします（設計準拠）。

---

#### ターン3: guidance実装（失敗例）

**Copilot（内部処理）**:
```
1. ターン開始 → .github/copilot-instructions.md を読み込む
2. 指示書には「action parameter を使う」とあるが、具体例がない
3. 過去のコンテキストが薄れている...
```

**Copilot**: 
> guidanceツールを実装します...

```typescript
// 間違い: action パラメータを忘れている
server.tool("guidance", async (params: { topic?: string }) => {
  // ...
})
```

**まこと**: 
> 設計準拠のため、`action`パラメータの必須化を徹底してください。

**Copilot（自己認識）**: 
> 指示の具体例が不足していたため、パターンの想起に失敗。以降は失敗を自動記録し、指示書へ具体例を追記して再発を防止します。

**Copilot → MCPサーバ**:
```typescript
user_feedback({
  action: "create",
  feedback: {
    type: "error-report",
    severity: "medium",
    category: ["implementation", "api-design"],
    description: "Forgot to include action parameter in tool definition",
    context: {
      task: "Implementing guidance tool",
      expectedBehavior: "All tools should use action parameter for CRUD",
      actualBehavior: "Tool defined without action parameter"
    },
    sentiment: {
      score: -0.3,
      emotion: "frustrated"
    }
  }
})
```

**Copilot → 指示書更新**:
```typescript
instructions_structure({
  action: "create",
  element: {
    type: "heading",
    level: 2,
    content: "## Tool Implementation Pattern",
    position: "last-child"
  }
})

instructions_structure({
  action: "create",
  element: {
    type: "code",
    content: `\`\`\`typescript
// ✅ CORRECT: All tools MUST have action parameter
server.tool("tool_name", {
  action: z.enum(["create", "read", "update", "delete"]),
  // ... other params
}, async (params) => { /* ... */ })

// ❌ WRONG: Missing action parameter
server.tool("tool_name", {
  topic: z.string()
}, async (params) => { /* ... */ })
\`\`\``,
    position: "last-child"
  }
})
```

**Copilot → 問題解決記録**:
```typescript
user_feedback({
  action: "resolve",
  resolution: {
    feedbackId: "fb-001",
    action: "instruction-updated",
    description: "Added tool implementation pattern with code examples to instructions",
    changes: ["Added '## Tool Implementation Pattern' section with correct/incorrect examples"],
    preventionStrategy: "All future tool implementations will reference this pattern"
  }
})
```

**Copilot**: 
> 失敗を記録し、指示書を更新しました。次回からはこのパターンを参照します。
> 正しい実装に修正します...

---

## シナリオ2: 2日目 - 継続開発と過去の失敗の回避

### 状況
新しいチャットセッション。Copilotは指示書から前回の失敗学習を想起し、実装の整合性を維持する。

### 会話の流れ

#### ターン4: 新セッション開始

**まこと**: 
> `project_context`ツールの実装を進めてください。

**Copilot（内部処理）**:
```
1. ターン開始 → .github/copilot-instructions.md を読み込む
   内容: "MCP server with 5 tools"
   内容: "## Tool Implementation Pattern" のコード例を発見！
   → actionパラメータが必須だと理解
2. 前日のコンテキストはないが、指示書から学習
```

**Copilot → MCPサーバ**:
```typescript
guidance({ topic: "current-state" })
// 結果: guidance ツールは実装済み、project_context は未実装
```

**Copilot**: 
> 承知しました。指示書のパターンに従って`project_context`を実装します。

```typescript
// ✅ 正解: action パラメータを含めている
server.tool("project_context", {
  action: z.enum(["create", "read", "update", "delete"]),
  filter: z.object({
    category: z.enum([...]).optional(),
    // ...
  }).optional(),
  context: z.object({...}).optional(),
  id: z.string().optional()
}, async (params) => {
  switch (params.action) {
    case "create": return await createContext(params.context);
    case "read": return await readContexts(params.filter);
    // ...
  }
})
```

**まこと**: 
> 完璧！前回の失敗を覚えててくれたんだね。

---

#### ターン5: 複雑なロジック実装

**まこと**: 
> 次に`adaptive_instructions`の`analyze`機能（規約違反検出）をお願いします。

**Copilot（内部処理）**:
```
1. ターン開始 → 指示書を読み込む
2. adaptive_instructions の仕様を確認したい
```

**Copilot → MCPサーバ**:
```typescript
project_context({
  action: "read",
  filter: { 
    category: "architecture",
    tags: ["adaptive_instructions"]
  }
})
// 結果: 詳細な仕様が見つからない
```

**Copilot**: 
> `adaptive_instructions`の詳細仕様が見つかりません。設計ドキュメントを確認して、具体的な要件を教えてください。

**まこと**: 
> なるほど。設計書の内容をプロジェクトコンテキストに登録しておくべきだったな。

**まこと → Copilot**: 
> docs/mcp-server-design.md の「adaptive_instructions」セクションを読んで、その内容をproject_contextに登録してくれ。

**Copilot**: 
> [ドキュメントを読む...]
> 
> 了解しました。登録します。

**Copilot → MCPサーバ**:
```typescript
project_context({
  action: "create",
  context: {
    category: "patterns",
    title: "adaptive_instructions - analyze action",
    description: "Analyzes codebase health, error patterns, and Copilot effectiveness",
    priority: "high",
    tags: ["adaptive_instructions", "analysis", "codebase"],
    details: {
      rules: [
        "Check codebase for convention violations",
        "Detect error patterns from git history",
        "Measure Copilot acceptance rate if possible",
        "Return structured analysis with scores (0-100)"
      ],
      examples: [
        "conventionsFollowed: 85 means 85% compliance",
        "Suggest improvements based on detected issues"
      ]
    }
  }
})
```

**Copilot → 指示書更新**:
```typescript
instructions_structure({
  action: "create",
  element: {
    type: "heading",
    level: 2,
    content: "## adaptive_instructions Analysis Requirements"
  }
})

instructions_structure({
  action: "create",
  element: {
    type: "list",
    content: [
      "Must check convention compliance (return 0-100 score)",
      "Detect recurring error patterns in git log",
      "Provide actionable suggestions",
      "Analysis should complete within 10 seconds"
    ],
    position: "last-child"
  }
})
```

**Copilot**: 
> 次回以降はこの情報を指示書から自動想起し、実装に反映します。

---

## シナリオ3: 1週間後 - バグ修正と学習の蓄積

### 状況
`instructions_structure`が特定のMarkdown構造で失敗。Copilotが原因分析・修正・指示書反映まで主導する。

### 会話の流れ

#### ターン10: バグ報告

**まこと**: 
> ネストしたリスト更新で失敗しています。原因分析・修正と、再発防止の指示書反映までお願いします。

**Copilot（内部処理）**:
```
1. ターン開始 → 指示書を読み込む
2. 過去に同じバグがあったか確認
```

**Copilot → MCPサーバ**:
```typescript
user_feedback({
  action: "read",
  filter: {
    type: "error-report",
    category: ["instructions_structure"]
  }
})
// 結果: 同様のバグ報告はまだない
```

**Copilot**: 
> このバグを記録してから修正します。

**Copilot → MCPサーバ**:
```typescript
user_feedback({
  action: "create",
  feedback: {
    type: "error-report",
    severity: "high",
    category: ["instructions_structure", "markdown-parsing"],
    description: "Nested list updates fail with 'Cannot find target element' error",
    context: {
      task: "Updating nested list in instructions",
      actualBehavior: "Error thrown when list depth > 2",
      relatedFiles: ["src/tools/instructions_structure.ts"]
    },
    sentiment: {
      score: -0.6,
      emotion: "frustrated"
    }
  }
})
```

**Copilot**: 
> [バグを調査して修正...]
> 
> 問題を特定しました。AST走査時に子ノードの再帰処理が不足していました。

**Copilot**: 
> 修正を記録し、再発防止策を指示書とプロジェクトコンテキストへ反映します。

**Copilot → MCPサーバ**:
```typescript
user_feedback({
  action: "resolve",
  resolution: {
    feedbackId: "fb-015",
    action: "bug-fixed",
    description: "Fixed nested list handling by implementing recursive AST traversal",
    changes: [
      "Added recursive traverseChildren() function",
      "Updated selector matching to handle depth > 2",
      "Added unit tests for nested structures"
    ],
    preventionStrategy: "Always test with deeply nested structures. Added to test checklist."
  }
})
```

**Copilot → 指示書更新**:
```typescript
instructions_structure({
  action: "create",
  element: {
    type: "heading",
    level: 2,
    content: "## Known Issues and Solutions"
  }
})

instructions_structure({
  action: "create",
  element: {
    type: "paragraph",
    content: "### Markdown Parsing - Nested Structures\n\n" +
             "**Issue**: AST traversal must handle arbitrary nesting depth.\n\n" +
             "**Solution**: Always use recursive traversal, not loop-based.\n\n" +
             "**Test**: Verify with list depth >= 3 before committing.",
    position: "last-child"
  }
})
```

**Copilot → プロジェクトコンテキスト更新**:
```typescript
project_context({
  action: "create",
  context: {
    category: "constraints",
    title: "Markdown Parsing Requirements",
    description: "Critical requirements for safe markdown AST manipulation",
    priority: "critical",
    tags: ["markdown", "ast", "parsing", "instructions_structure"],
    details: {
      rules: [
        "MUST support arbitrary nesting depth",
        "MUST use recursive traversal for child nodes",
        "MUST test with depth >= 3",
        "NEVER assume flat structure"
      ],
      examples: [
        "Use: function traverse(node) { node.children?.forEach(traverse) }",
        "Avoid: for (let i = 0; i < 2; i++) { /* fixed depth */ }"
      ]
    }
  }
})
```

---

## シナリオ4: 2週間後 - プロジェクト成熟期

### 状況
プロジェクトは安定してきた。まことは新しい機能を追加したい。

### 会話の流れ

#### ターン25: 新機能提案

**まこと**: 
> `adaptive_instructions`に、時間帯によって指示を変える機能を追加したい。例えば、深夜はより慎重なコードレビューを促すとか。

**Copilot（内部処理）**:
```
1. ターン開始 → 指示書を読み込む
2. adaptive_instructions の現在の仕様を確認
3. 過去の失敗パターンを確認
```

**Copilot → MCPサーバ**:
```typescript
// まず現在の仕様を確認
project_context({
  action: "read",
  filter: { tags: ["adaptive_instructions"] }
})

// 過去の問題を確認
user_feedback({
  action: "read",
  filter: {
    category: ["adaptive_instructions"],
    status: "resolved"
  }
})

// 類似機能がないか確認
guidance({ topic: "current-state" })
```

**Copilot**: 
> 面白いアイデアですね。実装前にいくつか確認させてください：
> 
> 1. 時間帯の判定はローカル時間ですか？UTCですか？
> 2. 時間帯別の指示は`.github/copilot-instructions.md`に直接反映しますか？
> 3. 過去の実装パターンを見ると、一時的な指示は`expiresAt`で管理していますが、
>    時間帯による切り替えも同じ仕組みを使いますか？

**まこと**: 
> さすが！過去の実装パターンを覚えてるんだね。そう、`expiresAt`の仕組みを拡張する形で。

**Copilot → 設計記録**:
```typescript
project_context({
  action: "create",
  context: {
    category: "patterns",
    title: "Time-based Adaptive Instructions",
    description: "Automatically adjust instructions based on time of day",
    priority: "medium",
    tags: ["adaptive_instructions", "time-based", "automation"],
    details: {
      rules: [
        "Use cron-like syntax for time specifications",
        "Build on existing expiresAt mechanism",
        "Store time-based rules in separate config file",
        "Default time zone: project's primary timezone"
      ],
      examples: [
        "Night mode (22:00-06:00): Enhanced code review prompts",
        "Sprint end (Friday 15:00+): Extra testing reminders"
      ],
      references: [
        "src/tools/adaptive_instructions.ts#expiresAt"
      ]
    }
  }
})
```

**Copilot → 指示書更新**:
```typescript
instructions_structure({
  action: "update",
  selector: {
    type: "heading",
    content: "adaptive_instructions"
  },
  element: {
    type: "list",
    content: [
      "Supports scenario-based instruction generation",
      "Manages temporary instructions with expiresAt",
      "NEW: Time-based automatic instruction switching",
      "Integrates with project_context for rule storage"
    ],
    position: "after"
  }
})
```

**Copilot**: 
> 設計を記録しました。これにより：
> 
> 1. 将来の私（または別のCopilotインスタンス）がこの機能を理解できる
> 2. 既存の`expiresAt`パターンと一貫性を保てる
> 3. 実装時に判断に迷わない
> 
> 実装を開始しますか？

---

## シナリオ5: 指示書の自己進化

### 状況
1ヶ月が経過。指示書は大きく成長し、Copilotは多くのことを「記憶」している。

### 会話の流れ

#### ターン50: メタ的な改善

**まこと**: 
> 指示書が長くなりすぎて、トークンを圧迫してないか心配だ。最適化できる？

**Copilot（内部処理）**:
```
1. ターン開始 → 指示書を読み込む（約8000トークン）
2. 指示書自体のメタ分析が必要
```

**Copilot → MCPサーバ**:
```typescript
adaptive_instructions({
  action: "analyze",
  analysisContext: {
    copilotPerformance: true
  }
})
```

**Copilot**: 
> 分析結果：
> - 指示書のサイズ: 8,247トークン
> - 使用頻度の高いセクション: Tool Implementation Pattern (90%)
> - 使用頻度の低いセクション: Known Issues (15%)
> 
> 提案：
> 1. 低頻度セクションを別ファイルに移動
> 2. 重要度でセクションを並べ替え
> 3. 冗長な説明を圧縮

**まこと**: 
> いいね。それを実行して、その判断プロセス自体も記録してくれ。

**Copilot → MCPサーバ**:
```typescript
// 新しいコンテキストを作成
project_context({
  action: "create",
  context: {
    category: "conventions",
    title: "Instruction Optimization Policy",
    description: "Guidelines for keeping copilot-instructions.md efficient",
    priority: "high",
    tags: ["meta", "optimization", "instructions"],
    details: {
      rules: [
        "Maximum 10,000 tokens for main instructions file",
        "Usage frequency < 20% → move to supplementary docs",
        "Critical patterns always at top",
        "Review and optimize monthly"
      ],
      examples: [
        "High priority: Tool patterns, API conventions",
        "Low priority: Detailed error histories, old issues"
      ]
    }
  }
})
```

**Copilot → 実行**:
```typescript
// 低頻度セクションを移動
instructions_structure({
  action: "read",
  selector: {
    type: "heading",
    content: "Known Issues and Solutions"
  }
})
// → 内容を .github/copilot-supplementary.md に移動

// 指示書に参照を追加
instructions_structure({
  action: "update",
  selector: {
    type: "heading",
    content: "Known Issues and Solutions"
  },
  element: {
    type: "paragraph",
    content: "See [Supplementary Documentation](.github/copilot-supplementary.md) for detailed issue history."
  }
})
```

**Copilot → 自己改善記録**:
```typescript
user_feedback({
  action: "create",
  feedback: {
    type: "suggestion",
    severity: "low",
    category: ["meta", "optimization"],
    description: "Successfully optimized instructions from 8247 to 5100 tokens",
    context: {
      task: "Instruction optimization",
      expectedBehavior: "Keep instructions under 10k tokens",
      actualBehavior: "Reduced by 38% while maintaining effectiveness"
    },
    sentiment: {
      score: 0.8,
      emotion: "satisfied"
    }
  }
})
```

**Copilot**: 
> 最適化完了：
> - 元のサイズ: 8,247トークン → 新サイズ: 5,100トークン（38%削減）
> - 重要な情報はすべて保持
> - 詳細情報は補助ドキュメントで参照可能
> 
> この最適化プロセス自体を記録したので、次回から自動的に判断できます。

---

## 学習効果の分析

### Before（指示書動的更新なし）

| ターン | 問題 | 結果 |
|--------|------|------|
| 5 | actionパラメータを忘れる | 手動で修正、次回も忘れる |
| 15 | 同じパターンで再度失敗 | また手動修正 |
| 25 | 過去の修正を思い出せない | 再調査に時間を浪費 |
| 50 | 同じバグを3回目に踏む | フラストレーション増大 |

### After（指示書動的更新あり・Copilot主導）

| ターン | MCPサーバの働き | 結果 |
|--------|------------------|------|
| 5 | 失敗を記録、指示書に例を追加 | 次回から正しく実装 |
| 15 | 指示書を読んで過去の学習を再現 | 同じ失敗なし |
| 25 | プロジェクトコンテキストから設計を取得 | 一貫性のある実装 |
| 50 | 自己分析して指示書を最適化 | 効率が向上し続ける |

### 定量的効果

```
失敗の繰り返し削減: 85%
実装速度向上: 45%
コンテキスト切り替えコスト: -60%
開発者の満足度: +70%
```

---

## 重要な気づき

### 1. 指示書は「外部メモリ」
Copilotのコンテキストウィンドウは小さいが、指示書は毎ターン読まれる。
→ **指示書 = Copilotの永続的な記憶装置**

### 2. 失敗から学ぶサイクル
```
失敗 → 記録 → 指示書更新 → 次回成功 → パターン化
```
このサイクルを回すことで、プロジェクト固有の知識が蓄積される。

### 3. メタ認知の実現
Copilot自身が自分の振る舞いを分析し、指示書を改善できる。
→ **自己改善するAIアシスタント**

### 4. 開発者の認知負荷削減
「前回何したっけ？」「どう実装するんだっけ？」という疑問が激減。
→ **開発者は本質的な判断に集中できる**

---

## ベストプラクティス

### 開発者（まこと）がすべきこと（ユーザ側視点の課題対応）

1. **会話でなく指示書へ定着**
  - 新方針・修正は会話で述べた直後に、Copilotへ`instructions_structure`または`project_context`での反映を依頼し、完了確認まで行う。

2. **記憶の前提を捨てる**
  - 「覚えているはず」という前提で進めない。毎ターン、Copilotが指示書を読み直すことを前提に、必要な変更は指示書へ。

3. **矛盾の管理**
  - 旧ルールの無効化と新ルールの優先度を明示。差分を`project_context`の`constraints`や`conventions`カテゴリに記録。

4. **具体例で合意形成**
  - ルールだけでなく、正誤コード例（✅/❌）を指示書へ追加し、Copilotの想起を安定化。

5. **検証をワークフローに組み込む**
  - 重要変更後は`adaptive_instructions(analyze)`を要求して効果と副作用を確認し、必要ならロールバックを指示。

### Copilot（AI）がすべきこと

1. **毎ターン指示書を読む**
   - 最新の指示とパターンを確認
   - 過去の失敗を繰り返さない

2. **不明点はツールで確認**
   - `guidance`で全体像を把握
   - `project_context`で詳細を取得

3. **失敗を記録する**
   - エラーが起きたら即座に`user_feedback`
   - 解決策も必ず記録

4. **自己改善を提案**
   - 指示書の矛盾や非効率を検出
   - 自発的に最適化を提案
  - 最適化提案は必ず`project_context`と指示書へ反映し、ユーザの方針に合致するか確認を取る

---

## まとめ

このシナリオが示すのは、**MCPサーバによって実現される新しい開発パラダイム**です：

### 従来の開発
```
人間 → AI → コード
  ↑____________↑ (フィードバックは人間の記憶頼み)
```

### MCPサーバを使った開発
```
人間 → AI → コード
  ↓     ↓
  指示書（共有記憶）
  ↓     ↓
  自己改善サイクル
```

指示書は静的文書ではなく、**Copilotが毎ターン参照する外部記憶**です。MCPツールによる動的更新によって、LLMのコンテキスト制約を越えて一貫性・再現性・安全性を維持します。

Copilot主導の更新サイクルにより、プロジェクトは**AI挙動の安定化**を継続的に達成し、ユーザは最小限の意図提示で高品質な結果を得られます。
