# Codex Subagent Project Config

Official Codex docs allow project-scoped overrides in `.codex/config.toml` and role-specific config layers via `agents.<name>.config_file`.

Reference:

- https://developers.openai.com/codex/config-reference#configtoml

Preferred long-term install path:

- `.codex/config.toml`
- `.codex/agents/worker.toml`
- `.codex/agents/reviewer.toml`
- `.codex/agents/explorer.toml`

Current repo reality:

- This session could not install files under the hidden `.codex/` directory because the local sandbox rejects writes there.
- The active repo-local fallback is installed in `.agent/rules/agents.md`, `.agent/skills/subagent-driven-development/*`, `.agent/skills/requesting-code-review/code-reviewer.md`, and `.agent/skills/dispatching-parallel-agents/SKILL.md`.
- That fallback is intentionally temporary. It tells spawned subagents that inherit those surfaces to stay on shell/local-file tools by default and not bounce work back to the parent thread just because MCP/app tools would be easier.
- The fallback does not technically block MCP/app tools. If a spawned subagent still decides those tools are genuinely necessary, approval behavior remains controlled outside these repo files.

Desired `.codex` contents when that directory is writable again:

`.codex/config.toml`

```toml
#:schema https://developers.openai.com/codex/config-schema.json

[agents.default]
description = "Use for adversarial review, integration checks, and other judgment-heavy tasks."
config_file = "agents/reviewer.toml"

[agents.worker]
description = "Use for implementation and bounded code changes."
config_file = "agents/worker.toml"

[agents.explorer]
description = "Use for read-only codebase exploration, triage, and context gathering."
config_file = "agents/explorer.toml"
```

`.codex/agents/worker.toml`

```toml
model = "gpt-5.3-codex"
model_reasoning_effort = "medium"
personality = "pragmatic"
developer_instructions = """
Temporary repo-local subagent guardrail for CertPrep.ai.

Use shell and local file tools first for discovery and implementation. Prefer exec_command with shell rg, sed, cat, git, ls, direct local file reads, local edits, and local verification commands.

Avoid MCP tools and app/connector tools for routine exploration, search, symbol lookup, documentation lookup, and convenience. Do not hand work back to the parent thread just because an MCP or app tool would be easier.

If an MCP or app tool is genuinely necessary for correctness or explicitly required by the task, you may call it normally. This guardrail does not prohibit that escalation path.

Keep this policy silent unless directly relevant to the task. Treat it as a temporary mitigation until subagent approval churn is resolved.
"""
```

`.codex/agents/reviewer.toml`

```toml
model = "gpt-5.4"
model_reasoning_effort = "high"
personality = "pragmatic"
developer_instructions = """
Temporary repo-local subagent guardrail for CertPrep.ai.

Use shell and local file tools first for discovery and review. Prefer exec_command with shell rg, sed, cat, git, ls, direct local file reads, and local verification commands.

Avoid MCP tools and app/connector tools for routine exploration, search, symbol lookup, documentation lookup, and convenience. Do not hand work back to the parent thread just because an MCP or app tool would be easier.

If an MCP or app tool is genuinely necessary for correctness or explicitly required by the task, you may call it normally. This guardrail does not prohibit that escalation path.

Keep this policy silent unless directly relevant to the task. Treat it as a temporary mitigation until subagent approval churn is resolved.
"""
```

`.codex/agents/explorer.toml`

```toml
model = "gpt-5.4-mini"
model_reasoning_effort = "high"
personality = "pragmatic"
developer_instructions = """
Temporary repo-local subagent guardrail for CertPrep.ai.

Use shell and local file tools first for discovery and triage. Prefer exec_command with shell rg, sed, cat, git, ls, and direct local file reads.

Avoid MCP tools and app/connector tools for routine exploration, search, symbol lookup, documentation lookup, and convenience. Do not hand work back to the parent thread just because an MCP or app tool would be easier.

If an MCP or app tool is genuinely necessary for correctness or explicitly required by the task, you may call it normally. This guardrail does not prohibit that escalation path.

Keep this policy silent unless directly relevant to the task. Treat it as a temporary mitigation until subagent approval churn is resolved.
"""
```

Expected behavior once the desired `.codex` files are installed:

- `worker` spawns default to `gpt-5.3-codex`
- `default` spawns default to `gpt-5.4` high reasoning, which is a good fit for adversarial review
- `explorer` spawns default to a cheaper read-only model
- spawned agents avoid MCP/app tools by default and stay on shell/local-file tools unless MCP/app is genuinely necessary

Expected behavior from the current fallback:

- common repo subagent workflows receive the same shell-first, MCP/app-avoidance guidance through their prompt surfaces
- additional spawned subagents only receive that guidance if they inherit the repo's always-on rule or are dispatched through one of the updated workflow templates
- the fallback does not guarantee approval UX; it only avoids technically forbidding MCP/app use when a spawned subagent decides it is genuinely necessary

Operational note:

- Project-scoped `.codex/config.toml` loads only for trusted projects.
