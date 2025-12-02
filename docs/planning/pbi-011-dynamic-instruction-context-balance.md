# PBI-011: Dynamic Instruction Context Balance

**Created**: December 2, 2025  
**Priority**: 🟠 High  
**Epic**: E4 - Adaptive Instruction Generation and Rollback  
**Status**: 📋 Not Started

---

## Problem Statement

### Current Issues

The dynamic instruction generation via `change_context` exhibits the following problems:

1. **Context Information Dilution**
   - As critical sections (conventions, patterns, architecture, etc.) accumulate, they dominate the generated content
   - Current phase/focus/priority context information becomes relatively diminished
   - Result: "What are we doing now?" and "What should we focus on?" get buried in the noise

2. **Information Density Imbalance**
   - Persistent rules (conventions): Always needed, high volume
   - Temporal context (current task, focus): Critical but low volume
   - LLM attention biases toward persistent rules, diluting focus on context information

3. **Current Generation Logic**
   ```typescript
   // generateInstructions() overview
   1. Filter files by phase
   2. Concatenate file contents
   3. Append context information at the end
   ```
   - Context information is placed last, buried after extensive rule sets
   - Focus items displayed as simple lists lack visual emphasis

---

## Proposed Solution Approaches

### Approach 1: Dedicated Context Section ⭐ (Recommended)

**Overview**:
Place context information as a prominent dedicated section in the generated `.github/copilot-instructions.md`.

**Benefits**:
- ✅ Relatively simple implementation
- ✅ No response time impact
- ✅ LLM can clearly recognize "current context"
- ✅ Visual emphasis attracts attention

**Implementation Concept**:
```markdown
# Copilot Instructions

## 🎯 Current Development Context

**Phase**: Testing  
**Priority**: High  
**Focus Areas**:
- API authentication flow
- JWT token validation
- Error handling for expired tokens

**Active Goals**:
- Goal 2.1: Implement JWT middleware (In Progress)
- Goal 2.2: Add token refresh logic (Next)

---

## TypeScript Coding Conventions
...(existing persistent rules)

## Error Handling Patterns
...(existing persistent rules)
```

**Placement Options**:
1. **Top** (Recommended): First thing LLM sees, maximum attention
2. **Middle**: Between rule sets, balanced approach
3. **Separate File**: `.github/copilot-context.md` (requires verification of GitHub Copilot support)

**Weighting Techniques**:
- Visual emphasis with emojis and markdown formatting
- Structured tables instead of simple bullet lists
- Section ordering based on importance

---

### Approach 2: Dynamic Section Summarization (Using Sampling)

**Overview**:
Summarize each persistent rule section, with details available on reference.

**Benefits**:
- ✅ Significant information compression
- ✅ Increased relative weight of context information
- ✅ Token count reduction for cost savings

**Drawbacks**:
- ❌ Response time increase from Sampling API calls (several to tens of seconds)
- ❌ Risk of information loss through summarization
- ❌ Cache management complexity (re-summarization on file changes)
- ❌ Negative user experience impact (wait time)

**Implementation Concept**:
```typescript
// generateInstructions() with summarization
async function generateInstructions(context: DevelopmentContext) {
  // 1. File filtering (existing logic)
  const files = filterByPhase(context.phase);
  
  // 2. Summarize each file (using Sampling)
  const summaries = await Promise.all(
    files.map(file => summarizeSection(file.content))
  );
  
  // 3. Combine summaries + context information
  return buildInstructions(summaries, context);
}
```

**Assessment**: Currently **NOT recommended** (response time concerns)

---

### Approach 3: Hybrid Method

**Overview**:
- Critical sections: Full text
- Medium importance: Summarized
- Context information: Emphasized in dedicated section

**Benefits**:
- ✅ Balance between information volume and context weight
- ✅ Incremental implementation possible

**Drawbacks**:
- ❌ Implementation complexity
- ❌ Requires judgment on which sections to summarize
- ❌ Response time issue persists even with partial Sampling usage

---

## Recommended Implementation Plan

### Phase 1: Introduce Dedicated Context Section ⭐

**Goal**: Improve context information visibility without sacrificing response time

**Implementation Steps**:

1. **Create Context Section Generator**
   ```typescript
   function generateContextSection(context: DevelopmentContext, goals?: Goal[]): string {
     // Emojis, emphasis, structured display
   }
   ```

2. **Determine Placement**
   - Recommend top placement (LLM reads first)
   - Validate effectiveness with A/B testing

