# AI Review CLI – Technical Specification (TypeScript, GitLab-first, MCP-ready)

## Overview

**AI Review CLI** is a local developer tool that enables AI agents (Claude Code, Cursor, GitHub Copilot, etc.) to perform automated Merge Request (MR) code reviews by:

- Fetching MR context (diffs, metadata, changed files)
- Producing structured context for LLM consumption
- Validating structured review output
- Posting review comments back to Git provider platforms

The system is **CLI-first**, but designed to be easily extended into an **MCP (Model Context Protocol) server** later.

Initial implementation targets **GitLab**, with a provider abstraction layer to support **GitHub** in future phases.

---

# Goals

## Primary Goals

- Provide a **local CLI tool** callable by AI agents inside IDEs.
- Keep **model execution outside** the platform (agent-controlled).
- Standardize MR context format for consistent AI reviews.
- Enable engineers to **post AI-generated comments** directly to Git providers.

## Non-goals (Phase 1–3)

- No embedded LLM runtime
- No hosted backend service
- No analytics or policy enforcement

---

# Architecture Overview

```
AI Agent (Claude Code / Cursor / Copilot)
           ↓
        CLI (ai-review)
           ↓
Provider Layer (GitLab first)
           ↓
Git Provider APIs
```

Future extension:

```
CLI
 ↓
MCP Server Wrapper
 ↓
Agent Tool Discovery
```

---

# Implementation Phases

| Phase            | Scope                                 |
| ---------------- | ------------------------------------- |
| Phase 1          | MR Context Fetch CLI                  |
| Phase 2          | Prompt + Structured Output Validation |
| Phase 3          | Comment Publisher                     |
| Phase 4 (future) | MCP Server                            |

This spec covers **Phase 1–3**.

---

# Tech Stack

| Component         | Choice          |
| ----------------- | --------------- |
| Language          | TypeScript      |
| Runtime           | Node.js 20+     |
| CLI framework     | commander       |
| HTTP client       | axios           |
| Schema validation | zod             |
| File system       | fs/promises     |
| Auth storage      | Local JSON file |

---

# Project Structure

```
ai-review/
 ├─ src/
 │   ├─ cli/
 │   │   ├─ index.ts
 │   │   ├─ commands/
 │   │   │   ├─ configure.ts
 │   │   │   ├─ get-context.ts
 │   │   │   ├─ post-comments.ts
 │   │   │   └─ validate-output.ts
 │   │
 │   ├─ providers/
 │   │   ├─ base.ts
 │   │   └─ gitlab/
 │   │       ├─ gitlab-client.ts
 │   │       └─ gitlab-provider.ts
 │   │
 │   ├─ context/
 │   │   ├─ mr-context-builder.ts
 │   │   └─ diff-parser.ts
 │   │
 │   ├─ schema/
 │   │   ├─ review-output.schema.ts
 │   │   └─ mr-context.schema.ts
 │   │
 │   └─ utils/
 │       └─ credentials.ts
 │
 ├─ package.json
 └─ README.md
```

---

# CLI Design

## Command List

| Command           | Description                    |
| ----------------- | ------------------------------ |
| `configure`       | Configure provider credentials |
| `get-context`     | Fetch MR context               |
| `validate-output` | Validate AI output JSON        |
| `post-comments`   | Publish comments to MR         |

---

## CLI Usage

### Configure GitLab

```bash
ai-review configure gitlab
```

Interactive prompt:

```
Enter GitLab Personal Access Token:
```

Stored at:

```
~/.ai-review/credentials.json
```

Example:

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

### Fetch MR Context

```bash
ai-review get-context <MR_URL> [--stdout] [--output <path>]
```

Pass the full GitLab Merge Request URL. The domain is used to automatically select the
correct credentials from `~/.ai-review/credentials.json`.

#### Output destination flags

| Flag                    | Behaviour                                                                            |
| ----------------------- | ------------------------------------------------------------------------------------ |
| _(none)_                | Writes JSON to `ai-review-output/review.json` (relative to cwd); logs path to stderr |
| `--stdout`              | Prints JSON to stdout                                                                |
| `--output <path>`       | Writes JSON to the specified path; logs path to stderr                               |
| `--output` + `--stdout` | `--output` takes precedence                                                          |

Examples:

```bash
# Default — writes to ai-review-output/review.json
ai-review get-context https://gitlab.com/group/repo/-/merge_requests/123

# Stdout (suitable for piping or direct agent consumption)
ai-review get-context https://gitlab.com/group/repo/-/merge_requests/123 --stdout

# Custom output path
ai-review get-context https://gitlab.com/group/repo/-/merge_requests/123 --output /tmp/mr-context.json

# Self-hosted instance
ai-review get-context https://gitlab.mycompany.com/group/repo/-/merge_requests/456
```

Output:

```json
{
  "title": "...",
  "description": "...",
  "files": [...]
}
```

This output is consumed by AI agents.

---

### Validate AI Output

```bash
ai-review validate-output review.json
```

Ensures output follows schema before posting.

---

### Post Comments

