## [1.0.4](https://gitlab.com/sertiscorp/dev/se-team/ai-review-cli/compare/v1.0.3...v1.0.4) (2026-02-27)

### Bug Fixes

* **release:** ensure tag pipeline is triggered after semantic-release ([7057851](https://gitlab.com/sertiscorp/dev/se-team/ai-review-cli/commit/7057851389a7f3e56d8113412ba0ac77020d81d2))

## [1.0.3](https://gitlab.com/sertiscorp/dev/se-team/ai-review-cli/compare/v1.0.2...v1.0.3) (2026-02-27)

### Bug Fixes

* update CI workflow rules to handle tag pipelines and skip ci messages ([e4f90a7](https://gitlab.com/sertiscorp/dev/se-team/ai-review-cli/commit/e4f90a797941e96beaf9d1049fc88f6b02691989))

## [1.0.2](https://gitlab.com/sertiscorp/dev/se-team/ai-review-cli/compare/v1.0.1...v1.0.2) (2026-02-27)

### Bug Fixes

* create binary ci ([dd6f33e](https://gitlab.com/sertiscorp/dev/se-team/ai-review-cli/commit/dd6f33ef1c813713a1109994948b9002da36b5fd))

## [1.0.1](https://gitlab.com/sertiscorp/dev/se-team/ai-review-cli/compare/v1.0.0...v1.0.1) (2026-02-26)

### Bug Fixes

* add CLI version check command and update versioning in index ([29cec39](https://gitlab.com/sertiscorp/dev/se-team/ai-review-cli/commit/29cec39af6b78f3bfcc1d6aa6131de3eca889243))

## 1.0.0 (2026-02-26)

### Features

* add CI/CD pipeline configuration and update installation instructions in README ([978e510](https://gitlab.com/sertiscorp/dev/se-team/ai-review-cli/commit/978e510c03b32908cb623a67bb99797a0d7e876b))
* add Claude Code custom command for automated MR review workflow ([976c3a2](https://gitlab.com/sertiscorp/dev/se-team/ai-review-cli/commit/976c3a20bd7c7be7faa2f7c74247f0676df07ab0))
* add line number annotation to diffs in GitLabProvider ([a7bf84b](https://gitlab.com/sertiscorp/dev/se-team/ai-review-cli/commit/a7bf84bcbfc01b8fdbad4f4eff6a3620d55ca9dc))
* add MR review skill with detailed workflow and command instructions ([21bde74](https://gitlab.com/sertiscorp/dev/se-team/ai-review-cli/commit/21bde74806730c259d32d6ea862405e3274cdcd6))
* add output destination flags for get-context command in spec.md ([22a6e3f](https://gitlab.com/sertiscorp/dev/se-team/ai-review-cli/commit/22a6e3f94f96296aa5a49211230c0e34851c64f2))
* add output options for get-context command and update README ([2116e71](https://gitlab.com/sertiscorp/dev/se-team/ai-review-cli/commit/2116e71eb8ccb4ab08b7013fde3c3d60fcc733eb))
* add Prettier configuration and format code for consistency ([bbc8692](https://gitlab.com/sertiscorp/dev/se-team/ai-review-cli/commit/bbc8692d026f6305a8da122cde03f8aad3a9bbf7))
* add severity filter option to post-comments command for selective comment posting ([882d866](https://gitlab.com/sertiscorp/dev/se-team/ai-review-cli/commit/882d86608a3f894e3959e3393877a6988bbffa8a))
* add usage section to README with detailed steps for AI agent integration ([037d318](https://gitlab.com/sertiscorp/dev/se-team/ai-review-cli/commit/037d318c5ff5dc50703d97078af88e655bdba5ef))
* add validate-output command and schema validation for review output ([be2439c](https://gitlab.com/sertiscorp/dev/se-team/ai-review-cli/commit/be2439c7c277716e7dfe766cdba5e8762d6de65c))
* added skills ([c5882a4](https://gitlab.com/sertiscorp/dev/se-team/ai-review-cli/commit/c5882a4b893249f5c706f26b5fcb1d2e9f355203))
* enhance GitLab configuration and context fetching with multi-instance support ([657e5dc](https://gitlab.com/sertiscorp/dev/se-team/ai-review-cli/commit/657e5dc379679cbf12cc9debb7991535dab6abf2))
* implement post-comments command to submit AI review comments to GitLab MR ([59eed84](https://gitlab.com/sertiscorp/dev/se-team/ai-review-cli/commit/59eed845a477cbebf7312a80ed95d1cc9ca6d73a))
* prefix AI review comments with "[From AI]" before posting to GitLab MR ([6fd16a9](https://gitlab.com/sertiscorp/dev/se-team/ai-review-cli/commit/6fd16a954f85b70bac612ae04d76643545a2399a))
* update default output file name to context.json in get-context command ([9aad961](https://gitlab.com/sertiscorp/dev/se-team/ai-review-cli/commit/9aad96146ca3f2f7dff6f949b10b8c5dc34ad4e2))
* update default output path for MR context to ~/.ai-review/mr-context.json ([edab36f](https://gitlab.com/sertiscorp/dev/se-team/ai-review-cli/commit/edab36f2880a51940ade5a68b4b26345f00a7db0))
* update project structure and output file naming in spec.md ([63ba0ff](https://gitlab.com/sertiscorp/dev/se-team/ai-review-cli/commit/63ba0ff4d73ba23b0d50beb91a3d2d185e81c584))

### Bug Fixes

* revert build script to use tsc instead of npx ([1787136](https://gitlab.com/sertiscorp/dev/se-team/ai-review-cli/commit/17871365730347219a486cc50e7f781c99600cc7))
* update build script to use npx for TypeScript compilation ([aab3b04](https://gitlab.com/sertiscorp/dev/se-team/ai-review-cli/commit/aab3b0415bee1ed2df8ebdb77a24a72605e8f0ce))
