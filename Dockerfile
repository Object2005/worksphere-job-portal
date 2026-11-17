# Production Dockerfile for WorkSphere Job Portal on Render
FROM ruby:3.2-alpine

# Install build dependencies, sqlite3, and certificates
RUN apk add --no-cache build-base sqlite sqlite-dev sqlite-libs ca-certificates

WORKDIR /app

# Pre-install gems with no documentation
RUN gem install sqlite3 webrick --no-document

# Copy application files
COPY . /app

# Ensure data directory exists
RUN mkdir -p /app/data

# Initialize and seed database
RUN ruby db.rb

# Environment
ENV RACK_ENV=production

# Render automatically binds to PORT
EXPOSE 8080 10000

# Start production server
CMD ["ruby", "server.rb"]
