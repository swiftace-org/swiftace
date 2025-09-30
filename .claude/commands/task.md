---
description: Create a new task in the tasks folder
---

Create a new task file in the tasks folder with the following details:

**Title**: $1

**Description**:
$REMAINING_ARGUMENTS

Use the task structure from tasks/Claude.md:
1. Find the highest numbered task file in the tasks/ directory
2. Create a new task file with the next sequential number (e.g., if highest is 00001.md, create 00002.md)
3. Use five-digit format with leading zeros: #####.md
4. Include YAML front matter with:
   - id: (same as filename without .md)
   - title: (from $1)
   - status: TODO
   - created: (today's date in YYYY-MM-DD format)
5. Add the description after the front matter

After creating the task, confirm the task number and title.