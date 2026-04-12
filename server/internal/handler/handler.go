package handler

import (
	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/mongo"

	"ssi_api/internal/config"
)

// Handler holds application dependencies.
type Handler struct {
	cfg             *config.Config
	vaultCollection *mongo.Collection
}

// New creates a new Handler.
func New(cfg *config.Config, vaultCollection *mongo.Collection) *Handler {
	return &Handler{
		cfg:             cfg,
		vaultCollection: vaultCollection,
	}
}

// healthResponse is the health check response body.
type healthResponse struct {
	Status string `json:"status"`
	App    string `json:"app"`
	Env    string `json:"env"`
}

// Health godoc
// @Summary     Health check
// @Description Returns service health status
// @Tags        health
// @Produce     json
// @Success     200  {object}  healthResponse
// @Router      /health [get]
func (h *Handler) Health(c *gin.Context) {
	c.JSON(200, healthResponse{
		Status: "ok",
		App:    h.cfg.App.Name,
		Env:    h.cfg.App.Env,
	})
}
