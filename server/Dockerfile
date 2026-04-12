# ── Build Stage ──────────────────────────────────────────────
FROM golang:1.25.0-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux go build \
    -ldflags="-w -s" \
    -o /app/bin/server \
    ./cmd/main.go

# ── Runtime Stage ─────────────────────────────────────────────
FROM gcr.io/distroless/static-debian12

WORKDIR /app

COPY --from=builder /app/bin/server /app/server

EXPOSE 8080

ENTRYPOINT ["/app/server"]
