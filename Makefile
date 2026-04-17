.PHONY: dev dev-stop

dev:
	docker compose -f docker-stack.yml up --build -d

dev-stop:
	docker compose -f docker-stack.yml down
