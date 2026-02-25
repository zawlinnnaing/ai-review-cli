# ai-review CLI

A local developer tool that enables AI agents (Claude Code, Cursor, GitHub Copilot, etc.) to perform automated Merge Request code reviews against GitLab.

- [ai-review CLI](#ai-review-cli)
  - [Requirements](#requirements)
  - [Setup](#setup)
  - [Usage](#usage)
    - [Step 1 — Configure credentials (one-time)](#step-1--configure-credentials-one-time)
    - [Step 2 — Fetch MR context](#step-2--fetch-mr-context)
    - [Step 3 — Review with your AI agent](#step-3--review-with-your-ai-agent)
    - [Step 4 — Validate the review output](#step-4--validate-the-review-output)
    - [Step 5 — Post comments to the MR](#step-5--post-comments-to-the-mr)
    - [How it works end-to-end](#how-it-works-end-to-end)
  - [Commands](#commands)
    - [Configure GitLab credentials](#configure-gitlab-credentials)
    - [Fetch MR context](#fetch-mr-context)
    - [Validate review output](#validate-review-output)
    - [Post review comments](#post-review-comments)
  - [Project structure](#project-structure)
  - [Roadmap](#roadmap)

## Requirements

- Node.js 20+

## Setup

```bash
npm install
npm run build
npm link        # makes `ai-review` available globally
```

Alternatively, install as a global npm package:

```bash
npm install
npm run build
npm install -g .   # installs `ai-review` globally via npm
```

To uninstall the global package later:

```bash
npm uninstall -g ai-review-cli
```

Or run directly without building:

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

Fetches the MR title, description, and all changed files with annotated diffs. Writes context to `ai-review-output/context.json` by default.

### Step 3 — Review with your AI agent

Open AI Agent chat in your IDE (e.g. `Cmd+Shift+C` for Claude Code, `Cmd+I` for Cursor) and ask it to review the context file:

```
Review the MR context in ai-review-output/context.json and return a structured review JSON with this format:

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
| _(none)_                | Writes JSON to `ai-review-output/review.json` and logs the path to stderr |
| `--stdout`              | Prints JSON to stdout                                                     |
| `--output <path>`       | Writes JSON to the specified path and logs it to stderr                   |
| `--output` + `--stdout` | `--output` takes precedence; writes to the specified path                 |

```bash
# Default — writes to ai-review-output/review.json
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

| Field      | Type                                          | Description                     |
| ---------- | --------------------------------------------- | ------------------------------- |
| `file`     | `string`                                      | File path relative to repo root |
| `line`     | `number`                                      | Line number in the new file     |
| `severity` | `"critical" \| "warning" \| "suggestion"`     | Severity level of the comment   |
| `comment`  | `string`                                      | The review comment text         |

On success, prints a summary to stdout:

```
Valid review output: 5 comments
```

On failure, prints a structured error to stderr and exits with code 1:

```json
{ "error": "INVALID_SCHEMA", "message": "comments.0.severity: Invalid enum value..." }
```

---

### Post review comments

```bash
ai-review post-comments <MR_URL> --input <file>
```

Reads and validates the review JSON, then posts each comment as an inline discussion thread on the GitLab MR. The MR URL is parsed to resolve the domain, project path, and MR IID; credentials are selected automatically based on the URL's domain.

```bash
ai-review post-comments https://gitlab.com/group/repo/-/merge_requests/123 --input review.json

# Self-hosted instance
ai-review post-comments https://gitlab.mycompany.com/group/repo/-/merge_requests/456 --input review.json
```

| Option          | Description                            |
| --------------- | -------------------------------------- |
| `--input <file>` | Path to the review JSON file (required) |

On success, prints a summary to stdout:

```
Posted 5 comments to MR.
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
