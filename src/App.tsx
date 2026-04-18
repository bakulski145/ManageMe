import { useState, useEffect, type FormEvent } from 'react';
import './App.css'
import { ProjectService,type Project } from './api/ProjectService'
import { UserService, type User } from './api/UserService';
import { StoryService, type Story, type Priority, type Status } from './api/StoryService';

function App() {
const [projects, setProjects] = useState<Project[]>([]);
const [nazwa, setNazwa] = useState('');
const [opis, setOpis] = useState('');
const [editingId, setEditingId] = useState<string | null>(null);

const [currentUser, setCurrentUser] = useState<User | null>(null);
const [activeProject, setActiveProject] = useState<Project | null>(null);

const [stories, setStories] = useState<Story[]>([]);
const [storyNazwa, setStoryNazwa] = useState('');
const [storyOpis, setStoryOpis] = useState('');
const [storyPriorytet, setStoryPriorytet] = useState<Priority>('niski');
const [editingStoryId, setEditingStoryId] = useState<string | null>(null);

useEffect(() => {
    loadProjects();
    setCurrentUser(UserService.getLoggedUser());
  }, []);

useEffect(() => {
    if (activeProject) {
      loadStories();
    }
  }, [activeProject]);

  const loadStories = async () => {
    if (!activeProject) return;
    const data = await StoryService.getByProject(activeProject.id);
    setStories(data);
  };

const loadProjects = async () => {
  const data = await ProjectService.getAll();
  setProjects(data);
}

const handleSubmit = async (e: FormEvent) => {
  e.preventDefault();
  if(!nazwa.trim() || !opis.trim()) return;
if (editingId) {
      await ProjectService.update(editingId, { nazwa, opis });
      setEditingId(null);
    } else {
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

  const handleEdit = (project: Project) => {
    setEditingId(project.id);
    setNazwa(project.nazwa);
    setOpis(project.opis);
  };

  const handleStorySubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!storyNazwa.trim() || !storyOpis.trim() || !activeProject || !currentUser) return;

    if (editingStoryId) {
      await StoryService.update(editingStoryId, { nazwa: storyNazwa, opis: storyOpis, priorytet: storyPriorytet });
      setEditingStoryId(null);
    } else {
      await StoryService.create({
        nazwa: storyNazwa,
        opis: storyOpis,
        priorytet: storyPriorytet,
        projektId: activeProject.id,
        stan: 'todo',
        wlascicielId: currentUser.id
      });
    }

    setStoryNazwa('');
    setStoryOpis('');
    setStoryPriorytet('niski');
    await loadStories();
  };

  const handleDeleteStory = async (id: string) => {
    await StoryService.delete(id);
    await loadStories();
  };

  const handleEditStory = (story: Story) => {
    setEditingStoryId(story.id);
    setStoryNazwa(story.nazwa);
    setStoryOpis(story.opis);
    setStoryPriorytet(story.priorytet);
  };

  const handleChangeStatus = async (id: string, nowyStan: Status) => {
    await StoryService.update(id, { stan: nowyStan });
    await loadStories();
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
    <header style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #ccc', paddingBottom: '10px', marginBottom: '20px' }}>
        <h1>ManageMe</h1>
        {currentUser && (
          <p>Zalogowany: <strong>{currentUser.imie} {currentUser.nazwisko}</strong></p>
        )}
      </header>
{!activeProject ? (
    //widok 1
        <div>
          <h2>Lista Projektów</h2>
          
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
          
          <div>
            {projects.length === 0 ? <p>Brak projektów. Dodaj pierwszy!</p> : null}
            {projects.map(project => (
              <div key={project.id} style={{ border: '1px solid #ccc', padding: '10px', marginBottom: '10px', borderRadius: '5px' }}>
                <h3>{project.nazwa}</h3>
                <p>{project.opis}</p>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => setActiveProject(project)} style={{ backgroundColor: '#646cff', color: 'white' }}>
                    Wybierz projekt
                  </button>
                  <button onClick={() => handleEdit(project)}>Edytuj</button>
                  <button onClick={() => handleDelete(project.id)} style={{ color: 'red' }}>Usuń</button>
                </div>
              </div>
            ))}
          </div>
        </div>

      ) : (
        //widok 2
        <div>
          <button onClick={() => setActiveProject(null)}>⬅ Powrót do listy projektów</button>
          <h2>Projekt: {activeProject.nazwa}</h2>
          <p>{activeProject.opis}</p>
          
          <hr />
          
          <h3>Dodaj / Edytuj Historyjkę</h3>
          <form onSubmit={handleStorySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '30px' }}>
            <input 
              type="text" 
              placeholder="Nazwa historyjki" 
              value={storyNazwa} 
              onChange={(e) => setStoryNazwa(e.target.value)} 
            />
            <textarea 
              placeholder="Opis historyjki" 
              value={storyOpis} 
              onChange={(e) => setStoryOpis(e.target.value)} 
              rows={2}
            />
            <select value={storyPriorytet} onChange={(e) => setStoryPriorytet(e.target.value as Priority)}>
              <option value="niski">Priorytet: Niski</option>
              <option value="średni">Priorytet: Średni</option>
              <option value="wysoki">Priorytet: Wysoki</option>
            </select>
            <button type="submit" style={{ backgroundColor: 'green', color: 'white' }}>
              {editingStoryId ? 'Zapisz zmiany w historyjce' : 'Dodaj historyjkę'}
            </button>
            {editingStoryId && (
              <button type="button" onClick={() => { setEditingStoryId(null); setStoryNazwa(''); setStoryOpis(''); setStoryPriorytet('niski'); }}>
                Anuluj edycję
              </button>
            )}
          </form>

          <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
            
            <div style={{ flex: 1, backgroundColor: '#333', padding: '10px', borderRadius: '8px' }}>
              <h4>Do zrobienia (TODO)</h4>
              {stories.filter(s => s.stan === 'todo').map(story => (
                <div key={story.id} style={{ backgroundColor: '#444', padding: '10px', marginBottom: '10px', borderRadius: '5px' }}>
                  <h5>{story.nazwa} <span style={{fontSize: '12px', color: '#aaa'}}>({story.priorytet})</span></h5>
                  <p style={{fontSize: '14px'}}>{story.opis}</p>
                  <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                    <button onClick={() => handleChangeStatus(story.id, 'doing')} style={{fontSize: '12px'}}>➔ DOING</button>
                    <button onClick={() => handleEditStory(story)} style={{fontSize: '12px'}}>Edytuj</button>
                    <button onClick={() => handleDeleteStory(story.id)} style={{fontSize: '12px', color: 'red'}}>Usuń</button>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ flex: 1, backgroundColor: '#333', padding: '10px', borderRadius: '8px' }}>
              <h4>W trakcie (DOING)</h4>
              {stories.filter(s => s.stan === 'doing').map(story => (
                <div key={story.id} style={{ backgroundColor: '#444', padding: '10px', marginBottom: '10px', borderRadius: '5px' }}>
                  <h5>{story.nazwa} <span style={{fontSize: '12px', color: '#aaa'}}>({story.priorytet})</span></h5>
                  <p style={{fontSize: '14px'}}>{story.opis}</p>
                  <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                    <button onClick={() => handleChangeStatus(story.id, 'todo')} style={{fontSize: '12px'}}>⬅ TODO</button>
                    <button onClick={() => handleChangeStatus(story.id, 'done')} style={{fontSize: '12px'}}>➔ DONE</button>
                    <button onClick={() => handleEditStory(story)} style={{fontSize: '12px'}}>Edytuj</button>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ flex: 1, backgroundColor: '#333', padding: '10px', borderRadius: '8px' }}>
              <h4>Zakończone (DONE)</h4>
              {stories.filter(s => s.stan === 'done').map(story => (
                <div key={story.id} style={{ backgroundColor: '#444', padding: '10px', marginBottom: '10px', borderRadius: '5px', opacity: 0.7 }}>
                  <h5 style={{ textDecoration: 'line-through' }}>{story.nazwa}</h5>
                  <p style={{fontSize: '14px'}}>{story.opis}</p>
                  <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                    <button onClick={() => handleChangeStatus(story.id, 'doing')} style={{fontSize: '12px'}}>⬅ DOING</button>
                    <button onClick={() => handleDeleteStory(story.id)} style={{fontSize: '12px', color: 'red'}}>Usuń</button>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>

      )}
      
    </div>
  );
}

export default App;
