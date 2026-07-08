# Documentation Standards

This guide defines how documentation should be written for Visual Authenticity
Workbench. It keeps the project readable for interviewers, reviewers, and future
contributors.

## Goals

- Help a reader understand the project in three minutes.
- Separate product scope, engineering decisions, runbooks, and reference facts.
- Record why important work was done, not only what changed.
- Keep AI-detection claims careful and evidence-based.

## Sources

This project uses a lightweight version of these public documentation practices:

- Diataxis: organize docs by user need: tutorial, how-to, reference, and
  explanation. <https://diataxis.fr/>
- Google developer documentation style guide: use active voice, clear headings,
  descriptive links, code formatting, and accessible writing.
  <https://developers.google.com/style/highlights>
- Microsoft Writing Style Guide: make every word matter; prefer a clear,
  straightforward technical voice.
  <https://learn.microsoft.com/en-us/style-guide/welcome/>

## Document Types

Use one primary purpose per document.

| Type | Purpose | Examples in this repo |
| --- | --- | --- |
| Overview | Explain the project and its value quickly. | `README.md`, `docs/README.md` |
| How-to | Help a competent user complete a task. | `docs/local-development.md`, `docs/smoke-test-workflow.md` |
| Reference | Describe facts, APIs, configuration, or contracts. | `docs/model-integration-framework.md`, `docs/async-detection-jobs.md` |
| Explanation | Explain why a design exists and what trade-offs were made. | `docs/project-improvement-roadmap.md`, `docs/project-worklog.md` |
| Plan | Guide implementation work step by step. | `docs/superpowers/plans/*.md` |
| Spec | Define product and architecture requirements. | `docs/superpowers/specs/*.md` |

Do not mix a tutorial, API reference, and design essay in the same document.
If a document starts doing two jobs, split it or link to another page.

## File Naming

- Use lowercase kebab-case: `project-worklog.md`.
- Use dates for implementation plans and specs:
  `YYYY-MM-DD-short-topic.md`.
- Keep durable docs directly under `docs/`.
- Keep agent execution plans under `docs/superpowers/plans/`.
- Keep product or architecture specs under `docs/superpowers/specs/`.

## Standard Structure

Use this shape for durable docs:

```markdown
# Title

One short paragraph explaining what this document is for.

## Audience

Who should read this.

## Current Status

What is true now.

## Details

The main content.

## Verification

Commands, test evidence, or acceptance criteria.

## Related Docs

- `docs/example.md`
```

Skip sections that do not add value. Do not add placeholder sections.

## Writing Rules

- Prefer English for stable technical docs, because the repository and tooling
  already use English. Chinese planning notes are allowed when they help local
  collaboration.
- Use short paragraphs. Aim for one idea per paragraph.
- Use active voice: "The backend stores reports", not "Reports are stored".
- Use exact names for files, APIs, commands, branches, and environment
  variables.
- Use `inline code` for paths, commands, identifiers, environment variables,
  table names, and API paths.
- Use fenced code blocks with a language tag:

```powershell
npm run build
```

- Use numbered lists only for ordered procedures.
- Use bullets for unordered facts.
- Use tables only when comparison is easier than prose.
- Prefer links with descriptive text. Avoid "click here".

## AI Detection Wording

The project must not overstate detection capability.

Use:

- "auxiliary signal"
- "model confidence"
- "likely synthetic"
- "likely authentic"
- "requires human review"
- "not legal-grade forensic evidence"

Avoid:

- "proves the image is fake"
- "detects all AI-generated images"
- "legal-grade verification"
- "truth engine"
- "guaranteed accuracy"

Every report-facing document must include this idea:

> Detection results are auxiliary signals. They should not be used as the sole
> basis for high-stakes decisions.

## Worklog Rules

When a meaningful branch is completed, record it in `docs/project-worklog.md`.
Each entry should include:

- Date.
- Branch and commit.
- What changed.
- Why it changed.
- How it was verified.
- What remains deferred.

## Evidence Rules

Do not claim that work is complete without evidence.

Good:

```text
Verified with `npm run build`, `npm run lint`, and `mvn test`.
```

Bad:

```text
Should work now.
```

For documentation-only branches, `git diff --check` is the minimum verification.
For code branches, run the relevant test or build command.

## Update Checklist

Before committing documentation changes:

- [ ] The document has one clear purpose.
- [ ] The first paragraph explains why the page exists.
- [ ] Commands are copyable.
- [ ] Claims are backed by links, code references, or verification commands.
- [ ] Deferred work is explicit.
- [ ] No model weights, uploads, generated reports, or local database files are
      referenced as committed artifacts.
- [ ] `git diff --check` passes.
