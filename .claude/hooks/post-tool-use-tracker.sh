#!/bin/bash
# Post Tool Use Hook - Track edits and suggest relevant commands
# Simplified version for Siege Clan Tracker project

# Read tool use data from stdin
TOOL_DATA=$(cat)

# Extract tool name and file path
TOOL_NAME=$(echo "$TOOL_DATA" | jq -r '.tool // empty' 2>/dev/null || echo "")
FILE_PATH=$(echo "$TOOL_DATA" | jq -r '.parameters.file_path // empty' 2>/dev/null || echo "")

# Skip if not an edit/write operation
if [[ "$TOOL_NAME" != "Edit" ]] && [[ "$TOOL_NAME" != "Write" ]] && [[ "$TOOL_NAME" != "MultiEdit" ]]; then
  exit 0
fi

# Skip if no file path
if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# Create log directory if it doesn't exist
LOG_DIR="$CLAUDE_PROJECT_DIR/.claude/logs"
mkdir -p "$LOG_DIR"

# Log the edit
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
echo "[$TIMESTAMP] $TOOL_NAME: $FILE_PATH" >> "$LOG_DIR/edits.log"

# Determine what commands to suggest based on file type
SUGGESTIONS=""

# Check if it's a JavaScript/JSX file in src
if [[ "$FILE_PATH" =~ src/.*\.(jsx?|js) ]]; then
  SUGGESTIONS="$SUGGESTIONS
• Test your changes: npm start
• Run tests: npm test"
fi

# Check if it's a test file
if [[ "$FILE_PATH" =~ \.test\.(jsx?|js) ]]; then
  SUGGESTIONS="$SUGGESTIONS
• Run this test: npm test -- $(basename "$FILE_PATH")"
fi

# Check if it's package.json
if [[ "$FILE_PATH" =~ package\.json$ ]]; then
  SUGGESTIONS="$SUGGESTIONS
• Install dependencies: npm install"
fi

# Check if it's a component
if [[ "$FILE_PATH" =~ src/components/.*\.(jsx|js) ]]; then
  SUGGESTIONS="$SUGGESTIONS
• Consider adding/updating tests in src/__tests__/"
fi

# Output suggestions if any
if [ -n "$SUGGESTIONS" ]; then
  echo ""
  echo "📝 Suggested next steps:$SUGGESTIONS"
fi

exit 0
