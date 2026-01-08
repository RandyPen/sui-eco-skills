# Claude Code Skill Specification

This document provides a concise guide to creating effective Claude Code Skills based on official Anthropic documentation. Skills are markdown files that teach Claude how to perform specific tasks, automatically triggered when user requests match the Skill's description.

## Core Principles

### Concise is Key
- Skills share the context window with system prompts, conversation history, and other Skills
- Only add context Claude doesn't already have
- Challenge each piece of information: "Does Claude really need this explanation?"
- Keep SKILL.md under 500 lines for optimal performance

### Set Appropriate Degrees of Freedom
- **High freedom**: Text-based instructions for multiple valid approaches
- **Medium freedom**: Pseudocode or scripts with parameters for preferred patterns
- **Low freedom**: Specific scripts with few/no parameters for fragile, error-prone operations

### Test with All Models
- Test Skills with Haiku, Sonnet, and Opus models
- What works for Opus might need more detail for Haiku
- Aim for instructions that work well across all models you plan to use

## Skill Structure

### YAML Frontmatter (Required)
```yaml
---
name: skill-name              # lowercase letters, numbers, hyphens only (max 64 chars)
description: What this Skill does and when to use it. # Max 1024 chars, no XML tags
---
```

**Important**: The description is critical for Skill selection. Include both what the Skill does and specific triggers/contexts for when to use it.

### Naming Conventions
- Use **gerund form** (verb + -ing): `processing-pdfs`, `analyzing-spreadsheets`
- Alternative: noun phrases: `pdf-processing`, `spreadsheet-analysis`
- Avoid vague names: `helper`, `utils`, `tools`
- Cannot contain: XML tags, reserved words ("anthropic", "claude")

### Writing Effective Descriptions
- **Always write in third person**: "Processes Excel files and generates reports"
- **Be specific**: Include both what the Skill does and when to use it
- **Include key terms**: Mention file types, formats, or specific contexts

**Good examples**:
```yaml
description: Extract text and tables from PDF files, fill forms, merge documents. Use when working with PDF files or when the user mentions PDFs, forms, or document extraction.
```

```yaml
description: Analyze Excel spreadsheets, create pivot tables, generate charts. Use when analyzing Excel files, spreadsheets, tabular data, or .xlsx files.
```

### Progressive Disclosure Patterns
Keep SKILL.md as an overview pointing to detailed materials as needed:

**Pattern 1: High-level guide with references**
````markdown
## Advanced features

**Form filling**: See [FORMS.md](FORMS.md) for complete guide
**API reference**: See [REFERENCE.md](REFERENCE.md) for all methods
**Examples**: See [EXAMPLES.md](EXAMPLES.md) for common patterns
````

**Pattern 2: Domain-specific organization**
```
bigquery-skill/
├── SKILL.md (overview and navigation)
└── reference/
    ├── finance.md (revenue, billing metrics)
    ├── sales.md (opportunities, pipeline)
    └── product.md (API usage, features)
```

**Key rules**:
- Keep references one level deep from SKILL.md
- For reference files longer than 100 lines, include a table of contents
- Bundle comprehensive resources without context penalty until accessed

### Optional Frontmatter Fields
```yaml
allowed-tools: Read, Grep, Glob            # Tools Claude can use without asking permission
model: claude-sonnet-4-20250514            # Model to use when Skill is active
context: fork                              # Run Skill in a forked sub-agent context
agent: Explore                             # Agent type to use when context: fork
hooks:                                     # Define hooks scoped to Skill lifecycle
  PreToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: "./scripts/security-check.sh $TOOL_INPUT"
user-invocable: false                      # Hide Skill from slash command menu
```

## Workflows and Feedback Loops

### Use Workflows for Complex Tasks
Break complex operations into clear, sequential steps. Provide checklists that Claude can copy and check off:

````markdown
## Research synthesis workflow

Copy this checklist and track your progress:

```
Research Progress:
- [ ] Step 1: Read all source documents
- [ ] Step 2: Identify key themes
- [ ] Step 3: Cross-reference claims
- [ ] Step 4: Create structured summary
- [ ] Step 5: Verify citations
```
````

### Implement Feedback Loops
**Common pattern**: Run validator → fix errors → repeat

```markdown
## Document editing process

1. Make your edits to `word/document.xml`
2. **Validate immediately**: `python ooxml/scripts/validate.py unpacked_dir/`
3. If validation fails:
   - Review the error message carefully
   - Fix the issues in the XML
   - Run validation again
4. **Only proceed when validation passes**
```

## Content Guidelines

### Avoid Time-Sensitive Information
Don't include information that will become outdated. Instead, use "old patterns" sections:

```markdown
## Current method
Use the v2 API endpoint: `api.example.com/v2/messages`

## Old patterns
<details>
<summary>Legacy v1 API (deprecated 2025-08)</summary>
The v1 API used: `api.example.com/v1/messages`
This endpoint is no longer supported.
</details>
```

### Use Consistent Terminology
Choose one term and use it throughout the Skill:
- ✓ **Good**: Always "API endpoint", "field", "extract"
- ✗ **Bad**: Mix "API endpoint", "URL", "API route", "path"

## Common Patterns

### Template Pattern
Provide templates for output format. Match strictness to needs:

**For strict requirements**:
````markdown
## Report structure

ALWAYS use this exact template structure:

```markdown
# [Analysis Title]

## Executive summary
[One-paragraph overview of key findings]

## Key findings
- Finding 1 with supporting data
- Finding 2 with supporting data
- Finding 3 with supporting data

## Recommendations
1. Specific actionable recommendation
2. Specific actionable recommendation
```
````

### Examples Pattern
Provide input/output pairs for Skills where output quality depends on examples:

