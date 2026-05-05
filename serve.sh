#!/bin/bash
# Kill anything on port 8080 and start http-server fresh

PORT=8080

PIDS=$(lsof -ti:$PORT 2>/dev/null)
if [ -n "$PIDS" ]; then
  echo "Killing process(es) on port $PORT: $PIDS"
  kill -9 $PIDS
fi

echo "Starting http-server on port $PORT..."
npx http-server -p $PORT -c-1
