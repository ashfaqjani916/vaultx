package config

import (
	"fmt"
	"os"
	"strconv"
)

// Config holds all application configuration.
type Config struct {
	App   AppConfig
	Database DatabaseConfig
}

// AppConfig holds app-level configuration.
type AppConfig struct {
	Name string
	Env  string
	Port int
}

// DatabaseConfig holds database connection configuration.
type DatabaseConfig struct {
	URL string
}

// Load reads configuration from environment variables.
func Load() (*Config, error) {
	port := 8080
	if p := os.Getenv("APP_PORT"); p != "" {
		var err error
		port, err = strconv.Atoi(p)
		if err != nil {
			return nil, fmt.Errorf("invalid APP_PORT: %w", err)
		}
	}

	cfg := &Config{
		App: AppConfig{
			Name: getEnv("APP_NAME", "server"),
			Env:  getEnv("APP_ENV", "development"),
			Port: port,
		},

		Database: DatabaseConfig{
			URL: getEnv("DATABASE_URL", ""),
		},

	}

	if err := cfg.validate(); err != nil {
		return nil, err
	}

	return cfg, nil
}

func getEnv(key, defaultVal string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return defaultVal
}

func (c *Config) validate() error {
	if c.App.Port < 1 || c.App.Port > 65535 {
		return fmt.Errorf("invalid port: %d (must be 1-65535)", c.App.Port)
	}
	return nil
}
