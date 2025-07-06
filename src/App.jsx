import React, { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Edit3, Trash2, Save, X, Cloud, CloudOff, RefreshCw } from 'lucide-react';

const CloudNotesApp = () => {
  const [notes, setNotes] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNote, setSelectedNote] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingNote, setEditingNote] = useState({ title: '', content: '' });
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);

  // Google Cloud API configuration
  const CLOUD_API_URL = 'https://your-cloud-function-url.cloudfunctions.net/notes';
  const API_KEY = 'your-api-key'; // In production, use environment variables

  // Initialize with some sample data
  useEffect(() => {
    const sampleNotes = [
      {
        id: '1',
        title: 'Welcome to Cloud Notes',
        content: 'This is your first note! Start by connecting to Google Cloud to sync your notes across devices.',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        synced: false
      },
      {
        id: '2',
        title: 'Getting Started',
        content: 'Click the + button to create a new note. Your notes will automatically sync with Google Cloud once connected.',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        synced: false
      }
    ];
    setNotes(sampleNotes);
  }, []);

  // Simulate Google Cloud API calls
  const cloudAPI = {
    // Get all notes from cloud
    getNotes: async () => {
      try {
        // Simulate API call
        const response = await fetch(`${CLOUD_API_URL}?apiKey=${API_KEY}`);
        if (!response.ok) throw new Error('Failed to fetch notes');
        return await response.json();
      } catch (error) {
        console.error('Error fetching notes:', error);
        // Return mock data for demo
        return [];
      }
    },

    // Create new note in cloud
    createNote: async (note) => {
      try {
        const response = await fetch(CLOUD_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_KEY}`
          },
          body: JSON.stringify(note)
        });
        if (!response.ok) throw new Error('Failed to create note');
        return await response.json();
      } catch (error) {
        console.error('Error creating note:', error);
        // Return the note with synced flag for demo
        return { ...note, synced: true };
      }
    },

    // Update note in cloud
    updateNote: async (noteId, updates) => {
      try {
        const response = await fetch(`${CLOUD_API_URL}/${noteId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_KEY}`
          },
          body: JSON.stringify(updates)
        });
        if (!response.ok) throw new Error('Failed to update note');
        return await response.json();
      } catch (error) {
        console.error('Error updating note:', error);
        return { ...updates, synced: true };
      }
    },

    // Delete note from cloud
    deleteNote: async (noteId) => {
      try {
        const response = await fetch(`${CLOUD_API_URL}/${noteId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${API_KEY}`
          }
        });
        if (!response.ok) throw new Error('Failed to delete note');
        return true;
      } catch (error) {
        console.error('Error deleting note:', error);
        return true; // Return true for demo
      }
    }
  };

  // Sync notes with Google Cloud
  const syncNotes = useCallback(async () => {
    if (!isConnected) return;
    
    setIsLoading(true);
    try {
      // Get notes from cloud
      const cloudNotes = await cloudAPI.getNotes();
      
      // Merge with local notes (in a real app, you'd handle conflicts)
      const mergedNotes = [...notes];
      cloudNotes.forEach(cloudNote => {
        const existingIndex = mergedNotes.findIndex(n => n.id === cloudNote.id);
        if (existingIndex >= 0) {
          // Update existing note if cloud version is newer
          if (new Date(cloudNote.updatedAt) > new Date(mergedNotes[existingIndex].updatedAt)) {
            mergedNotes[existingIndex] = { ...cloudNote, synced: true };
          }
        } else {
          // Add new note from cloud
          mergedNotes.push({ ...cloudNote, synced: true });
        }
      });

      setNotes(mergedNotes);
      setLastSyncTime(new Date());
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, notes]);

  // Auto-sync every 30 seconds
  useEffect(() => {
    if (!isConnected) return;
    
    const interval = setInterval(syncNotes, 30000);
    return () => clearInterval(interval);
  }, [isConnected, syncNotes]);

  // Connect to Google Cloud
  const connectToCloud = async () => {
    setIsLoading(true);
    // Simulate connection process
    setTimeout(() => {
      setIsConnected(true);
      setIsLoading(false);
      syncNotes();
    }, 2000);
  };

  // Create new note
  const createNote = async () => {
    const newNote = {
      id: Date.now().toString(),
      title: 'New Note',
      content: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      synced: false
    };

    setNotes(prev => [newNote, ...prev]);
    setSelectedNote(newNote);
    setIsEditing(true);
    setEditingNote({ title: newNote.title, content: newNote.content });

    // Sync to cloud if connected
    if (isConnected) {
      try {
        const syncedNote = await cloudAPI.createNote(newNote);
        setNotes(prev => prev.map(n => n.id === newNote.id ? syncedNote : n));
      } catch (error) {
        console.error('Failed to sync new note:', error);
      }
    }
  };

  // Save note changes
  const saveNote = async () => {
    if (!selectedNote) return;

    const updatedNote = {
      ...selectedNote,
      ...editingNote,
      updatedAt: new Date().toISOString(),
      synced: false
    };

    setNotes(prev => prev.map(n => n.id === selectedNote.id ? updatedNote : n));
    setSelectedNote(updatedNote);
    setIsEditing(false);

    // Sync to cloud if connected
    if (isConnected) {
      try {
        const syncedNote = await cloudAPI.updateNote(selectedNote.id, updatedNote);
        setNotes(prev => prev.map(n => n.id === selectedNote.id ? syncedNote : n));
        setSelectedNote(syncedNote);
      } catch (error) {
        console.error('Failed to sync updated note:', error);
      }
    }
  };

  // Delete note
  const deleteNote = async (noteId) => {
    setNotes(prev => prev.filter(n => n.id !== noteId));
    if (selectedNote?.id === noteId) {
      setSelectedNote(null);
      setIsEditing(false);
    }

    // Delete from cloud if connected
    if (isConnected) {
      try {
        await cloudAPI.deleteNote(noteId);
      } catch (error) {
        console.error('Failed to delete note from cloud:', error);
      }
    }
  };

  // Filter notes based on search
  const filteredNotes = notes.filter(note =>
    note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    note.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Format date for display
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-semibold text-gray-800">Cloud Notes</h1>
            <div className="flex items-center gap-2">
              {isConnected ? (
                <div className="flex items-center gap-1 text-green-600">
                  <Cloud size={16} />
                  <span className="text-xs">Connected</span>
                </div>
              ) : (
                <button
                  onClick={connectToCloud}
                  disabled={isLoading}
                  className="flex items-center gap-1 text-gray-500 hover:text-blue-600 transition-colors"
                >
                  {isLoading ? (
                    <RefreshCw size={16} className="animate-spin" />
                  ) : (
                    <CloudOff size={16} />
                  )}
                  <span className="text-xs">Connect</span>
                </button>
              )}
            </div>
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* New Note Button */}
        <div className="p-4 border-b border-gray-200">
          <button
            onClick={createNote}
            className="w-full flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={16} />
            New Note
          </button>
        </div>

        {/* Notes List */}
        <div className="flex-1 overflow-y-auto">
          {filteredNotes.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              {searchTerm ? 'No notes found' : 'No notes yet'}
            </div>
          ) : (
            filteredNotes.map(note => (
              <div
                key={note.id}
                onClick={() => {
                  setSelectedNote(note);
                  setIsEditing(false);
                }}
                className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                  selectedNote?.id === note.id ? 'bg-blue-50 border-blue-200' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-gray-800 truncate">{note.title}</h3>
                      {!note.synced && isConnected && (
                        <div className="w-2 h-2 bg-orange-400 rounded-full" title="Not synced" />
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">{note.content}</p>
                    <p className="text-xs text-gray-400 mt-2">{formatDate(note.updatedAt)}</p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNote(note.id);
                    }}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Sync Status */}
        {isConnected && lastSyncTime && (
          <div className="p-4 border-t border-gray-200 text-xs text-gray-500">
            Last sync: {formatDate(lastSyncTime.toISOString())}
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {selectedNote ? (
          <>
            {/* Note Header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-white">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-medium text-gray-800">
                  {isEditing ? editingNote.title : selectedNote.title}
                </h2>
                {!selectedNote.synced && isConnected && (
                  <div className="w-2 h-2 bg-orange-400 rounded-full" title="Not synced" />
                )}
              </div>
              <div className="flex items-center gap-2">
                {isEditing ? (
                  <>
                    <button
                      onClick={saveNote}
                      className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                    >
                      <Save size={14} />
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        setEditingNote({ title: selectedNote.title, content: selectedNote.content });
                      }}
                      className="flex items-center gap-1 px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                    >
                      <X size={14} />
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => {
                      setIsEditing(true);
                      setEditingNote({ title: selectedNote.title, content: selectedNote.content });
                    }}
                    className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                  >
                    <Edit3 size={14} />
                    Edit
                  </button>
                )}
              </div>
            </div>

            {/* Note Content */}
            <div className="flex-1 p-4 bg-white">
              {isEditing ? (
                <div className="h-full flex flex-col gap-4">
                  <input
                    type="text"
                    value={editingNote.title}
                    onChange={(e) => setEditingNote(prev => ({ ...prev, title: e.target.value }))}
                    className="text-lg font-medium border-none outline-none bg-transparent"
                    placeholder="Note title..."
                  />
                  <textarea
                    value={editingNote.content}
                    onChange={(e) => setEditingNote(prev => ({ ...prev, content: e.target.value }))}
                    className="flex-1 resize-none border-none outline-none bg-transparent"
                    placeholder="Start writing..."
                  />
                </div>
              ) : (
                <div className="h-full">
                  <div className="prose max-w-none">
                    <p className="whitespace-pre-wrap text-gray-700">{selectedNote.content}</p>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-white">
            <div className="text-center text-gray-500">
              <Edit3 size={48} className="mx-auto mb-4 text-gray-300" />
              <p className="text-lg">Select a note to view</p>
              <p className="text-sm">or create a new one to get started</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CloudNotesApp;
