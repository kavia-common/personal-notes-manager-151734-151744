import React, { useState, useEffect, useCallback, useRef } from "react";
import "./App.css";
import "./index.css";

/**
 * Notes Application - Minimalistic & Light Theme
 * Features: Create, View, Edit, Delete, Search notes.
 * Layout: Sidebar (nav/search/new) + Main panel (notes list/views)
 * Colors: 
 *  primary: #1976d2, accent: #ffeb3b, secondary: #424242 (used for highlight/border/button)
 */

// PUBLIC_INTERFACE
function App() {
  // Notes Structure: {id: string, title: string, body: string, created: number, updated: number}
  const [notes, setNotes] = useState(() => {
    // Persistent notes (localStorage)
    try {
      const data = window.localStorage.getItem("notes-v1");
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  });
  const [currentNoteId, setCurrentNoteId] = useState(null);
  const [search, setSearch] = useState("");
  const [editor, setEditor] = useState({ title: "", body: "" });
  const [editing, setEditing] = useState(false);

  // Load note for editing/viewing
  useEffect(() => {
    if (!currentNoteId && notes.length > 0) setCurrentNoteId(notes[0].id);
  }, [notes, currentNoteId]);

  // Sync notes to localStorage
  useEffect(() => {
    window.localStorage.setItem("notes-v1", JSON.stringify(notes));
  }, [notes]);

  // Get current note
  const currentNote = notes.find((n) => n.id === currentNoteId);

  // New Note Handler
  const handleNewNote = () => {
    setEditor({ title: "", body: "" });
    setEditing(true);
    setCurrentNoteId(null); // Prepare for new id on save
  };

  // Edit Note Handler
  const handleEditNote = () => {
    if (!currentNote) return;
    setEditor({ title: currentNote.title, body: currentNote.body });
    setEditing(true);
  };

  // Delete Note Handler
  const handleDeleteNote = useCallback(
    (id) => {
      if (!id) return;
      const newNotes = notes.filter((note) => note.id !== id);
      setNotes(newNotes);
      if (newNotes.length === 0) {
        setCurrentNoteId(null);
      } else if (id === currentNoteId) {
        setCurrentNoteId(newNotes[0].id); // fallback
      }
      if (editing && !id) setEditing(false);
    },
    [notes, currentNoteId, editing]
  );

  // Save Note Handler (for both new or edit)
  const handleSave = (e) => {
    e.preventDefault();
    const trimmedTitle = editor.title.trim();
    const trimmedBody = editor.body.trim();
    if (!trimmedTitle && !trimmedBody) return; // Ignore empty notes

    let updatedNotes;
    const ts = Date.now();
    if (currentNoteId && notes.some((n) => n.id === currentNoteId)) {
      // Edit existing
      updatedNotes = notes.map((n) =>
        n.id === currentNoteId
          ? {
              ...n,
              title: trimmedTitle,
              body: trimmedBody,
              updated: ts,
            }
          : n
      );
      setNotes(updatedNotes);
    } else {
      // Create new
      const newId = `note-${ts}`;
      const newNote = {
        id: newId,
        title: trimmedTitle,
        body: trimmedBody,
        created: ts,
        updated: ts,
      };
      updatedNotes = [newNote, ...notes];
      setNotes(updatedNotes);
      setCurrentNoteId(newId);
    }
    setEditing(false);
    setEditor({ title: "", body: "" });
  };

  // Cancel Edit Handler
  const handleCancel = () => {
    setEditing(false);
    setEditor({ title: "", body: "" });
    if (notes.length > 0 && !currentNoteId) setCurrentNoteId(notes[0].id);
  };

  // Select Note Handler
  const handleSelectNote = (id) => {
    setCurrentNoteId(id);
    setEditing(false);
    setEditor({ title: "", body: "" });
  };

  // Search Handler
  const searchLower = search.toLowerCase();
  const filteredNotes = !search
    ? notes
    : notes.filter(
        (n) =>
          n.title.toLowerCase().includes(searchLower) ||
          n.body.toLowerCase().includes(searchLower)
      );

  // Keyboard shortcut: CMD/CTRL+N for new note
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "n") {
        e.preventDefault();
        handleNewNote();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line
  }, []);

  // Accent focus/fade to newly created note
  const listRef = useRef();

  useEffect(() => {
    if (currentNoteId && listRef.current) {
      const el = listRef.current.querySelector(
        `[data-noteid='${currentNoteId}']`
      );
      if (el) {
        el.scrollIntoView({ block: "nearest" });
        el.classList.add("note-active-flash");
        setTimeout(() => {
          el.classList.remove("note-active-flash");
        }, 600);
      }
    }
  }, [currentNoteId]);

  return (
    <div className="notes-app-shell">
      <Sidebar
        onSearch={setSearch}
        search={search}
        onNew={handleNewNote}
      />
      <main className="main-panel">
        <section className="notes-list-wrap" ref={listRef}>
          <NotesList
            notes={filteredNotes}
            selectedId={currentNoteId}
            onSelect={handleSelectNote}
            onDelete={handleDeleteNote}
          />
        </section>
        <section className="note-editor-or-view-area">
          {editing ? (
            <NoteEditor
              title={editor.title}
              body={editor.body}
              setTitle={(t) =>
                setEditor((ed) => ({ ...ed, title: t }))
              }
              setBody={(b) =>
                setEditor((ed) => ({ ...ed, body: b }))
              }
              onSave={handleSave}
              onCancel={handleCancel}
            />
          ) : (
            <NoteViewer
              note={currentNote}
              onEdit={handleEditNote}
              onDelete={() => handleDeleteNote(currentNoteId)}
            />
          )}
        </section>
      </main>
    </div>
  );
}