```bash
ai-review post-comments <MR_URL> \
  --input review.json
```

The MR URL is parsed to resolve the domain, project path, and MR IID, and
credentials are selected automatically based on the URL's domain.

---

# Authentication Design

## Requirements

- Engineers manually create **Personal Access Token**
- Token stored locally
- No shared service tokens

---

## Credential File

```
~/.ai-review/credentials.json
```

Structure:

Credentials are keyed by hostname to support multiple GitLab instances
(gitlab.com and any number of self-hosted instances):

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

Run `ai-review configure gitlab` once per GitLab instance you need to access.

---

## Token Scopes (GitLab)

Minimum required:

- `api`
- `read_repository`

---

# Provider Abstraction Layer

Future-proofing for GitHub requires a provider interface.

---

## Provider Interface

```ts
export interface GitProvider {
  getMergeRequest(projectId: string, mrId: string): Promise<MergeRequest>;

  getMergeRequestChanges(projectId: string, mrId: string): Promise<FileDiff[]>;

  postReviewComments(
    projectId: string,
    mrId: string,
    comments: ReviewComment[],
  ): Promise<void>;
}
```

---

## GitLab Implementation

Endpoints used:

### MR metadata

```
GET /projects/:id/merge_requests/:iid
```

### MR changes

```
GET /projects/:id/merge_requests/:iid/changes
```

### Post discussion

```
POST /projects/:id/merge_requests/:iid/discussions
```

---

# MR Context Builder

## Responsibilities

- Fetch MR metadata
- Fetch file diffs
- Filter binary files
- Normalize structure for LLM usage

---

## Output Schema

```ts
export interface MRContext {
  title: string;
  description: string;
  sourceBranch: string;
  targetBranch: string;
  files: FileDiff[];
}
```

---

## File Structure

```ts
export interface FileDiff {
  path: string;
  language?: string;
  diff: string;
}
```

---

## Filtering Rules (Phase 1)

Exclude:

- Binary files
- Large files (>200KB diff)
- Lock files

---

# Prompt Standardization (Phase 2)

CLI does not run models but standardizes expected format.

Agents should use:

```
You are a senior engineer performing code review.

Focus on:
- Bugs
- Security
- Performance
- Readability
- Test coverage

Return JSON:
{
  "comments": [...]
}
```

---

# Structured Review Output Schema

Implemented using **zod**.

---

## Schema Definition

```ts
export const ReviewSchema = z.object({
  comments: z.array(
    z.object({
      file: z.string(),
      line: z.number(),
      severity: z.enum(['critical', 'warning', 'suggestion']),
      comment: z.string(),
    }),
  ),
});
```

---

# Comment Publisher (Phase 3)

## Flow

```
AI Agent
 ↓
review.json
 ↓
validate-output
 ↓
post-comments
```

---

## Posting Strategy

Each comment becomes a GitLab discussion.

Mapping:

| JSON Field | GitLab Field       |
| ---------- | ------------------ |
| file       | position[new_path] |
| line       | position[new_line] |
| comment    | body               |

---

## Failure Handling

- Invalid schema → reject
- API error → print structured error JSON

---

# Error Format

```json
{
  "error": "INVALID_SCHEMA",
  "message": "line must be number"
}
```

---

# Extensibility for GitHub

Because provider abstraction already exists, adding GitHub requires:

```
providers/
  github/
    github-provider.ts
```

Endpoints:

```
GET /repos/{owner}/{repo}/pulls/{number}
GET /pulls/{number}/files
POST /pulls/{number}/comments
```

No CLI changes required.

---

# MCP Extension Design (Future Phase)

CLI architecture intentionally maps to MCP tools.

| CLI Command     | MCP Tool         |
| --------------- | ---------------- |
| get-context     | get_mr_context   |
| post-comments   | post_mr_comments |
| validate-output | validate_review  |

---

## MCP Wrapper Structure

```
src/mcp/
  server.ts
  tools/
    get-mr-context.ts
    post-comments.ts
```

Implementation approach:

- MCP server simply calls existing CLI service layer
- No duplication of logic

---

# Security Considerations

- Tokens stored locally only
- No telemetry
- No remote calls except Git provider APIs

---

# Example End-to-End Flow

## Step 1 — Engineer asks agent

```
Help me review this MR 123
```

---

## Step 2 — Agent calls CLI

```
ai-review get-context https://gitlab.com/group/repo/-/merge_requests/123 --stdout
```

The domain (`gitlab.com`) is used to select the correct credentials automatically.
Use `--stdout` when the agent reads the JSON directly from stdout, or omit the flag
to have the output saved to `ai-review-output/review.json`.

---

## Step 3 — Agent runs LLM

Produces:

```
review.json
```

---

## Step 4 — Agent posts comments

```
ai-review post-comments https://gitlab.com/group/repo/-/merge_requests/123 \
  --input review.json
```

---

# Phase 1–3 Deliverables

## Phase 1

- CLI scaffold
- GitLab provider
- MR context builder

## Phase 2

- Review schema validation
- Output validator command

## Phase 3

- Comment publisher
