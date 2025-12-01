# mcp-copilot-instructions

**Solving LLM Attention Dispersion Problem with "Context-Dependent Dynamic Instruction Generation"**

## Challenge
Adding extensive instructions → Massive growth → LLM attention dispersion → Important instructions become ineffective

## Solution
```
Huge instruction database (.copilot-instructions/, Git managed)
    ↓ Context recognition engine (MCP server)
    ↓ Understand current state/flow from ToDo management
    ↓ Extract only relevant instructions
.github/copilot-instructions.md (dynamically generated)
    ↓ Narrowed down to only necessary instructions for current context
LLM (Focused attention)
```

## Purpose
- **Prevent attention dispersion from instruction bloat**: Retain overall project knowledge while providing LLM with only instructions needed for "current flow"
- **Context-dependent dynamic generation**: Automatically extract appropriate instructions for current phase from ToDo and task state
- **Git-managed change history**: Manage entire instruction database with Git, utilize branching strategy, review, and rollback

## Important: Terminology Definition

In this project, careful attention is required regarding who "user" refers to:

- **Copilot (LLM)**: **Primary user** of MCP tools. Calls tools itself to manage context.
- **Human Developer**: Actual developer using Copilot. Gives instructions to Copilot and makes final decisions.

Unless specifically noted, "user" refers to **Copilot (LLM) itself**.

## Installation

### Using npx (Recommended)

The easiest way to use this MCP server is via npx:

```bash
npx @mako10k/mcp-copilot-instructions
```

### From npm

```bash
npm install -g @mako10k/mcp-copilot-instructions
```

### From Source

```bash
git clone https://github.com/mako10k/mcp-copilot-instructions.git
cd mcp-copilot-instructions/server
npm install
npm run build
```

## Configuration

### For Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "copilot-instructions": {
      "command": "npx",
      "args": ["@mako10k/mcp-copilot-instructions"]
    }
  }
}
```

**Config file locations:**
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`
- Linux: `~/.config/Claude/claude_desktop_config.json`

### For VS Code with GitHub Copilot

Add to your VS Code `settings.json`:

```json
{
  "github.copilot.chat.mcp.enabled": true,
  "github.copilot.chat.mcp.servers": {
    "copilot-instructions": {
      "command": "npx",
      "args": ["@mako10k/mcp-copilot-instructions"]
    }
  }
}
```

### Using Local Installation

If installed globally or from source:

```json
{
  "mcpServers": {
    "copilot-instructions": {
      "command": "node",
      "args": ["/path/to/mcp-copilot-instructions/server/dist/index.js"]
    }
  }
}
```

## Quick Start

After configuration, restart your MCP client (Claude Desktop or VS Code). The server will automatically start when the client initializes.

## Main Documentation
- Design: `docs/mcp-server-design.md`
- Operations: `docs/operation-scenarios.md`
- Research: `research/copilot-instructions-research.md`
- Instructions: `.github/copilot-instructions.md`

## Operations Policy (Excerpt)
- Regular review: At least once a week, immediate reflection for important changes
- Change retention: Reflect decisions made in conversations into instructions and context
- Conflict management: Explicitly invalidate old rules and prioritize new rules

## Key Features (Phase 2 Complete)
- ✅ **Goal Management System**: Hierarchical goal tracking with auto-advancement, never lose sight of objectives
- ✅ **Conflict Detection**: External change detection with safe resolution
- ✅ **History Management**: Rollback capability with 30-day retention
- ✅ **Dynamic Generation**: Context-aware instruction filtering
- ✅ **Feedback System**: Critical feedback tracking with hard/soft limits

## Available MCP Tools
1. **guidance**: Usage guide and current status
2. **project_context**: CRUD operations for project context
3. **instructions_structure**: Markdown AST operations with conflict management
4. **change_context**: Development context switching with auto-regeneration
5. **feedback**: Critical feedback tracking
6. **onboarding**: Migration support for existing projects
7. **goal_management**: Hierarchical goal tracking and progress management

## Troubleshooting

### Server doesn't start
- Ensure Node.js 18+ is installed: `node --version`
- Verify npx is available: `which npx`
- Check MCP client logs for error messages

### Tools not appearing
- Restart MCP client completely
- Verify configuration JSON syntax is valid
- Check that command path is correct

### Permission errors
- On Unix systems, ensure execute permission: `chmod +x dist/index.js`
- For global install, may need sudo: `sudo npm install -g @mako10k/mcp-copilot-instructions`

## Contributing

Contributions are welcome! Please see:
- Design documentation: `docs/mcp-server-design.md`
- Development scenarios: `docs/operation-scenarios.md`

## License

MIT License - see LICENSE file for details

## Next Development Steps
- Integration testing and CI/CD setup
- Performance optimization for large instruction sets
- Enhanced analytics for instruction effectiveness
