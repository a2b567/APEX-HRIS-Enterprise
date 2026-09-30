# Root-level Dockerfile for Render Go Backend deployment
FROM golang:1.24-alpine AS builder

WORKDIR /app

RUN apk add --no-cache git

COPY GroceryBackend-main/go.mod GroceryBackend-main/go.sum ./
RUN sed -i 's/go 1.26.0/go 1.22/' go.mod || true
RUN go mod download

COPY GroceryBackend-main/ ./

RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o server main.go

FROM alpine:3.20

WORKDIR /app
RUN apk add --no-cache ca-certificates tzdata
RUN mkdir -p /app/storage

COPY --from=builder /app/server /app/server

EXPOSE 8080

ENV PORT=8080
ENV APP_ENV=production

CMD ["/app/server"]