````markdown
## Commit message format

Generate commit messages following these examples:

**Example 1:**
Input: Added user authentication with JWT tokens
Output:
```
feat(auth): implement JWT-based authentication

Add login endpoint and token validation middleware
```

**Example 2:**
Input: Fixed bug where dates displayed incorrectly in reports
Output:
```
fix(reports): correct date formatting in timezone conversion

Use UTC timestamps consistently across report generation
```
````

### Conditional Workflow Pattern
Guide Claude through decision points:

```markdown
## Document modification workflow

1. Determine the modification type:

   **Creating new content?** → Follow "Creation workflow" below
   **Editing existing content?** → Follow "Editing workflow" below

2. Creation workflow:
   - Use docx-js library
   - Build document from scratch
   - Export to .docx format

3. Editing workflow:
   - Unpack existing document
   - Modify XML directly
   - Validate after each change
   - Repack when complete
```

## Evaluation and Iteration

### Build Evaluations First
Create evaluations BEFORE writing extensive documentation:

1. **Identify gaps**: Run Claude on representative tasks without a Skill
2. **Create evaluations**: Build three scenarios that test these gaps
3. **Establish baseline**: Measure Claude's performance without the Skill
4. **Write minimal instructions**: Create just enough content to address gaps
5. **Iterate**: Execute evaluations, compare against baseline, and refine

### Develop Skills Iteratively with Claude
Work with one instance of Claude ("Claude A") to create a Skill that will be used by other instances ("Claude B"):

1. **Complete a task without a Skill**: Work through a problem with Claude A
2. **Identify the reusable pattern**: Note what context you repeatedly provided
3. **Ask Claude A to create a Skill**: "Create a Skill that captures this pattern we just used"
4. **Review for conciseness**: Remove unnecessary explanations
5. **Improve information architecture**: Organize content effectively
6. **Test on similar tasks**: Use the Skill with Claude B on related use cases
7. **Iterate based on observation**: Refine based on Claude B's behavior

## Technical Notes

### YAML Frontmatter Requirements
- `name`: Maximum 64 characters, lowercase letters/numbers/hyphens only, no XML tags, no reserved words
- `description`: Maximum 1024 characters, non-empty, no XML tags
- Frontmatter must start with `---` on line 1 (no blank lines before)
- End with `---` before Markdown content
- Use spaces for indentation (not tabs)

### Token Budgets
- Keep SKILL.md body under 500 lines for optimal performance
- Split content into separate files when approaching this limit
- Additional files don't consume context tokens until accessed

### Package Dependencies
- Skills run in the code execution environment with platform-specific limitations
- List required packages in SKILL.md
- Verify packages are available in the target environment
- **claude.ai**: Can install packages from npm and PyPI
- **Anthropic API**: No network access, no runtime package installation

### MCP Tool References
Always use fully qualified tool names to avoid "tool not found" errors:
- **Format**: `ServerName:tool_name`
- **Example**: `BigQuery:bigquery_schema`, `GitHub:create_issue`

## Checklist for Effective Skills

### Core Quality
- [ ] Description is specific and includes key terms
- [ ] Description includes both what the Skill does and when to use it
- [ ] SKILL.md body is under 500 lines
- [ ] Additional details are in separate files (if needed)
- [ ] No time-sensitive information (or in "old patterns" section)
- [ ] Consistent terminology throughout
- [ ] Examples are concrete, not abstract
- [ ] File references are one level deep
- [ ] Progressive disclosure used appropriately
- [ ] Workflows have clear steps

### Code and Scripts
- [ ] Scripts solve problems rather than punt to Claude
- [ ] Error handling is explicit and helpful
- [ ] No "voodoo constants" (all values justified)
- [ ] Required packages listed in instructions and verified as available
- [ ] Scripts have clear documentation
- [ ] No Windows-style paths (all forward slashes)
- [ ] Validation/verification steps for critical operations
- [ ] Feedback loops included for quality-critical tasks

### Testing
- [ ] At least three evaluations created
- [ ] Tested with Haiku, Sonnet, and Opus
- [ ] Tested with real usage scenarios
- [ ] Team feedback incorporated (if applicable)

## Where Skills Live

| Location   | Path                                             | Applies to                        |
| :--------- | :----------------------------------------------- | :-------------------------------- |
| Enterprise | See managed settings                             | All users in your organization    |
| Personal   | `~/.claude/skills/`                              | You, across all projects          |
| Project    | `.claude/skills/`                                | Anyone working in this repository |
| Plugin     | Bundled with plugins                             | Anyone with the plugin installed  |

If two Skills have the same name, the higher row wins: managed overrides personal, personal overrides project, and project overrides plugin.

## Anti-Patterns to Avoid

### Avoid Windows-Style Paths
- ✓ **Good**: `scripts/helper.py`, `reference/guide.md`
- ✗ **Avoid**: `scripts\helper.py`, `reference\guide.md`

### Avoid Offering Too Many Options
Don't present multiple approaches unless necessary:

````markdown
**Bad example: Too many choices** (confusing):
"You can use pypdf, or pdfplumber, or PyMuPDF, or pdf2image, or..."

**Good example: Provide a default** (with escape hatch):
"Use pdfplumber for text extraction:
```python
import pdfplumber
```

For scanned PDFs requiring OCR, use pdf2image with pytesseract instead."
````

## References

- [Agent Skills overview](https://docs.claude.com/en/docs/agents-and-tools/agent-skills/overview)
- [Skill authoring best practices](https://docs.claude.com/en/docs/agents-and-tools/agent-skills/best-practices)
- [Claude Code Skills documentation](https://code.claude.com/docs/en/skills)

---

*This specification is based on official Anthropic documentation as of 2026-01-08.*