// PUBLIC_INTERFACE
function Sidebar({ onSearch, search, onNew }) {
  return (
    <nav className="sidebar">
      <div className="sidebar-header">
        <span className="sidebar-title">Notes</span>
      </div>
      <div className="sidebar-search">
        <input
          type="text"
          placeholder="Search notes..."
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          aria-label="Search notes"
        />
      </div>
      <button className="sidebar-btn-new" onClick={onNew}>
        + New Note
      </button>
      <div className="sidebar-footer" />
    </nav>
  );
}

// PUBLIC_INTERFACE
function NotesList({ notes, selectedId, onSelect, onDelete }) {
  if (notes.length === 0)
    return <div className="notes-empty">No notes found.</div>;
  return (
    <ul className="notes-list">
      {notes.map((note) => (
        <li
          key={note.id}
          data-noteid={note.id}
          className={
            "note-list-item" + (note.id === selectedId ? " active" : "")
          }
          tabIndex={0}
          onClick={() => onSelect(note.id)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") onSelect(note.id);
          }}
        >
          <div className="note-list-title" title={note.title || "(untitled)"}>
            {note.title || <em style={{ color: "#757575" }}>(untitled)</em>}
          </div>
          <div className="note-list-date">
            {note.updated
              ? new Date(note.updated).toLocaleDateString()
              : ""}
          </div>
          <button
            className="note-list-delete-btn"
            title="Delete note"
            aria-label="Delete note"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(note.id);
            }}
          >
            ×
          </button>
        </li>
      ))}
    </ul>
  );
}

// PUBLIC_INTERFACE
function NoteEditor({ title, body, setTitle, setBody, onSave, onCancel }) {
  const bodyRef = useRef();
  useEffect(() => {
    setTimeout(() => {
      if (bodyRef.current) bodyRef.current.focus();
    }, 100);
  }, []);
  return (
    <form className="note-editor" onSubmit={onSave} autoComplete="off">
      <input
        className="note-editor-title"
        type="text"
        placeholder="Title"
        value={title}
        maxLength={60}
        onChange={(e) => setTitle(e.target.value)}
        aria-label="Note title"
        autoFocus
      />
      <textarea
        ref={bodyRef}
        className="note-editor-body"
        placeholder="Start typing your note..."
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={12}
        aria-label="Note body"
      />
      <div className="note-editor-actions">
        <button
          className="btn save"
          type="submit"
          title="Save note"
        >
          Save
        </button>
        <button
          className="btn cancel"
          type="button"
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// PUBLIC_INTERFACE
function NoteViewer({ note, onEdit, onDelete }) {
  if (!note)
    return (
      <div className="note-viewer-empty">
        Select or create a note to get started.
      </div>
    );
  return (
    <div className="note-viewer">
      <div className="note-viewer-header">
        <h2 className="note-viewer-title">
          {note.title || <em style={{ color: "#757575" }}>(untitled)</em>}
        </h2>
        <div className="note-viewer-actions">
          <button className="btn edit" onClick={onEdit}>
            Edit
          </button>
          <button
            className="btn delete"
            onClick={onDelete}
            title="Delete note"
          >
            Delete
          </button>
        </div>
      </div>
      <div className="note-viewer-body">
        {note.body ? (
          note.body.split("\n").map((line, idx) => (
            <p key={idx} style={{ margin: 0 }}>
              {line}
            </p>
          ))
        ) : (
          <i className="note-viewer-empty-body">No content.</i>
        )}
      </div>
      <div className="note-viewer-meta">
        <span>
          Created:{" "}
          {note.created
            ? new Date(note.created).toLocaleString()
            : ""}
        </span>{" "}
        <span>
          {note.updated && note.updated !== note.created
            ? `• Last updated: ${new Date(note.updated).toLocaleString()}`
            : ""}
        </span>
      </div>
    </div>
  );
}

export default App;
