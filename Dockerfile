# Production Dockerfile for WorkSphere Job Portal
FROM ruby:3.2-alpine

# Install build dependencies & SQLite
RUN apk add --no-cache build-base sqlite sqlite-dev sqlite-libs

WORKDIR /app

# Copy application files
COPY . /app

# Install ruby sqlite3 gem
RUN gem install sqlite3 webrick

# Initialize database
RUN ruby db.rb

# Expose port
EXPOSE 8080

# Environment
ENV PORT=8080
ENV RACK_ENV=production

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD nc -z localhost 8080 || exit 1

# Start production server
CMD ["ruby", "server.rb"]
