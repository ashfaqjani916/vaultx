package config

import (
	"bufio"
	"errors"
	"fmt"
	"os"
	"strconv"
	"strings"
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
	if err := loadDotEnv(); err != nil {
		return nil, err
	}

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

func loadDotEnv() error {
	if envFile := strings.TrimSpace(os.Getenv("ENV_FILE")); envFile != "" {
		if err := loadDotEnvFile(envFile); err != nil {
			return fmt.Errorf("failed to load ENV_FILE %q: %w", envFile, err)
		}
		return nil
	}

	candidates := []string{".env", "server/.env"}
	for _, path := range candidates {
		err := loadDotEnvFile(path)
		if err == nil {
			return nil
		}
		if errors.Is(err, os.ErrNotExist) {
			continue
		}
		return fmt.Errorf("failed to load %s: %w", path, err)
	}
	return nil
}

func loadDotEnvFile(path string) error {
	f, err := os.Open(path)
	if err != nil {
		return err
	}
	defer f.Close()

	scanner := bufio.NewScanner(f)
	for lineNo := 1; scanner.Scan(); lineNo++ {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}

		if strings.HasPrefix(line, "export ") {
			line = strings.TrimSpace(strings.TrimPrefix(line, "export "))
		}

		key, value, ok := strings.Cut(line, "=")
		if !ok {
			return fmt.Errorf("%s:%d invalid entry: expected KEY=VALUE", path, lineNo)
		}

		key = strings.TrimSpace(key)
		if key == "" {
			return fmt.Errorf("%s:%d invalid entry: empty key", path, lineNo)
		}

		if _, exists := os.LookupEnv(key); exists {
			continue
		}

		value = strings.TrimSpace(value)
		if len(value) >= 2 {
			if (value[0] == '"' && value[len(value)-1] == '"') || (value[0] == '\'' && value[len(value)-1] == '\'') {
				value = value[1 : len(value)-1]
			}
		}

		if err := os.Setenv(key, value); err != nil {
			return fmt.Errorf("%s:%d failed to set %s: %w", path, lineNo, key, err)
		}
	}

	if err := scanner.Err(); err != nil {
		return fmt.Errorf("scan %s: %w", path, err)
	}

	return nil
}
