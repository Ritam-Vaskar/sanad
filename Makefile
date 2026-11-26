.PHONY: up down test lint seed

up:
	docker compose up --build

down:
	docker compose down

test:
	pnpm test

lint:
	pnpm lint

seed:
	@echo "Seed script will be added with the backend setup"
