package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/brizzi78-strong/test/internal/task"
)

// newTestServer returns a Server backed by a fresh in-memory store.
func newTestServer() *Server {
	return NewServer(task.NewStore())
}

// do issues a request against the server and returns the recorder.
func do(s *Server, method, path, body string) *httptest.ResponseRecorder {
	var r *http.Request
	if body == "" {
		r = httptest.NewRequest(method, path, nil)
	} else {
		r = httptest.NewRequest(method, path, strings.NewReader(body))
	}
	w := httptest.NewRecorder()
	s.ServeHTTP(w, r)
	return w
}

func TestHealth(t *testing.T) {
	w := do(newTestServer(), http.MethodGet, "/healthz", "")
	if w.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", w.Code)
	}
	var body map[string]string
	if err := json.Unmarshal(w.Body.Bytes(), &body); err != nil {
		t.Fatalf("decode body: %v", err)
	}
	if body["status"] != "ok" {
		t.Errorf("status field = %q, want ok", body["status"])
	}
}

func TestCreateTask(t *testing.T) {
	s := newTestServer()

	w := do(s, http.MethodPost, "/tasks", `{"title":"write tests"}`)
	if w.Code != http.StatusCreated {
		t.Fatalf("status = %d, want 201", w.Code)
	}
	var got task.Task
	if err := json.Unmarshal(w.Body.Bytes(), &got); err != nil {
		t.Fatalf("decode body: %v", err)
	}
	if got.ID != 1 || got.Title != "write tests" {
		t.Errorf("task = %+v, want id=1 title=write tests", got)
	}
}

func TestCreateTaskValidation(t *testing.T) {
	tests := []struct {
		name string
		body string
		want int
	}{
		{name: "empty title", body: `{"title":""}`, want: http.StatusBadRequest},
		{name: "malformed json", body: `{not json`, want: http.StatusBadRequest},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			w := do(newTestServer(), http.MethodPost, "/tasks", tc.body)
			if w.Code != tc.want {
				t.Errorf("status = %d, want %d", w.Code, tc.want)
			}
		})
	}
}

func TestListTasks(t *testing.T) {
	s := newTestServer()
	do(s, http.MethodPost, "/tasks", `{"title":"a"}`)
	do(s, http.MethodPost, "/tasks", `{"title":"b"}`)

	w := do(s, http.MethodGet, "/tasks", "")
	if w.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", w.Code)
	}
	var got []task.Task
	if err := json.Unmarshal(w.Body.Bytes(), &got); err != nil {
		t.Fatalf("decode body: %v", err)
	}
	if len(got) != 2 {
		t.Errorf("got %d tasks, want 2", len(got))
	}
}

func TestGetTask(t *testing.T) {
	s := newTestServer()
	do(s, http.MethodPost, "/tasks", `{"title":"fetch me"}`)

	w := do(s, http.MethodGet, "/tasks/1", "")
	if w.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", w.Code)
	}

	if w := do(s, http.MethodGet, "/tasks/999", ""); w.Code != http.StatusNotFound {
		t.Errorf("missing task status = %d, want 404", w.Code)
	}
	if w := do(s, http.MethodGet, "/tasks/abc", ""); w.Code != http.StatusBadRequest {
		t.Errorf("bad id status = %d, want 400", w.Code)
	}
}

func TestUpdateTask(t *testing.T) {
	s := newTestServer()
	do(s, http.MethodPost, "/tasks", `{"title":"old"}`)

	w := do(s, http.MethodPut, "/tasks/1", `{"title":"new","done":true}`)
	if w.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", w.Code)
	}
	var got task.Task
	if err := json.Unmarshal(w.Body.Bytes(), &got); err != nil {
		t.Fatalf("decode body: %v", err)
	}
	if got.Title != "new" || !got.Done {
		t.Errorf("task = %+v, want title=new done=true", got)
	}

	if w := do(s, http.MethodPut, "/tasks/999", `{"title":"x"}`); w.Code != http.StatusNotFound {
		t.Errorf("missing task status = %d, want 404", w.Code)
	}
	if w := do(s, http.MethodPut, "/tasks/1", `{"title":""}`); w.Code != http.StatusBadRequest {
		t.Errorf("empty title status = %d, want 400", w.Code)
	}
}

func TestDeleteTask(t *testing.T) {
	s := newTestServer()
	do(s, http.MethodPost, "/tasks", `{"title":"delete me"}`)

	if w := do(s, http.MethodDelete, "/tasks/1", ""); w.Code != http.StatusNoContent {
		t.Fatalf("status = %d, want 204", w.Code)
	}
	if w := do(s, http.MethodGet, "/tasks/1", ""); w.Code != http.StatusNotFound {
		t.Errorf("task still present after delete: status = %d, want 404", w.Code)
	}
	if w := do(s, http.MethodDelete, "/tasks/1", ""); w.Code != http.StatusNotFound {
		t.Errorf("double delete status = %d, want 404", w.Code)
	}
}

// TestUnknownRoute confirms unregistered paths fall through to 404.
func TestUnknownRoute(t *testing.T) {
	w := do(newTestServer(), http.MethodGet, "/nope", "")
	if w.Code != http.StatusNotFound {
		t.Errorf("unknown route status = %d, want 404", w.Code)
	}
}
