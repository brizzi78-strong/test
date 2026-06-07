// Package api exposes the task store over HTTP as a small JSON REST service.
package api

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"

	"github.com/brizzi78-strong/test/internal/task"
)

// Server wires the task store to an http.Handler.
type Server struct {
	store *task.Store
	mux   *http.ServeMux
}

// NewServer constructs a Server backed by the given store and registers routes.
func NewServer(store *task.Store) *Server {
	s := &Server{
		store: store,
		mux:   http.NewServeMux(),
	}
	s.routes()
	return s
}

// ServeHTTP makes Server an http.Handler.
func (s *Server) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	s.mux.ServeHTTP(w, r)
}

func (s *Server) routes() {
	s.mux.HandleFunc("GET /healthz", s.handleHealth)
	s.mux.HandleFunc("GET /tasks", s.handleList)
	s.mux.HandleFunc("POST /tasks", s.handleCreate)
	s.mux.HandleFunc("GET /tasks/{id}", s.handleGet)
	s.mux.HandleFunc("PUT /tasks/{id}", s.handleUpdate)
	s.mux.HandleFunc("DELETE /tasks/{id}", s.handleDelete)
}

type taskRequest struct {
	Title string `json:"title"`
	Done  bool   `json:"done"`
}

func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (s *Server) handleList(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, s.store.List())
}

func (s *Server) handleCreate(w http.ResponseWriter, r *http.Request) {
	req, ok := decodeBody(w, r)
	if !ok {
		return
	}
	t, err := s.store.Create(req.Title)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, t)
}

func (s *Server) handleGet(w http.ResponseWriter, r *http.Request) {
	id, ok := parseID(w, r)
	if !ok {
		return
	}
	t, err := s.store.Get(id)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, t)
}

func (s *Server) handleUpdate(w http.ResponseWriter, r *http.Request) {
	id, ok := parseID(w, r)
	if !ok {
		return
	}
	req, ok := decodeBody(w, r)
	if !ok {
		return
	}
	t, err := s.store.Update(id, req.Title, req.Done)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, t)
}

func (s *Server) handleDelete(w http.ResponseWriter, r *http.Request) {
	id, ok := parseID(w, r)
	if !ok {
		return
	}
	if err := s.store.Delete(id); err != nil {
		writeError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// parseID extracts and validates the {id} path value, writing a 400 on failure.
func parseID(w http.ResponseWriter, r *http.Request) (int, bool) {
	id, err := strconv.Atoi(r.PathValue("id"))
	if err != nil || id < 1 {
		writeJSON(w, http.StatusBadRequest, errorBody("invalid task id"))
		return 0, false
	}
	return id, true
}

// decodeBody parses the JSON request body, writing a 400 on malformed input.
func decodeBody(w http.ResponseWriter, r *http.Request) (taskRequest, bool) {
	var req taskRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, errorBody("invalid JSON body"))
		return taskRequest{}, false
	}
	return req, true
}

// writeError maps domain errors to HTTP status codes.
func writeError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, task.ErrNotFound):
		writeJSON(w, http.StatusNotFound, errorBody(err.Error()))
	case errors.Is(err, task.ErrEmptyTitle):
		writeJSON(w, http.StatusBadRequest, errorBody(err.Error()))
	default:
		writeJSON(w, http.StatusInternalServerError, errorBody("internal error"))
	}
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func errorBody(msg string) map[string]string {
	return map[string]string{"error": msg}
}
