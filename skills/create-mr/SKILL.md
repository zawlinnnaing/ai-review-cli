---
name: create-mr
description: Create a GitLab Merge Request interactively using the ai-review CLI. Checks CLI installation and credentials, collects repo URL, source branch, and target branch from the user, creates the MR, and optionally generates and posts a description summarising the changes. Use this skill whenever the user wants to create a new merge request, open an MR, raise a PR on GitLab, or submit changes for review — even if they just say "create an MR", "open a merge request", or "push my branch for review".
compatibility: Designed for Claude Code. Requires the ai-review CLI and a GitLab Personal Access Token with api and read_repository scopes.
allowed-tools: Bash Read Write
---

# Create MR Skill

Create a GitLab Merge Request, guided step-by-step.

## Workflow

### Step 1 — Verify CLI

```bash
ai-review --version
```

If the command is not found, tell the user the CLI is not installed and point them to the repo for instructions:

> The `ai-review` CLI is not installed.
> Install it with:
> ```
> npm install -g @zawlinnnaing/ai-review-cli
> ```
> Or clone the repo and run `npm install -g .` from inside it.
> See the README for full installation instructions.

Then stop — do not continue until the user confirms the CLI is installed.

### Step 2 — Check credentials

```bash
cat ~/.ai-review/credentials.json
```

If the file is missing or has no `gitlab` key, tell the user:

> GitLab credentials are not configured.
> Run `ai-review configure gitlab` to set up your Personal Access Token, then come back.

Then stop — do not continue until the user confirms credentials are configured.

### Step 3 — Collect inputs

Ask the user for each of the following if not already provided:

1. **Repository URL** — the GitLab project URL (e.g. `https://gitlab.com/group/repo`)
2. **Source branch** — the branch with your changes (e.g. `feature/my-feature`)
3. **Target branch** — the branch to merge into (e.g. `main`)

You can ask all three at once if none are known. Accept them from `$ARGUMENTS` if provided in order: `<repoUrl> <sourceBranch> <targetBranch>`.

### Step 4 — Create the MR

```bash
ai-review create-mr <repoUrl> <sourceBranch> <targetBranch>
```

On success, the CLI prints the MR URL — show it to the user clearly.

On failure, surface the error message and stop:
- `CREDENTIALS_NOT_FOUND` → run `ai-review configure gitlab`
- `CREATE_MR_FAILED` → show the message and ask the user to check their inputs

### Step 5 — Optionally update description

Ask the user:
> Would you like me to generate a summary of the changes and update the MR description? (default: **no**)

**Default is no.** Only proceed if the user explicitly says yes.

If yes:

1. Fetch the MR diff using the MR URL from Step 4:
   ```bash
   ai-review get-context <MR_URL>
   ```
   This writes context to `~/.ai-review/mr-context.json`.

2. Read `~/.ai-review/mr-context.json` and write a concise Markdown description covering:
   - **What changed** — a high-level summary of the modifications
   - **Why** — inferred intent or purpose of the changes
   - **Notable details** — any significant design decisions, potential risks, or things reviewers should know

   Keep it helpful but brief — this is a description, not a full review.

3. Post the description:
   ```bash
   ai-review post-description <MR_URL> --text "<generated description>"
   ```

   On success, confirm to the user that the description has been updated.
   On failure, show the error and offer to paste the description as text so they can copy it manually.
