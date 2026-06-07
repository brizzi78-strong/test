.PHONY: build run test cover lint tidy

build:
	go build ./...

run:
	go run ./cmd/server

test:
	go test ./...

# cover runs the suite and prints a per-function coverage report.
cover:
	go test -coverprofile=coverage.out ./...
	go tool cover -func=coverage.out

# cover-html opens an annotated HTML coverage view.
cover-html: cover
	go tool cover -html=coverage.out

tidy:
	go mod tidy

vet:
	go vet ./...
