---
name: ai-review
description: Review a GitLab Merge Request using the ai-review CLI. Fetches the MR diff, analyses it as a senior software engineer, produces structured inline comments by severity, and optionally posts them back to GitLab. Use when the user wants to review, analyse, or post feedback on a GitLab MR.
compatibility: Designed for Claude Code. Requires the ai-review CLI (npm install -g .) and a GitLab Personal Access Token with api and read_repository scopes.
allowed-tools: Bash Read Write
---

# MR Review Skill

Review a GitLab Merge Request and optionally post inline comments.

## Arguments

`$ARGUMENTS` — Optional GitLab MR URL (e.g. `https://gitlab.com/group/repo/-/merge_requests/123`). If not provided, ask the user.

## Workflow

### Step 1 — Verify CLI

```bash
ai-review --version
```

If not found, tell the user to run `npm install -g .` inside the `ai-review-cli` repo and stop.

### Step 2 — Check credentials

```bash
cat ~/.ai-review/credentials.json
```

If the file is missing or has no `gitlab` key, tell the user to run `ai-review configure gitlab` and stop.

### Step 3 — Obtain and validate the MR URL

Use `$ARGUMENTS` if it starts with `http`. Otherwise ask the user.
Validate the URL matches: `https://<host>/<namespace>/<repo>/-/merge_requests/<number>`.

### Step 4 — Fetch MR context

```bash
ai-review get-context <MR_URL>
```

Writes to `~/.ai-review/mr-context.json`. On non-zero exit, surface the error code clearly:
- `CREDENTIALS_NOT_FOUND` → run `ai-review configure gitlab`
- `INVALID_URL` → ask user to check the URL
- `API_ERROR` → show the message

### Step 5 — Analyse and generate review

Read `~/.ai-review/mr-context.json` and analyse every changed file as a senior engineer. Focus on:

- **Bugs** — logic errors, off-by-one, null/undefined handling
- **Security** — injection flaws, hardcoded secrets, improper auth
- **Performance** — unnecessary loops, N+1 queries, excessive allocations
- **Correctness** — wrong types, missing edge cases, incorrect API usage
- **Readability** — confusing naming, overly complex logic
- **Test coverage** — untested branches, missing assertions

Diff lines are annotated as `[oldLine:newLine]`. Use **newLine** as the `line` field. Only comment on lines inside the changed hunks.

Write the review to `~/.ai-review/review-output.json`:

```json
{
  "description": "A concise Markdown summary of the MR: what changed, why, and any significant design decisions or risks observed.",
  "comments": [
    {
      "file": "path/to/file.ts",
      "line": 42,
      "severity": "critical",
      "comment": "Concise, actionable explanation and suggested fix."
    }
  ]
}
```

The `description` field must always be populated. It should be a Markdown-formatted summary covering:
- **What changed** — high-level overview of the modifications and provide sequence diagram if it helps explain complex interactions
- **Why** — inferred intent or purpose of the MR
- **Risks / notable observations** — anything reviewers should pay special attention to

Severity levels:

| Level | When to use |
|-------|-------------|
| `critical` | Security vulnerability, data loss risk, or definite bug |
| `warning` | Performance issue, error handling gap, or bad practice |
| `suggestion` | Readability, minor style, or optional improvement |

If there are no issues, write `{ "comments": [] }` and tell the user the MR looks clean.

### Step 6 — Validate output

```bash
ai-review validate-output ~/.ai-review/review-output.json
```

On failure, inspect the error, fix the JSON, and re-validate before continuing.

### Step 7 — Present summary

Print counts by severity and the top findings (up to 5):

```
Review complete: 2 critical, 3 warning, 4 suggestion

Top findings:
• [critical] src/auth.ts:88 — JWT secret without fallback validation
• [warning]  src/api.ts:102 — Missing error handling on external HTTP call
```

### Step 8 — Ask whether to post

Ask the user which minimum severity to post:
1. `suggestion` — all comments
2. `warning` — warnings and critical only
3. `critical` — critical only
4. No — skip (default)

**If the user provides no input or presses Enter without selecting an option, default to option 4 (skip) and do not post any comments.**

If 1–3:

```bash
ai-review post-comments <MR_URL> --input ~/.ai-review/review-output.json --severity <level>
```

Report how many were posted and how many skipped.

### Step 9 — Ask whether to update MR description

Ask the user:

> The review includes an MR description summary. Do you want to post it as the MR description on GitLab? (y/N)

**Default is No — do not update the description unless the user explicitly answers `y` or `yes`.**

If yes:

```bash
ai-review post-description <MR_URL> --input ~/.ai-review/review-output.json
```

Confirm success or surface any error returned.

## Notes

- All output files live under `~/.ai-review/` and are overwritten on each run.
- Credentials in `~/.ai-review/credentials.json` are keyed by hostname; multiple GitLab instances are supported.