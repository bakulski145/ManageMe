import { useState, useEffect, type FormEvent } from 'react';
import { ProjectService, type Project } from './api/ProjectService'
import { UserService, type User } from './api/UserService';
import { StoryService, type Story, type Priority, type Status } from './api/StoryService';
import { TaskService, type Task } from './api/TaskService';

function App() {
  // --- ZARZĄDZANIE MOTYWEM (DARK/LIGHT MODE) ---
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  const [projects, setProjects] = useState<Project[]>([]);
  const [nazwa, setNazwa] = useState('');
  const [opis, setOpis] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);

  const [stories, setStories] = useState<Story[]>([]);
  const [storyNazwa, setStoryNazwa] = useState('');
  const [storyOpis, setStoryOpis] = useState('');
  const [storyPriorytet, setStoryPriorytet] = useState<Priority>('niski');
  const [editingStoryId, setEditingStoryId] = useState<string | null>(null);

  const [activeStory, setActiveStory] = useState<Story | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskNazwa, setTaskNazwa] = useState('');
  const [taskOpis, setTaskOpis] = useState('');
  const [taskPriorytet, setTaskPriorytet] = useState<Priority>('niski');
  const [taskCzas, setTaskCzas] = useState<number>(1);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  // Inicjalizacja przy starcie aplikacji
  useEffect(() => {
    loadProjects();
    setCurrentUser(UserService.getLoggedUser());
    setUsers(UserService.getAllUsers());
    
    // Wczytanie motywu z localStorage
    const savedTheme = localStorage.getItem('manageme_theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      setTheme(savedTheme);
    }
  }, []);

  // Aktualizacja atrybutu w HTML i zapis w localStorage przy każdej zmianie
  useEffect(() => {
    document.documentElement.setAttribute('data-bs-theme', theme);
    localStorage.setItem('manageme_theme', theme);
  }, [theme]);

  useEffect(() => {
    if (activeProject) {
      loadStories();
    }
  }, [activeProject]);

  useEffect(() => {
    if (activeStory) {
      loadTasks();
    }
  }, [activeStory]);

  const loadProjects = async () => {
    const data = await ProjectService.getAll();
    setProjects(data);
  }

  const loadStories = async () => {
    if (!activeProject) return;
    const data = await StoryService.getByProject(activeProject.id);
    setStories(data);
  };

  const loadTasks = async () => {
    if (!activeStory) return;
    const data = await TaskService.getByStory(activeStory.id);
    setTasks(data);
  };

  const updateStoryStatusIfNeeded = async (storyId: string) => {
    const storyTasks = await TaskService.getByStory(storyId);
    const story = stories.find(s => s.id === storyId) || await StoryService.getAll().then(res => res.find(s => s.id === storyId));
    if (!story) return;

    const allDone = storyTasks.length > 0 && storyTasks.every(t => t.stan === 'done');
    const anyDoing = storyTasks.some(t => t.stan === 'doing' || t.stan === 'done');

    if (allDone && story.stan !== 'done') {
      await StoryService.update(storyId, { stan: 'done' });
      await loadStories();
    } else if (!allDone && anyDoing && story.stan === 'todo') {
      await StoryService.update(storyId, { stan: 'doing' });
      await loadStories();
    } else if (storyTasks.length > 0 && storyTasks.every(t => t.stan === 'todo') && story.stan !== 'todo') {
      await StoryService.update(storyId, { stan: 'todo' });
      await loadStories();
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!nazwa.trim() || !opis.trim()) return;
    if (editingId) {
      await ProjectService.update(editingId, { nazwa, opis });
      setEditingId(null);
    } else {
      await ProjectService.create({ nazwa, opis });
    }
    setNazwa(''); setOpis(''); await loadProjects();
  };

  const handleDelete = async (id: string) => {
    await ProjectService.delete(id); await loadProjects();
  };

  const handleEdit = (project: Project) => {
    setEditingId(project.id); setNazwa(project.nazwa); setOpis(project.opis);
  };

  const handleStorySubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!storyNazwa.trim() || !storyOpis.trim() || !activeProject || !currentUser) return;
    if (editingStoryId) {
      await StoryService.update(editingStoryId, { nazwa: storyNazwa, opis: storyOpis, priorytet: storyPriorytet });
      setEditingStoryId(null);
    } else {
      await StoryService.create({
        nazwa: storyNazwa, opis: storyOpis, priorytet: storyPriorytet, projektId: activeProject.id, stan: 'todo', wlascicielId: currentUser.id
      });
    }
    setStoryNazwa(''); setStoryOpis(''); setStoryPriorytet('niski'); await loadStories();
  };

  const handleDeleteStory = async (id: string) => {
    await StoryService.delete(id); await loadStories();
  };

  const handleEditStory = (story: Story) => {
    setEditingStoryId(story.id); setStoryNazwa(story.nazwa); setStoryOpis(story.opis); setStoryPriorytet(story.priorytet);
  };

  const handleTaskSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!taskNazwa.trim() || !taskOpis.trim() || !activeStory) return;
    if (editingTaskId) {
      await TaskService.update(editingTaskId, { nazwa: taskNazwa, opis: taskOpis, priorytet: taskPriorytet, przewidywanyCzas: taskCzas });
      setEditingTaskId(null);
    } else {
      await TaskService.create({
        nazwa: taskNazwa, opis: taskOpis, priorytet: taskPriorytet, przewidywanyCzas: taskCzas, storyId: activeStory.id
      });
    }
    setTaskNazwa(''); setTaskOpis(''); setTaskPriorytet('niski'); setTaskCzas(1);
    await loadTasks();
    await updateStoryStatusIfNeeded(activeStory.id);
  };

  const handleAssignTask = async (taskId: string, userId: string) => {
    if (!userId) return;
    await TaskService.update(taskId, {
      przypisanyUzytkownikId: userId,
      stan: 'doing',
      dataStartu: new Date().toISOString()
    });
    await loadTasks();
    await updateStoryStatusIfNeeded(activeStory!.id);
  };

  const handleChangeTaskStatus = async (taskId: string, nowyStan: Status) => {
    const updates: Partial<Task> = { stan: nowyStan };
    if (nowyStan === 'done') {
      updates.dataZakonczenia = new Date().toISOString();
    }
    await TaskService.update(taskId, updates);
    await loadTasks();
    await updateStoryStatusIfNeeded(activeStory!.id);
  };

  const handleDeleteTask = async (id: string) => {
    await TaskService.delete(id);
    await loadTasks();
    await updateStoryStatusIfNeeded(activeStory!.id);
  };

  const handleEditTask = (task: Task) => {
    setEditingTaskId(task.id); setTaskNazwa(task.nazwa); setTaskOpis(task.opis);
    setTaskPriorytet(task.priorytet); setTaskCzas(task.przewidywanyCzas);
  };

  const getUserName = (id: string) => {
    const u = users.find(user => user.id === id);
    return u ? `${u.imie} ${u.nazwisko} (${u.rola})` : 'Nieznany';
  };

  const getPriorityBadgeClass = (priority: Priority) => {
    if (priority === 'wysoki') return 'bg-danger';
    if (priority === 'średni') return 'bg-warning text-dark';
    return 'bg-success';
  };

  return (
    <div className="container py-4">
      <header className="d-flex justify-content-between align-items-center border-bottom pb-3 mb-4">
        <h1 className="h3 mb-0 text-primary">ManageMe</h1>
        
        <div className="d-flex align-items-center gap-3">
          {/* PRZYCISK ZMIANY MOTYWU */}
          <button 
            className={`btn btn-sm ${theme === 'light' ? 'btn-dark' : 'btn-light'}`}
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          >
            {theme === 'light' ? '🌙 Ciemny' : '☀️ Jasny'}
          </button>

          {currentUser && (
            <div className="text-muted d-none d-md-block">
              Zalogowany: <strong className="fw-bold text-body">{currentUser.imie} {currentUser.nazwisko} ({currentUser.rola})</strong>
            </div>
          )}
        </div>
      </header>

      {/* WIDOK 1: Lista Projektów */}
      {!activeProject ? (
        <div className="row justify-content-center">
          <div className="col-md-8">
            <h2 className="h4 mb-3">Lista Projektów</h2>
            <div className="card shadow-sm mb-4 bg-body-tertiary border-0">
              <div className="card-body">
                <form onSubmit={handleSubmit}>
                  <div className="mb-3">
                    <input type="text" className="form-control" placeholder="Nazwa projektu" value={nazwa} onChange={(e) => setNazwa(e.target.value)} />
                  </div>
                  <div className="mb-3">
                    <textarea className="form-control" placeholder="Opis projektu" value={opis} onChange={(e) => setOpis(e.target.value)} rows={3} />
                  </div>
                  <div className="d-flex gap-2">
                    <button type="submit" className="btn btn-primary">{editingId ? 'Zapisz zmiany' : 'Dodaj projekt'}</button>
                    {editingId && <button type="button" className="btn btn-outline-secondary" onClick={() => { setEditingId(null); setNazwa(''); setOpis(''); }}>Anuluj</button>}
                  </div>
                </form>
              </div>
            </div>

            {projects.length === 0 ? (
              <div className="alert alert-info">Brak projektów. Dodaj pierwszy!</div>
            ) : (
              <ul className="list-group shadow-sm">
                {projects.map(project => (
                  <li key={project.id} className="list-group-item d-flex justify-content-between align-items-start p-3 bg-body-tertiary">
                    <div className="ms-2 me-auto">
                      <div className="fw-bold fs-5">{project.nazwa}</div>
                      <span className="text-muted">{project.opis}</span>
                    </div>
                    <div className="d-flex gap-2 align-items-center mt-2 mt-md-0">
                      <button className="btn btn-sm btn-success" onClick={() => setActiveProject(project)}>Wybierz projekt</button>
                      <button className="btn btn-sm btn-outline-secondary" onClick={() => handleEdit(project)}>Edytuj</button>
                      <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(project.id)}>Usuń</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

      ) : !activeStory ? (
        // WIDOK 2: Tablica Historyjek w Projekcie
        <div>
          <button className="btn btn-link text-decoration-none ps-0 mb-3" onClick={() => setActiveProject(null)}>⬅ Powrót do projektów</button>
          <div className="alert alert-primary shadow-sm mb-4">
            <h2 className="alert-heading h4">Projekt: {activeProject.nazwa}</h2>
            <p className="mb-0">{activeProject.opis}</p>
          </div>

          <div className="card shadow-sm mb-4 bg-body-tertiary border-0" style={{ maxWidth: '600px' }}>
            <div className="card-header bg-transparent fw-bold">Dodaj Historyjkę</div>
            <div className="card-body">
              <form onSubmit={handleStorySubmit}>
                <div className="mb-2"><input type="text" className="form-control form-control-sm" placeholder="Nazwa historyjki" value={storyNazwa} onChange={(e) => setStoryNazwa(e.target.value)} /></div>
                <div className="mb-2"><textarea className="form-control form-control-sm" placeholder="Opis historyjki" value={storyOpis} onChange={(e) => setStoryOpis(e.target.value)} rows={2} /></div>
                <div className="mb-3">
                  <select className="form-select form-select-sm" value={storyPriorytet} onChange={(e) => setStoryPriorytet(e.target.value as Priority)}>
                    <option value="niski">Niski</option><option value="średni">Średni</option><option value="wysoki">Wysoki</option>
                  </select>
                </div>
                <div className="d-flex gap-2">
                  <button type="submit" className="btn btn-sm btn-success">{editingStoryId ? 'Zapisz' : 'Dodaj'}</button>
                  {editingStoryId && <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => { setEditingStoryId(null); setStoryNazwa(''); setStoryOpis(''); }}>Anuluj</button>}
                </div>
              </form>
            </div>
          </div>

          <div className="row g-3">
            {['todo', 'doing', 'done'].map((stan) => (
              <div key={stan} className="col-12 col-md-4">
                <div className="bg-body-tertiary p-3 rounded shadow-sm h-100 border">
                  <h4 className="h6 text-uppercase fw-bold mb-3 border-bottom pb-2">{stan}</h4>
                  {stories.filter(s => s.stan === stan).map(story => (
                    <div key={story.id} className={`card mb-2 border-0 shadow-sm ${stan === 'done' ? 'opacity-75' : ''}`}>
                      <div className="card-body p-2">
                        <h6 className={`card-title d-flex justify-content-between align-items-center mb-1 ${stan === 'done' ? 'text-decoration-line-through' : ''}`}>
                          {story.nazwa}
                          <span className={`badge ${getPriorityBadgeClass(story.priorytet)}`}>{story.priorytet}</span>
                        </h6>
                        <p className="card-text small text-muted mb-3">{story.opis}</p>
                        <div className="d-flex flex-column gap-2">
                          <button className="btn btn-sm btn-primary w-100" onClick={() => setActiveStory(story)}>Zarządzaj zadaniami</button>
                          <div className="d-flex justify-content-between">
                            <button className="btn btn-xs btn-outline-secondary" style={{ fontSize: '0.75rem' }} onClick={() => handleEditStory(story)}>Edytuj</button>
                            <button className="btn btn-xs btn-outline-danger" style={{ fontSize: '0.75rem' }} onClick={() => handleDeleteStory(story.id)}>Usuń</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

      ) : (
        // WIDOK 3: Tablica Zadań (Tasków) w Historyjce
        <div>
          <button className="btn btn-link text-decoration-none ps-0 mb-3" onClick={() => { setActiveStory(null); loadStories(); }}>⬅ Powrót do historyjek</button>
          <div className="alert alert-info shadow-sm mb-4">
            <h2 className="alert-heading h4">Historyjka: {activeStory.nazwa} <span className="badge bg-secondary ms-2">{activeStory.stan.toUpperCase()}</span></h2>
            <p className="mb-0">{activeStory.opis}</p>
          </div>

          <div className="card shadow-sm mb-4 bg-body-tertiary border-0" style={{ maxWidth: '600px' }}>
            <div className="card-header bg-transparent fw-bold">Dodaj Zadanie</div>
            <div className="card-body">
              <form onSubmit={handleTaskSubmit}>
                <div className="mb-2"><input type="text" className="form-control form-control-sm" placeholder="Nazwa zadania" value={taskNazwa} onChange={(e) => setTaskNazwa(e.target.value)} /></div>
                <div className="mb-2"><textarea className="form-control form-control-sm" placeholder="Opis zadania" value={taskOpis} onChange={(e) => setTaskOpis(e.target.value)} rows={2} /></div>
                <div className="row mb-3">
                  <div className="col">
                    <select className="form-select form-select-sm" value={taskPriorytet} onChange={(e) => setTaskPriorytet(e.target.value as Priority)}>
                      <option value="niski">Niski</option><option value="średni">Średni</option><option value="wysoki">Wysoki</option>
                    </select>
                  </div>
                  <div className="col">
                    <input type="number" className="form-control form-control-sm" min="1" placeholder="Czas (h)" value={taskCzas} onChange={(e) => setTaskCzas(Number(e.target.value))} />
                  </div>
                </div>
                <div className="d-flex gap-2">
                  <button type="submit" className="btn btn-sm btn-secondary" style={{ backgroundColor: 'purple', borderColor: 'purple', color: 'white' }}>{editingTaskId ? 'Zapisz' : 'Dodaj zadanie'}</button>
                  {editingTaskId && <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => { setEditingTaskId(null); setTaskNazwa(''); setTaskOpis(''); setTaskCzas(1); }}>Anuluj</button>}
                </div>
              </form>
            </div>
          </div>

          <div className="row g-3">
            {/* TODO KOLUMNA */}
            <div className="col-12 col-md-4">
              <div className="bg-body-tertiary p-3 rounded shadow-sm h-100 border">
                <h4 className="h6 text-uppercase fw-bold mb-3 border-bottom pb-2">TODO</h4>
                {tasks.filter(t => t.stan === 'todo').map(task => (
                  <div key={task.id} className="card mb-2 border-0 shadow-sm">
                    <div className="card-body p-2">
                      <h6 className="card-title mb-1">{task.nazwa} <span className="badge bg-secondary ms-1">{task.przewidywanyCzas}h</span></h6>
                      <p className="card-text small text-muted mb-2">{task.opis}</p>
                      <div className="mb-2">
                        <select className="form-select form-select-sm" onChange={(e) => handleAssignTask(task.id, e.target.value)} defaultValue="">
                          <option value="" disabled>Przypisz (Start)</option>
                          {users.filter(u => u.rola === 'devops' || u.rola === 'developer').map(u => (
                            <option key={u.id} value={u.id}>{u.imie} {u.nazwisko} ({u.rola})</option>
                          ))}
                        </select>
                      </div>
                      <div className="d-flex gap-1">
                        <button className="btn btn-xs btn-outline-secondary" style={{ fontSize: '0.75rem' }} onClick={() => handleEditTask(task)}>Edytuj</button>
                        <button className="btn btn-xs btn-outline-danger" style={{ fontSize: '0.75rem' }} onClick={() => handleDeleteTask(task.id)}>Usuń</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* DOING KOLUMNA */}
            <div className="col-12 col-md-4">
              <div className="bg-body-tertiary p-3 rounded shadow-sm h-100 border border-warning border-opacity-50">
                <h4 className="h6 text-uppercase fw-bold mb-3 border-bottom pb-2">DOING</h4>
                {tasks.filter(t => t.stan === 'doing').map(task => (
                  <div key={task.id} className="card mb-2 border-0 shadow-sm border-start border-warning border-4">
                    <div className="card-body p-2">
                      <h6 className="card-title mb-2">{task.nazwa}</h6>
                      <p className="small mb-0">Wykonuje: <strong className="text-body">{getUserName(task.przypisanyUzytkownikId!)}</strong></p>
                      <p className="small text-muted mb-2">Start: {new Date(task.dataStartu!).toLocaleString()}</p>
                      <button className="btn btn-sm btn-success w-100 mt-1" onClick={() => handleChangeTaskStatus(task.id, 'done')}>Zakończ Zadanie</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* DONE KOLUMNA */}
            <div className="col-12 col-md-4">
              <div className="bg-body-tertiary p-3 rounded shadow-sm h-100 border border-success border-opacity-25">
                <h4 className="h6 text-uppercase fw-bold mb-3 border-bottom pb-2">DONE</h4>
                {tasks.filter(t => t.stan === 'done').map(task => (
                  <div key={task.id} className="card mb-2 border-0 shadow-sm border-start border-success border-4 opacity-75">
                    <div className="card-body p-2">
                      <h6 className="card-title mb-2 text-decoration-line-through">{task.nazwa}</h6>
                      <p className="small mb-0">Wykonał: <strong className="text-body">{getUserName(task.przypisanyUzytkownikId!)}</strong></p>
                      <p className="small text-muted mb-0">Koniec: {new Date(task.dataZakonczenia!).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;