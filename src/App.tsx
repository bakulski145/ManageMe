import { useState, useEffect, type FormEvent } from 'react';
import './App.css'
import { ProjectService,type Project } from './api/ProjectService'

function App() {
const [projects, setProjects] = useState<Project[]>([]);
const [nazwa, setNazwa] = useState('');
const [opis, setOpis] = useState('');
const [editingId, setEditingId] = useState<string | null>(null);

useEffect(() => {
  loadProjects();
}, []);

const loadProjects = async () => {
  const data = await ProjectService.getAll();
  setProjects(data);
}

const handleSubmit = async (e: FormEvent) => {
  e.preventDefault();
  if(!nazwa.trim() || !opis.trim()) return;
if (editingId) {
      // UPDATE
      await ProjectService.update(editingId, { nazwa, opis });
      setEditingId(null);
    } else {
      // CREATE
      await ProjectService.create({ nazwa, opis });
    }

    setNazwa('');
    setOpis('');
    await loadProjects();
  };

  const handleDelete = async (id: string) => {
    await ProjectService.delete(id);
    await loadProjects();
  };

  // Przygotowanie formularza do edycji
  const handleEdit = (project: Project) => {
    setEditingId(project.id);
    setNazwa(project.nazwa);
    setOpis(project.opis);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h1>ManageMe - Projekty</h1>

      {/* Formularz */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '30px' }}>
        <input 
          type="text" 
          placeholder="Nazwa projektu" 
          value={nazwa} 
          onChange={(e) => setNazwa(e.target.value)} 
        />
        <textarea 
          placeholder="Opis projektu" 
          value={opis} 
          onChange={(e) => setOpis(e.target.value)} 
          rows={3}
        />
        <button type="submit">
          {editingId ? 'Zapisz zmiany' : 'Dodaj projekt'}
        </button>
        {editingId && (
          <button type="button" onClick={() => { setEditingId(null); setNazwa(''); setOpis(''); }}>
            Anuluj edycję
          </button>
        )}
      </form>

      {/* Wyświetlanie listy */}
      <div>
        {projects.length === 0 ? <p>Brak projektów. Dodaj pierwszy!</p> : null}
        {projects.map(project => (
          <div key={project.id} style={{ border: '1px solid #ccc', padding: '10px', marginBottom: '10px', borderRadius: '5px' }}>
            <h2>{project.nazwa}</h2>
            <p>{project.opis}</p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => handleEdit(project)}>Edytuj</button>
              <button onClick={() => handleDelete(project.id)} style={{ color: 'red' }}>Usuń</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
