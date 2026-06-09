// Package task defines the core domain model and storage for tasks.
package task

import (
	"errors"
	"strings"
	"sync"
	"time"
)

// Errors returned by the Store.
var (
	// ErrNotFound is returned when a task with the given ID does not exist.
	ErrNotFound = errors.New("task not found")
	// ErrEmptyTitle is returned when a task is created or updated with a blank title.
	ErrEmptyTitle = errors.New("task title must not be empty")
)

// Task is the core domain entity.
type Task struct {
	ID        int       `json:"id"`
	Title     string    `json:"title"`
	Done      bool      `json:"done"`
	CreatedAt time.Time `json:"created_at"`
}

// Store is an in-memory, concurrency-safe collection of tasks.
type Store struct {
	mu     sync.RWMutex
	tasks  map[int]Task
	nextID int
	now    func() time.Time // injectable clock for deterministic tests
}

// NewStore returns an empty Store ready for use.
func NewStore() *Store {
	return &Store{
		tasks:  make(map[int]Task),
		nextID: 1,
		now:    time.Now,
	}
}

// Create adds a new task with the given title. The title is trimmed of
// surrounding whitespace and must not be empty.
func (s *Store) Create(title string) (Task, error) {
	title = strings.TrimSpace(title)
	if title == "" {
		return Task{}, ErrEmptyTitle
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	t := Task{
		ID:        s.nextID,
		Title:     title,
		Done:      false,
		CreatedAt: s.now(),
	}
	s.tasks[t.ID] = t
	s.nextID++
	return t, nil
}

// Get returns the task with the given ID, or ErrNotFound.
func (s *Store) Get(id int) (Task, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	t, ok := s.tasks[id]
	if !ok {
		return Task{}, ErrNotFound
	}
	return t, nil
}

// List returns all tasks ordered by ID ascending.
func (s *Store) List() []Task {
	s.mu.RLock()
	defer s.mu.RUnlock()

	out := make([]Task, 0, len(s.tasks))
	for _, t := range s.tasks {
		out = append(out, t)
	}
	// Sort by ID for a stable, predictable order.
	for i := 1; i < len(out); i++ {
		for j := i; j > 0 && out[j-1].ID > out[j].ID; j-- {
			out[j-1], out[j] = out[j], out[j-1]
		}
	}
	return out
}

// Update replaces the title and done state of an existing task. The title is
// trimmed and must not be empty.
func (s *Store) Update(id int, title string, done bool) (Task, error) {
	title = strings.TrimSpace(title)
	if title == "" {
		return Task{}, ErrEmptyTitle
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	t, ok := s.tasks[id]
	if !ok {
		return Task{}, ErrNotFound
	}
	t.Title = title
	t.Done = done
	s.tasks[id] = t
	return t, nil
}

// Delete removes the task with the given ID, or returns ErrNotFound.
func (s *Store) Delete(id int) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if _, ok := s.tasks[id]; !ok {
		return ErrNotFound
	}
	delete(s.tasks, id)
	return nil
}
