// @title           server API
// @version         1.0.0
// @description     API documentation for server
// @host            localhost:8080
// @BasePath        /api/v1
package main

import (
	"context"
	"log/slog"
	"os"
	"os/signal"
	"syscall"

	"ssi_api/internal/config"
	"ssi_api/internal/server"
)

func main() {
	// Set up structured JSON logger as default
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	}))
	slog.SetDefault(logger)

	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		slog.Error("failed to load config", "error", err)
		os.Exit(1)
	}

	// Graceful shutdown context
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	// Create and start server
	srv := server.New(cfg, logger)
	if err := srv.Start(ctx); err != nil {
		slog.Error("server error", "error", err)
		os.Exit(1)
	}

	slog.Info("server stopped gracefully")
}
