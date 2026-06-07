# test

A small, dependency-free task management HTTP API written in Go. It exists as a
clean starting point with a well-structured test suite and coverage reporting.

## Layout

```
cmd/server/      # main entrypoint
internal/task/   # domain model + in-memory store (unit tested)
internal/api/    # HTTP handlers (tested via httptest)
```

## Running

```sh
make run            # starts the server on :8080 (override with ADDR)
```

The API is JSON over HTTP, using only the Go standard library
(`net/http` with method-aware routing from Go 1.22+).

### Endpoints

| Method | Path           | Description                |
|--------|----------------|----------------------------|
| GET    | `/healthz`     | Liveness check             |
| GET    | `/tasks`       | List all tasks             |
| POST   | `/tasks`       | Create a task              |
| GET    | `/tasks/{id}`  | Fetch one task             |
| PUT    | `/tasks/{id}`  | Update title / done state  |
| DELETE | `/tasks/{id}`  | Delete a task              |

Example:

```sh
curl -s -X POST localhost:8080/tasks -d '{"title":"write tests"}'
curl -s localhost:8080/tasks
```

## Testing

```sh
make test           # run the suite
make cover          # run with a per-function coverage report
make cover-html     # open an annotated HTML coverage view
```

The test suite covers the store's CRUD logic and validation, plus every HTTP
endpoint including error paths (invalid IDs, malformed JSON, missing tasks).
CI runs `go vet` and the race-enabled suite with coverage on every push and PR.
