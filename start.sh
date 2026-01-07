#!/bin/bash

# Start FastAPI backend in background
cd /app/backend
uvicorn app.main:app --host 127.0.0.1 --port 8000 &

# Wait for backend to start
sleep 5

# Start nginx in foreground
nginx -g "daemon off;"
