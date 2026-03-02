# ai-review CLI

A local developer tool that enables AI agents (Claude Code, Cursor, GitHub Copilot, etc.) to perform automated Merge Request code reviews against GitLab.

- [ai-review CLI](#ai-review-cli)
  - [Requirements](#requirements)
  - [Installation](#installation)
    - [Option A — Download pre-built binary from GitLab release (recommended)](#option-a--download-pre-built-binary-from-gitlab-release-recommended)
    - [Option B — Install from GitLab Package Registry](#option-b--install-from-gitlab-package-registry)
    - [Option C — Local development](#option-c--local-development)
  - [Usage](#usage)
    - [Step 1 — Configure credentials (one-time)](#step-1--configure-credentials-one-time)
    - [Step 2 — Fetch MR context](#step-2--fetch-mr-context)
    - [Step 3 — Review with your AI agent](#step-3--review-with-your-ai-agent)
    - [Step 4 — Validate the review output](#step-4--validate-the-review-output)
    - [Step 5 — Post comments to the MR](#step-5--post-comments-to-the-mr)
    - [How it works end-to-end](#how-it-works-end-to-end)
  - [Commands](#commands)
    - [Check CLI version](#check-cli-version)
    - [Configure GitLab credentials](#configure-gitlab-credentials)
    - [Fetch MR context](#fetch-mr-context)
    - [Validate review output](#validate-review-output)
    - [Post review comments](#post-review-comments)
  - [Project structure](#project-structure)
  - [Roadmap](#roadmap)

## Requirements

- Node.js 20+

## Installation

### Option A — Download pre-built binary from GitLab release (recommended)

Pre-built binaries are published to the [GitLab releases page](https://github.com/zawlinnnaing/ai-review-cli/-/releases) for every version tag. No Node.js required.

Download the appropriate binary for your platform using `curl` or `Invoke-WebRequest` in PowerShell, make it executable, and move it to a directory on your PATH.

> NOTE: If you already downloaded a release binary from Gitlab UI, you don't need to run command to download. Just make it executable and move to PATH. Command must be named `ai-review` (or `ai-review.exe` on Windows) to work correctly with [mr-review](https://gitlab.com/sertiscorp/dev/se-team/agent-skills/-/blob/main/skills/mr-review/SKILL.md) skill.

**macOS (Intel and Apple Silicon)**

> Apple Silicon users should use the x64 binary via Rosetta 2.

```bash
curl -L --header "PRIVATE-TOKEN: <TOKEN>" \
  "https://gitlab.com/api/v4/projects/sertiscorp%2Fdev%2Fse-team%2Fai-review-cli/packages/generic/ai-review-cli/<VERSION>/ai-review-macos-x64" \
  -o ai-review
chmod +x ai-review
sudo mv ai-review /usr/local/bin/
```

**Linux (x64)**

```bash
curl -L --header "PRIVATE-TOKEN: <TOKEN>" \
  "https://gitlab.com/api/v4/projects/sertiscorp%2Fdev%2Fse-team%2Fai-review-cli/packages/generic/ai-review-cli/<VERSION>/ai-review-linux-x64" \
  -o ai-review
chmod +x ai-review
sudo mv ai-review /usr/local/bin/
```

**Linux (ARM64)**

```bash
curl -L --header "PRIVATE-TOKEN: <TOKEN>" \
  "https://gitlab.com/api/v4/projects/sertiscorp%2Fdev%2Fse-team%2Fai-review-cli/packages/generic/ai-review-cli/<VERSION>/ai-review-linux-arm64" \
  -o ai-review
chmod +x ai-review
sudo mv ai-review /usr/local/bin/
```

**Windows (x64)**

```powershell
Invoke-WebRequest -Uri "https://gitlab.com/api/v4/projects/sertiscorp%2Fdev%2Fse-team%2Fai-review-cli/packages/generic/ai-review-cli/<VERSION>/ai-review-win-x64.exe" `
  -Headers @{"PRIVATE-TOKEN" = "<TOKEN>"} `
  -OutFile "ai-review.exe"
# Move ai-review.exe to a directory on your PATH
```

Replace `<TOKEN>` with a GitLab PAT with `read_api` or `read_package_registry` scope, and `<VERSION>` with the desired release version (e.g. `1.2.3`). Available releases are listed on the [releases page](https://github.com/zawlinnnaing/ai-review-cli/-/releases).

### Option B — Install from GitLab Package Registry

Authenticate once to the project-scoped registry, then install the published package:

```bash
# Point the @sertiscorp scope to this project registry
npm config set @sertiscorp:registry https://gitlab.com/api/v4/projects/sertiscorp%2Fdev%2Fse-team%2Fai-review-cli/packages/npm/

# Authenticate (use a GitLab PAT with read_api or read_package_registry, or CI_JOB_TOKEN in CI)
npm set //gitlab.com/api/v4/projects/sertiscorp%2Fdev%2Fse-team%2Fai-review-cli/packages/npm/:_authToken <TOKEN>

# Install globally
npm install -g @sertiscorp/ai-review-cli
```

### Option C — Local development

Clone the repo and link it globally:

```bash
npm install
npm run build
npm link        # makes `ai-review` available globally
```

To uninstall:

```bash
npm uninstall -g @sertiscorp/ai-review-cli
```

Run directly without building:

```bash
npx tsx src/cli/index.ts <command>
```

---

## Usage

This tool acts as a bridge between your AI IDE and Git Provider (GitLab). The agent calls `ai-review` to fetch structured MR context, performs its own code review, and validates the output against a schema before posting comments back.

### Step 1 — Configure credentials (one-time)

Run this once for every GitLab instance you work with:

```bash
ai-review configure gitlab
```

You will be prompted for your GitLab base URL and a Personal Access Token with `api` and `read_repository` scopes.

### Step 2 — Fetch MR context

```bash
ai-review get-context "<MR_URL>"
```

Fetches the MR title, description, and all changed files with annotated diffs. Writes context to `~/.ai-review/mr-context.json` by default.

### Step 3 — Review with your AI agent

Open AI Agent chat in your IDE (e.g. `Cmd+Shift+C` for Claude Code, `Cmd+I` for Cursor) and ask it to review the context file:

```
Review the MR context in ~/.ai-review/mr-context.json and return a structured review JSON with this format:

{
  "comments": [
    {
      "file": "<file path>",
      "line": <line number>,
      "severity": "critical" | "warning" | "suggestion",
      "comment": "<review comment>"
    }
  ]
}

Save the result to review.json.
```

### Step 4 — Validate the review output

```bash
ai-review validate-output review.json
```

Validates the agent's output against the review schema before posting. Exits with code 1 and a structured error if the output is malformed.

### Step 5 — Post comments to the MR

```bash
ai-review post-comments "<MR_URL>" --input review.json

# Post only warnings and criticals
ai-review post-comments "<MR_URL>" --input review.json --severity warning
```

Posts each comment from the validated review JSON as an inline discussion on the GitLab MR.

---

### How it works end-to-end

```
You (in IDE chat)
    │  "Review MR #123"
    ▼
AI Agent
    │  ai-review get-context <MR_URL> [--stdout | --output <path>]
    ▼
ai-review CLI   ──►  GitLab API
    │  returns MRContext JSON
    ▼
AI Agent  (runs code review → writes review.json)
    │  ai-review validate-output review.json
    ▼
ai-review CLI  (schema validation)
    │  ai-review post-comments <MR_URL> --input review.json
    ▼
ai-review CLI   ──►  GitLab API  (posts inline discussions)
    │  success summary
    ▼
You
```

---

## Commands

### Check CLI version

```bash
ai-review --version
```

Prints the CLI version sourced from `package.json` so the flag stays in sync with releases.

### Configure GitLab credentials

```bash
ai-review configure gitlab
```

Prompts for your Personal Access Token and base URL, then stores the entry (keyed by domain) at `~/.ai-review/credentials.json`.
Run the command once per GitLab instance you want to use.

Required GitLab token scopes: `api`, `read_repository`.

Example credentials file with multiple instances:

```json
{
  "gitlab": {
    "gitlab.com": {
      "token": "glpat-xxxxx",
      "baseUrl": "https://gitlab.com"
    },
    "gitlab.mycompany.com": {
      "token": "glpat-yyyyy",
      "baseUrl": "https://gitlab.mycompany.com"
    }
  }
}
```

---

### Fetch MR context

```bash
ai-review get-context <MR_URL> [--stdout] [--output <path>]
```

Pass the full GitLab Merge Request URL — works for both `gitlab.com` and self-hosted instances.
The correct credentials are selected automatically based on the URL's domain.

| Flag                    | Behaviour                                                                 |
| ----------------------- | ------------------------------------------------------------------------- |
| _(none)_                | Writes JSON to `~/.ai-review/mr-context.json` and logs the path to stderr |
| `--stdout`              | Prints JSON to stdout                                                     |
| `--output <path>`       | Writes JSON to the specified path and logs it to stderr                   |
| `--output` + `--stdout` | `--output` takes precedence; writes to the specified path                 |

```bash
# Default — writes to ~/.ai-review/mr-context.json
ai-review get-context https://gitlab.com/group/repo/-/merge_requests/123

# Print to stdout
ai-review get-context https://gitlab.com/group/repo/-/merge_requests/123 --stdout

# Write to a custom path
ai-review get-context https://gitlab.com/group/repo/-/merge_requests/123 --output /tmp/mr-context.json

# Self-hosted instance
ai-review get-context https://gitlab.mycompany.com/group/repo/-/merge_requests/456
```

The JSON output has the following shape:

```json
{
  "title": "...",
  "description": "...",
  "sourceBranch": "...",
  "targetBranch": "...",
  "files": [
    {
      "path": "src/foo.ts",
      "language": "typescript",
      "diff": "..."
    }
  ]
}
```

---

### Validate review output

```bash
ai-review validate-output <file>
```

Validates an AI-generated review JSON file against the structured review output schema before posting comments.

```bash
ai-review validate-output review.json
```

Expected input schema:

```json
{
  "comments": [
    {
      "file": "src/foo.ts",
      "line": 42,
      "severity": "warning",
      "comment": "This function has no error handling."
    }
  ]
}
```

| Field      | Type                                      | Description                     |
| ---------- | ----------------------------------------- | ------------------------------- |
| `file`     | `string`                                  | File path relative to repo root |
| `line`     | `number`                                  | Line number in the new file     |
| `severity` | `"critical" \| "warning" \| "suggestion"` | Severity level of the comment   |
| `comment`  | `string`                                  | The review comment text         |

On success, prints a summary to stdout:

```
Valid review output: 5 comments
```

On failure, prints a structured error to stderr and exits with code 1:

```json
{
  "error": "INVALID_SCHEMA",
  "message": "comments.0.severity: Invalid enum value..."
}
```

---

### Post review comments

```bash
ai-review post-comments <MR_URL> --input <file> [--severity <level>]
```

Reads and validates the review JSON, then posts each comment as an inline discussion thread on the GitLab MR. The MR URL is parsed to resolve the domain, project path, and MR IID; credentials are selected automatically based on the URL's domain.

```bash
ai-review post-comments https://gitlab.com/group/repo/-/merge_requests/123 --input review.json

# Post only warnings and criticals
ai-review post-comments https://gitlab.com/group/repo/-/merge_requests/123 --input review.json --severity warning

# Self-hosted instance
ai-review post-comments https://gitlab.mycompany.com/group/repo/-/merge_requests/456 --input review.json
```

| Option               | Description                                                                                   |
| -------------------- | --------------------------------------------------------------------------------------------- |
| `--input <file>`     | Path to the review JSON file (required)                                                       |
| `--severity <level>` | Minimum severity to post: `suggestion` \| `warning` \| `critical`. Omit to post all comments. |

**Severity filter** — when `--severity` is set, only comments at or above the specified level are posted:

| `--severity` value | Comments posted               |
| ------------------ | ----------------------------- |
| `suggestion`       | suggestion, warning, critical |
| `warning`          | warning, critical             |
| `critical`         | critical only                 |

On success, prints a summary to stdout:

```
Posted 5 comments to MR.
Posted 3 comments to MR. (2 skipped below --severity warning)
```

On failure, prints a structured error to stderr and exits with code 1:

```json
{ "error": "POST_FAILED", "message": "Request failed with status code 422" }
```

---

## Project structure

```
src/
  cli/
    index.ts                  # CLI entry point
    commands/
      configure.ts            # `configure gitlab`
      get-context.ts          # `get-context`
      validate-output.ts      # `validate-output`
      post-comments.ts        # `post-comments`
  providers/
    base.ts                   # GitProvider interface
    gitlab/
      gitlab-client.ts        # Raw GitLab API client (axios)
      gitlab-provider.ts      # GitProvider implementation
  context/
    diff-parser.ts            # Language detection, filtering helpers
    mr-context-builder.ts     # Assembles MRContext from provider
  schema/
    mr-context.schema.ts      # Zod schema for MRContext
    review-output.schema.ts   # Zod schema for AI review output
  utils/
    credentials.ts            # Read/write ~/.ai-review/credentials.json
```

---

## Roadmap

| Phase | Scope                                 | Status      |
| ----- | ------------------------------------- | ----------- |
| 1     | MR Context Fetch CLI                  | ✅ Complete |
| 2     | Prompt + Structured Output Validation | ✅ Complete |
| 3     | Comment Publisher                     | ✅ Complete |
| 4     | MCP Server                            | Future      |
