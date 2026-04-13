package server

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"

	"ssi_api/internal/config"
	"ssi_api/internal/handler"
	"ssi_api/pkg/db"
)

// Server holds the HTTP server and dependencies.
type Server struct {
	cfg      *config.Config
	logger   *slog.Logger
	router   *gin.Engine
	database *db.DB
}

// New creates a new Server.
func New(cfg *config.Config, logger *slog.Logger, database *db.DB) *Server {
	gin.SetMode(gin.ReleaseMode)
	router := gin.New()
	router.Use(gin.Recovery())
	router.Use(cors.New(cors.Config{
		AllowAllOrigins:  true,
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept"},
		AllowCredentials: false,
	}))
	router.Use(slogMiddleware(logger))

	s := &Server{cfg: cfg, logger: logger, router: router, database: database}
	s.registerRoutes()
	return s
}

func (s *Server) registerRoutes() {
	vaultCollection := s.database.Collection(s.cfg.Database.Name, s.cfg.Database.Collection)
	h := handler.New(s.cfg, vaultCollection)

	s.router.GET("/health", h.Health)

	v1 := s.router.Group("/api/v1")
	v1.POST("/keys", h.StoreKey)
	v1.GET("/keys", h.GetPrivateKey)
}

// Start starts the HTTP server and blocks until ctx is cancelled.
func (s *Server) Start(ctx context.Context) error {
	httpSrv := &http.Server{
		Addr:         fmt.Sprintf(":%d", s.cfg.App.Port),
		Handler:      s.router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	errCh := make(chan error, 1)
	go func() {
		s.logger.Info("server listening", "port", s.cfg.App.Port)
		if err := httpSrv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			errCh <- err
		}
		close(errCh)
	}()

	select {
	case <-ctx.Done():
		s.logger.Info("shutting down server...")
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		return httpSrv.Shutdown(shutdownCtx)
	case err := <-errCh:
		return err
	}
}

func slogMiddleware(logger *slog.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		c.Next()
		logger.Info("request",
			"method", c.Request.Method,
			"path", c.Request.URL.Path,
			"status", c.Writer.Status(),
			"latency", time.Since(start).String(),
			"ip", c.ClientIP(),
		)
	}
}
