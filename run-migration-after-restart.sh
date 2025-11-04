#!/bin/bash
echo "Waiting 3 seconds for connections to close..."
sleep 3

echo "Running migration..."
node migrate-session-id.js

if [ $? -eq 0 ]; then
  echo "✅ Migration completed successfully!"
else
  echo "❌ Migration failed"
  exit 1
fi
