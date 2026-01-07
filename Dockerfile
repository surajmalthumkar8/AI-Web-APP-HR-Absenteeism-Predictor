# Hugging Face Spaces Dockerfile
# Runs both FastAPI backend and serves React frontend

FROM python:3.11-slim

# Install Node.js for building frontend
RUN apt-get update && apt-get install -y \
    curl \
    nginx \
    && curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy backend and install dependencies
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy backend code
COPY backend/ ./backend/

# Train the model
WORKDIR /app/backend
RUN python -m app.ml.train

# Build frontend
WORKDIR /app
COPY frontend/package*.json ./frontend/
WORKDIR /app/frontend
RUN npm install

COPY frontend/ ./
RUN npm run build

# Setup nginx to serve frontend and proxy API
WORKDIR /app
COPY nginx.hf.conf /etc/nginx/nginx.conf

# Copy startup script
COPY start.sh ./
RUN chmod +x start.sh

EXPOSE 7860

CMD ["./start.sh"]
