// Command server runs the task HTTP API.
package main

import (
	"log"
	"net/http"
	"os"

	"github.com/brizzi78-strong/test/internal/api"
	"github.com/brizzi78-strong/test/internal/task"
)

func main() {
	addr := os.Getenv("ADDR")
	if addr == "" {
		addr = ":8080"
	}

	srv := api.NewServer(task.NewStore())

	log.Printf("task API listening on %s", addr)
	if err := http.ListenAndServe(addr, srv); err != nil {
		log.Fatalf("server error: %v", err)
	}
}
