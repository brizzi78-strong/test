# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Current state

This repository is currently empty. As of the latest commit it contains only a `.gitkeep`
placeholder and this file — there is no source code, build system, test suite, dependency
manifest, or README yet.

Because of that, there are no build/lint/test commands or architecture to document at this time.
**When real code is added, update this file** with:

- The commands to build, lint, run, and test the project (including how to run a single test).
- The high-level architecture and how the major pieces fit together — the "big picture" that
  requires reading multiple files to understand.

## Conventions

- Development happens on feature branches, not directly on `main` (e.g. the current working
  branch `claude/claude-md-docs-1eu1lj`). Create the branch locally if it does not exist, commit
  with clear messages, and push to the designated feature branch — never push to `main` without
  explicit permission.
