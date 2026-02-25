# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository. Always update `docs/spec.md` to the latest code behaviour.

## Commands

```bash
npm run build      # compile TypeScript → dist/
npm run dev        # run CLI directly via tsx (no build step required)
npm run lint       # type-check without emitting (tsc --noEmit)
npm run format     # format with Prettier

# Run the CLI during development (no build required)
npx tsx src/cli/index.ts get-context <MR_URL>
npx tsx src/cli/index.ts configure gitlab

# After npm link or npm install -g .
ai-review get-context <MR_URL>
ai-review configure gitlab
```

There is no test suite yet.

## Architecture

The CLI is built with **commander** and structured around a provider abstraction. The key insight is that the `GitProvider` interface in `src/providers/base.ts` is the only contract between the CLI and any Git platform. Adding GitHub support means creating `src/providers/github/` — no CLI changes needed.

### Data flow for `get-context`

1. `get-context.ts` parses the GitLab MR URL to extract `domain`, `projectPath`, and `mrIid`.
2. Credentials are looked up by domain from `~/.ai-review/credentials.json`.
3. `GitLabProvider` is constructed and passed to `MRContextBuilder`.
4. `MRContextBuilder.build()` calls `getMergeRequest` and `getMergeRequestChanges` in parallel.
5. `getMergeRequestChanges` uses the paginated `/diffs` endpoint. When GitLab sets `too_large: true` on a file, it fetches raw content from both branches via `/repository/files/:path/raw` and regenerates the diff client-side with the `diff` library.
6. Each `FileDiff` is filtered (binary, >200 KB, lock files), language-detected, and then annotated with `[oldLine:newLine]` markers via `annotateDiffWithLineNumbers`.
7. The final `MRContext` JSON is written to a file or stdout.

### Error output convention

All errors are printed as structured JSON to stderr:

```json
{ "error": "ERROR_CODE", "message": "human-readable detail" }
```

### Credentials file

`~/.ai-review/credentials.json` is keyed by hostname, supporting multiple GitLab instances simultaneously:

```json
{
  "gitlab": {
    "gitlab.com": { "token": "...", "baseUrl": "https://gitlab.com" },
    "gitlab.mycompany.com": {
      "token": "...",
      "baseUrl": "https://gitlab.mycompany.com"
    }
  }
}
```

### Phase gates

`src/schema/review-output.schema.ts` and `src/cli/commands/validate-output.ts` / `post-comments.ts` do not exist yet — they are Phase 2 and Phase 3 work. `docs/spec.md` is the authoritative reference for planned behaviour.
