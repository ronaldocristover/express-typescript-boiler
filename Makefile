# Makefile for Express TypeScript App with Docker

.PHONY: help build up down logs restart clean dev dev-logs dev-down test

# Default target
help:
	@echo "Available commands:"
	@echo "  build     - Build Docker images"
	@echo "  up        - Start production services"
	@echo "  down      - Stop production services"
	@echo "  logs      - View production logs"
	@echo "  restart   - Restart production services"
	@echo "  clean     - Clean up containers and volumes"
	@echo "  dev       - Start development services"
	@echo "  dev-logs  - View development logs"
	@echo "  dev-down  - Stop development services"
	@echo "  test      - Run tests in container"
	@echo "  migrate   - Run database migrations"
	@echo "  seed      - Seed the database"

# Production commands
build:
	docker-compose build

up:
	docker-compose up -d
	@echo "Services started! Check status:"
	@echo "  App: http://localhost:8888"
	@echo "  RabbitMQ: http://localhost:15672"
	@echo "  Health: http://localhost:8888/health"

down:
	docker-compose down

logs:
	docker-compose logs -f app

restart:
	docker-compose restart app

clean:
	docker-compose down -v --rmi all
	docker system prune -f

# Development commands
dev:
	docker-compose -f docker-compose.dev.yml up -d
	@echo "Development services started!"
	@echo "  App: http://localhost:8888 (with hot reload)"
	@echo "  RabbitMQ: http://localhost:15672"

dev-logs:
	docker-compose -f docker-compose.dev.yml logs -f app

dev-down:
	docker-compose -f docker-compose.dev.yml down

# Database commands
migrate:
	docker-compose exec app npx prisma migrate deploy

seed:
	docker-compose exec app npx prisma db seed

# Testing
test:
	docker-compose exec app npm test

# Status check
status:
	docker-compose ps
	@echo "\nHealth checks:"
	@curl -s http://localhost:8888/health | jq . || echo "App not responding"

# Quick setup for new environment
setup: build up
	@echo "Waiting for services to be ready..."
	@sleep 10
	@make migrate
	@make seed
	@echo "Setup complete!"