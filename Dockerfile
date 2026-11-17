# Production Dockerfile for WorkSphere Job Portal on Render
FROM ruby:3.2-slim

# Install system dependencies & SQLite3
RUN apt-get update -qq && apt-get install -y --no-install-recommends \
    build-essential \
    libsqlite3-dev \
    sqlite3 \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install ruby gems
RUN gem install sqlite3 webrick --no-document

# Copy application files
COPY . /app

# Ensure data directory exists
RUN mkdir -p /app/data

# Environment
ENV RACK_ENV=production
ENV PORT=8080

EXPOSE 8080 10000

# Start production server (Database.init! runs automatically on server start)
CMD ["ruby", "server.rb"]
