# Multi-stage Dockerfile for Go Fiber Backend on Render
FROM golang:1.24-alpine AS builder

WORKDIR /app

# Install git for module downloads
RUN apk add --no-cache git

# Copy dependency manifests
COPY go.mod go.sum ./
# Ensure compatible Go directive
RUN sed -i 's/go 1.26.0/go 1.22/' go.mod || true
RUN go mod download

# Copy application source
COPY . .

# Build statically compiled binary
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o server main.go

# Minimal production image
FROM alpine:3.20

WORKDIR /app

# Install CA certificates and timezone data
RUN apk add --no-cache ca-certificates tzdata

# Create storage directory for uploaded assets / PDFs
RUN mkdir -p /app/storage

# Copy binary from builder stage
COPY --from=builder /app/server /app/server

EXPOSE 8080

ENV PORT=8080
ENV APP_ENV=production

CMD ["/app/server"]
