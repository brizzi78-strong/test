package task

import (
	"errors"
	"testing"
	"time"
)

// newTestStore returns a store with a fixed clock for deterministic timestamps.
func newTestStore() *Store {
	s := NewStore()
	s.now = func() time.Time { return time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC) }
	return s
}

func TestCreate(t *testing.T) {
	tests := []struct {
		name    string
		title   string
		want    string
		wantErr error
	}{
		{name: "simple title", title: "buy milk", want: "buy milk"},
		{name: "trims whitespace", title: "  padded  ", want: "padded"},
		{name: "empty title", title: "", wantErr: ErrEmptyTitle},
		{name: "whitespace only", title: "   ", wantErr: ErrEmptyTitle},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			s := newTestStore()
			got, err := s.Create(tc.title)
			if tc.wantErr != nil {
				if !errors.Is(err, tc.wantErr) {
					t.Fatalf("Create(%q) error = %v, want %v", tc.title, err, tc.wantErr)
				}
				return
			}
			if err != nil {
				t.Fatalf("Create(%q) unexpected error: %v", tc.title, err)
			}
			if got.Title != tc.want {
				t.Errorf("Title = %q, want %q", got.Title, tc.want)
			}
			if got.ID != 1 {
				t.Errorf("ID = %d, want 1", got.ID)
			}
			if got.Done {
				t.Errorf("Done = true, want false for new task")
			}
		})
	}
}

func TestCreateAssignsIncrementingIDs(t *testing.T) {
	s := newTestStore()
	first, _ := s.Create("a")
	second, _ := s.Create("b")
	if first.ID != 1 || second.ID != 2 {
		t.Errorf("IDs = %d, %d; want 1, 2", first.ID, second.ID)
	}
}

func TestGet(t *testing.T) {
	s := newTestStore()
	created, _ := s.Create("find me")

	got, err := s.Get(created.ID)
	if err != nil {
		t.Fatalf("Get(%d) unexpected error: %v", created.ID, err)
	}
	if got.Title != "find me" {
		t.Errorf("Title = %q, want %q", got.Title, "find me")
	}

	if _, err := s.Get(999); !errors.Is(err, ErrNotFound) {
		t.Errorf("Get(999) error = %v, want ErrNotFound", err)
	}
}

func TestList(t *testing.T) {
	s := newTestStore()
	if got := s.List(); len(got) != 0 {
		t.Errorf("List() on empty store = %d items, want 0", len(got))
	}

	s.Create("first")
	s.Create("second")
	s.Create("third")

	got := s.List()
	if len(got) != 3 {
		t.Fatalf("List() = %d items, want 3", len(got))
	}
	// Verify ascending ID order.
	for i, want := range []int{1, 2, 3} {
		if got[i].ID != want {
			t.Errorf("List()[%d].ID = %d, want %d", i, got[i].ID, want)
		}
	}
}

func TestUpdate(t *testing.T) {
	s := newTestStore()
	created, _ := s.Create("original")

	updated, err := s.Update(created.ID, "revised", true)
	if err != nil {
		t.Fatalf("Update unexpected error: %v", err)
	}
	if updated.Title != "revised" || !updated.Done {
		t.Errorf("Update result = %+v, want title=revised done=true", updated)
	}

	// Confirm persistence.
	got, _ := s.Get(created.ID)
	if got.Title != "revised" || !got.Done {
		t.Errorf("persisted task = %+v, want title=revised done=true", got)
	}

	if _, err := s.Update(999, "x", false); !errors.Is(err, ErrNotFound) {
		t.Errorf("Update(999) error = %v, want ErrNotFound", err)
	}
	if _, err := s.Update(created.ID, "  ", false); !errors.Is(err, ErrEmptyTitle) {
		t.Errorf("Update with blank title error = %v, want ErrEmptyTitle", err)
	}
}

func TestDelete(t *testing.T) {
	s := newTestStore()
	created, _ := s.Create("temporary")

	if err := s.Delete(created.ID); err != nil {
		t.Fatalf("Delete unexpected error: %v", err)
	}
	if _, err := s.Get(created.ID); !errors.Is(err, ErrNotFound) {
		t.Errorf("Get after delete error = %v, want ErrNotFound", err)
	}
	if err := s.Delete(created.ID); !errors.Is(err, ErrNotFound) {
		t.Errorf("Delete(already gone) error = %v, want ErrNotFound", err)
	}
}
