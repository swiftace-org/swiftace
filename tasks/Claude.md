# Task Structure Guide

## File Naming

Tasks are saved in the five-digit format: `#####.md` (e.g., `00001.md`, `00042.md`, `12345.md`)

## Front Matter

Each task file must include YAML front matter with the following fields:

```yaml
---
id: 00001
title: Task title goes here
status: TODO
---
```

### Status Values

- `TODO` - Task has not been started
- `DOING` - Task is currently in progress
- `DONE` - Task has been completed

## Description

After the front matter, include a markdown description of the task with any relevant details, requirements, acceptance criteria, or notes.

## Example Task File

```markdown
---
id: 00001
title: Set up project structure
status: DOING
---

Create the initial directory structure for the SwiftAce project including:

- Source code directories
- Configuration files
- Documentation folders

This will serve as the foundation for the project.
```