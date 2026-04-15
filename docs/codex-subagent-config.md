# Codex Subagent Project Config

Official Codex docs allow project-scoped overrides in `.codex/config.toml` and role-specific config layers via `agents.<name>.config_file`.

Reference:

- https://developers.openai.com/codex/config-reference#configtoml

The current sandbox blocks writes into the repo's hidden `.codex/` directory, so these files could not be installed directly from this session. Use the following contents for the repo-local config:

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
```

`.codex/agents/reviewer.toml`

```toml
model = "gpt-5.4"
model_reasoning_effort = "high"
personality = "pragmatic"
```

`.codex/agents/explorer.toml`

```toml
model = "gpt-5.4-mini"
model_reasoning_effort = "high"
personality = "pragmatic"
```

Expected behavior:

- `worker` spawns default to `gpt-5.3-codex`
- `default` spawns default to `gpt-5.4` high reasoning, which is a good fit for adversarial review
- `explorer` spawns default to a cheaper read-only model

Operational note:

- Project-scoped `.codex/config.toml` loads only for trusted projects.
