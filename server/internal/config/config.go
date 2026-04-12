package config

import (
	"fmt"
	"os"
	"strconv"
)

// Config holds all application configuration.
type Config struct {
	App      AppConfig
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
	URL        string
	Name       string
	Collection string
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
			URL:        getFirstEnv([]string{"DATABASE_URL", "MONGO_URI"}, ""),
			Name:       getFirstEnv([]string{"DATABASE_NAME", "MONGO_DB_NAME"}, "ssi"),
			Collection: getFirstEnv([]string{"DATABASE_COLLECTION", "MONGO_COLLECTION"}, "vault_keys"),
		},
	}

	if err := cfg.validate(); err != nil {
		return nil, err
	}

	return cfg, nil
}

func getFirstEnv(keys []string, defaultVal string) string {
	for _, key := range keys {
		if v := os.Getenv(key); v != "" {
			return v
		}
	}
	return defaultVal
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
	if c.Database.URL == "" {
		return fmt.Errorf("missing database URL: set DATABASE_URL or MONGO_URI")
	}
	if c.Database.Name == "" {
		return fmt.Errorf("missing database name: set DATABASE_NAME or MONGO_DB_NAME")
	}
	if c.Database.Collection == "" {
		return fmt.Errorf("missing database collection: set DATABASE_COLLECTION or MONGO_COLLECTION")
	}
	return nil
}