3. **Implement Visual Emphasis**
   - Attract attention with emojis (🎯 🔥 ⚡ etc.)
   - Prefer table/key-value formats over bullet lists
   - Markdown formatting (**bold**, `code`, > quotes)

4. **Dynamic Weighting**
   - Additional emphasis for `priority: high`
   - Order multiple `focus` items by priority
   - Visualize goal progress (in-progress, next, waiting)

**Expected Effects**:
- Increased attention to context information
- Clear "what are we doing now"
- Information placement that doesn't get buried

---

### Phase 2: Measure Effectiveness and Improve (Optional)

**Goal**: Quantitatively evaluate Phase 1 effectiveness and improve as needed

**Evaluation Metrics**:
- Frequency of current task mentions in LLM responses
- User feedback (context recognition level)
- Token count changes in generated instructions

**Additional Improvements** (if Phase 1 insufficient):
1. **Incremental Summary Introduction**
   - Summarize only the highest-volume section
   - Leverage caching to reduce response time
   
2. **Dynamic Section Selection**
   - Include only currently needed sections based on context
   - For "Testing phase", prioritize `patterns/testing.md`, summarize others

3. **Inline Annotations**
   - Annotate each persistent rule section with relevance to current context
   - Example: `## TypeScript Conventions ⚡ High relevance for current task`

---

## Technical Considerations

### Implementation Files

1. **`server/src/utils/generateInstructions.ts`**
   - Add `generateContextSection()` function
   - Restructure `generateInstructions()` (place context section at top)

2. **`server/src/utils/contextFormatter.ts`** (New)
   - Separate context information formatting logic
   - Helper functions for visual emphasis

3. **Test Cases**
   - Verify context section generation
   - Verify placement position
   - Verify output with various context values

### Configurable Options

Future control via `change_context` arguments:

```typescript
interface ChangeContextArgs {
  // Existing fields
  action: 'update' | 'read' | ...;
  state?: Partial<DevelopmentContext>;
  
  // New fields (Phase 2+)
  contextWeight?: 'minimal' | 'normal' | 'emphasized'; // Context emphasis level
  sectionSummary?: boolean; // Enable/disable section summarization
  contextPosition?: 'top' | 'middle' | 'bottom'; // Context section placement
}
```

---

## Risks and Constraints

### Risks

1. **Readability Degradation from Excessive Emphasis**
   - Mitigation: Find optimal emphasis level through A/B testing
   
2. **Token Count Increase**
   - Mitigation: Keep context section concise (target: within 200-300 tokens)

3. **LLM Behavior Changes**
   - Mitigation: Adjust placement to ensure existing rule references aren't reduced

### Constraints

1. **GitHub Copilot Specifications**
   - Depends on how `.github/copilot-instructions.md` is processed
   - Impact of section ordering on LLM attention requires experimental verification

2. **Sampling API Costs**
   - If summary introduced in Phase 2, cost vs response time tradeoff

---

## Success Criteria

### Phase 1 Completion

- ✅ Dedicated context section generated at top of `.github/copilot-instructions.md`
- ✅ Focus items, priority, current goals visually emphasized
- ✅ Response time equivalent to existing implementation (within 1 second)
- ✅ Users perceive "context is now clear"

### Phase 2 Completion (Optional)

- ✅ Section summarization selectively applied
- ✅ Summary generation overhead acceptable via caching (within +2 seconds)
- ✅ Token count reduced by 20-30% (if summary introduced)

---

## Related Documents

- `docs/planning/product-backlog.md` - E4 Epic
- `server/src/utils/generateInstructions.ts` - Current implementation
- `docs/mcp-prompts-resources-scenario.md` - Prompts and Resources feature (related technology)

---

## Next Actions

1. **Phase 1 Design Review**
   - Create context section format proposal
   - Validate placement position (top vs middle)
   
2. **Prototype Implementation**
   - Implement `generateContextSection()`
   - Integrate into existing `generateInstructions()`
   
3. **A/B Test Preparation**
   - Compare with/without context section
   - Collect user feedback

4. **Phase 2 Decision**
   - Consider summary introduction only if Phase 1 insufficient
   - Judge based on cost-response time-effectiveness balance

---

**Note**: This PBI **recommends starting with Phase 1 (Dedicated Context Section)**. It offers maximum effectiveness without sacrificing response time. Sampling-based summarization is positioned as a fallback if Phase 1 proves insufficient.
