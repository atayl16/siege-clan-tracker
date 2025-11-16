#!/bin/bash
# Skill Activation Hook for User Prompt Submit
# Checks if editing React/JS files and prepares skill context

# Read stdin
INPUT=$(cat)

# Extract file paths from the input (look for common patterns)
# This is a simple implementation - can be enhanced
FILES=$(echo "$INPUT" | grep -o 'src/[^[:space:]]*\.\(jsx\|js\)' || true)

if [ -z "$FILES" ]; then
  # No React files mentioned, pass through unchanged
  echo "$INPUT"
  exit 0
fi

# Check if any files match our skill patterns
SKILL_FILES=$(echo "$FILES" | grep -E '(components|pages|hooks|context|services|utils|test|spec)' || true)

if [ -n "$SKILL_FILES" ]; then
  # React files detected - skill will be activated by skill-rules.json
  # Add a helpful note to the user's prompt
  echo "$INPUT"
  echo ""
  echo "[Note: React Guidelines skill is active for this session]"
else
  # No skill files, pass through
  echo "$INPUT"
fi

exit 0
