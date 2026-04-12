APP_NAME := server
BUILD_DIR := bin
BINARY := $(BUILD_DIR)/$(APP_NAME)

.PHONY: run build test test-coverage lint fmt tidy \
        docker-up docker-down docker-logs clean install-tools swagger

run: ## Run the application
	go run ./cmd/main.go

build: ## Build binary to bin/$(APP_NAME)
	@mkdir -p $(BUILD_DIR)
	CGO_ENABLED=0 go build -ldflags="-w -s" -o $(BINARY) ./cmd/main.go

test: ## Run tests with race detection and coverage
	GOTOOLCHAIN=auto go test -race -cover ./...

test-coverage: ## Generate HTML coverage report
	GOTOOLCHAIN=auto go test -race -coverprofile=coverage.out ./...
	GOTOOLCHAIN=auto go tool cover -html=coverage.out -o coverage.html
	@echo "Coverage report: coverage.html"

lint: ## Run golangci-lint
	golangci-lint run ./...

fmt: ## Format code
	gofmt -s -w .
	goimports -w .

tidy: ## Run go mod tidy
	go mod tidy

docker-up: ## Start all services
	docker compose up -d

docker-down: ## Stop all services
	docker compose down

docker-logs: ## Follow app logs
	docker compose logs -f app

clean: ## Remove build artifacts
	rm -rf $(BUILD_DIR)/ coverage.out coverage.html

install-tools: ## Install dev tools
	go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest
	go install golang.org/x/tools/cmd/goimports@latest
	go install github.com/swaggo/swag/cmd/swag@latest

swagger: ## Regenerate Swagger/OpenAPI documentation
	@which swag > /dev/null 2>&1 || (echo "  → Installing swag CLI..." && go install github.com/swaggo/swag/cmd/swag@latest)
	swag init -g cmd/main.go -o docs --parseDependency --parseInternal 2>&1 | grep -v "warning:"
	@echo "  ✓ Swagger docs updated → docs/swagger.yaml | docs/swagger.json"
	go mod tidy

help: ## Display this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'

.DEFAULT_GOAL := help
