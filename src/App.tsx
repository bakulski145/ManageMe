import { useState, useEffect, type FormEvent } from 'react';
import './App.css'
import { ProjectService, type Project } from './api/ProjectService'
import { UserService, type User } from './api/UserService';
import { StoryService, type Story, type Priority, type Status } from './api/StoryService';
import { TaskService, type Task } from './api/TaskService';

function App() {
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

  // ZADANIA (TASKS) STATE
  const [activeStory, setActiveStory] = useState<Story | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskNazwa, setTaskNazwa] = useState('');
  const [taskOpis, setTaskOpis] = useState('');
  const [taskPriorytet, setTaskPriorytet] = useState<Priority>('niski');
  const [taskCzas, setTaskCzas] = useState<number>(1);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  useEffect(() => {
    loadProjects();
    setCurrentUser(UserService.getLoggedUser());
    setUsers(UserService.getAllUsers());
  }, []);

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

  // Logika sprawdzająca czy zaktualizować status historyjki
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

  // --- HANDLERY PROJEKTÓW ---
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

  // --- HANDLERY HISTORYJEK ---
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

  // --- HANDLERY ZADAŃ ---
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

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #ccc', paddingBottom: '10px', marginBottom: '20px' }}>
        <h1>ManageMe</h1>
        {currentUser && (
          <p>Zalogowany: <strong>{currentUser.imie} {currentUser.nazwisko} ({currentUser.rola})</strong></p>
        )}
      </header>

      {/* WIDOK 1: Lista Projektów */}
      {!activeProject ? (
        <div>
          <h2>Lista Projektów</h2>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '30px' }}>
            <input type="text" placeholder="Nazwa projektu" value={nazwa} onChange={(e) => setNazwa(e.target.value)} />
            <textarea placeholder="Opis projektu" value={opis} onChange={(e) => setOpis(e.target.value)} rows={3} />
            <button type="submit">{editingId ? 'Zapisz zmiany' : 'Dodaj projekt'}</button>
            {editingId && <button type="button" onClick={() => { setEditingId(null); setNazwa(''); setOpis(''); }}>Anuluj</button>}
          </form>

          <div>
            {projects.length === 0 ? <p>Brak projektów. Dodaj pierwszy!</p> : null}
            {projects.map(project => (
              <div key={project.id} style={{ border: '1px solid #ccc', padding: '10px', marginBottom: '10px', borderRadius: '5px' }}>
                <h3>{project.nazwa}</h3>
                <p>{project.opis}</p>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => setActiveProject(project)} style={{ backgroundColor: '#646cff', color: 'white' }}>Wybierz projekt</button>
                  <button onClick={() => handleEdit(project)}>Edytuj</button>
                  <button onClick={() => handleDelete(project.id)} style={{ color: 'red' }}>Usuń</button>
                </div>
              </div>
            ))}
          </div>
        </div>

      ) : !activeStory ? (
        // WIDOK 2: Tablica Historyjek w Projekcie
        <div>
          <button onClick={() => setActiveProject(null)}>⬅ Powrót do projektów</button>
          <h2>Projekt: {activeProject.nazwa}</h2>
          <hr />
          <h3>Dodaj Historyjkę</h3>
          <form onSubmit={handleStorySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '30px' }}>
            <input type="text" placeholder="Nazwa historyjki" value={storyNazwa} onChange={(e) => setStoryNazwa(e.target.value)} />
            <textarea placeholder="Opis historyjki" value={storyOpis} onChange={(e) => setStoryOpis(e.target.value)} rows={2} />
            <select value={storyPriorytet} onChange={(e) => setStoryPriorytet(e.target.value as Priority)}>
              <option value="niski">Niski</option><option value="średni">Średni</option><option value="wysoki">Wysoki</option>
            </select>
            <button type="submit" style={{ backgroundColor: 'green', color: 'white' }}>{editingStoryId ? 'Zapisz' : 'Dodaj'}</button>
            {editingStoryId && <button type="button" onClick={() => { setEditingStoryId(null); setStoryNazwa(''); setStoryOpis(''); }}>Anuluj</button>}
          </form>

          <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
            {['todo', 'doing', 'done'].map((stan) => (
              <div key={stan} style={{ flex: 1, backgroundColor: '#333', padding: '10px', borderRadius: '8px' }}>
                <h4>{stan.toUpperCase()}</h4>
                {stories.filter(s => s.stan === stan).map(story => (
                  <div key={story.id} style={{ backgroundColor: '#444', padding: '10px', marginBottom: '10px', borderRadius: '5px', opacity: stan === 'done' ? 0.7 : 1 }}>
                    <h5 style={{ textDecoration: stan === 'done' ? 'line-through' : 'none' }}>{story.nazwa} ({story.priorytet})</h5>
                    <p style={{ fontSize: '14px' }}>{story.opis}</p>
                    <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginTop: '10px' }}>
                      <button onClick={() => setActiveStory(story)} style={{ backgroundColor: '#007BFF', color: 'white', fontSize: '12px', width: '100%' }}>
                        Zarządzaj zadaniami
                      </button>
                      <button onClick={() => handleEditStory(story)} style={{ fontSize: '12px' }}>Edytuj</button>
                      <button onClick={() => handleDeleteStory(story.id)} style={{ fontSize: '12px', color: 'red' }}>Usuń</button>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

      ) : (
        // WIDOK 3: Tablica Zadań (Tasków) w Historyjce
        <div>
          <button onClick={() => { setActiveStory(null); loadStories(); }}>⬅ Powrót do historyjek</button>
          <h2>Historyjka: {activeStory.nazwa} <span style={{ fontSize: '14px', color: '#aaa' }}>({activeStory.stan.toUpperCase()})</span></h2>
          <p>{activeStory.opis}</p>
          <hr />

          <h3>Dodaj Zadanie</h3>
          <form onSubmit={handleTaskSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '30px' }}>
            <input type="text" placeholder="Nazwa zadania" value={taskNazwa} onChange={(e) => setTaskNazwa(e.target.value)} />
            <textarea placeholder="Opis zadania" value={taskOpis} onChange={(e) => setTaskOpis(e.target.value)} rows={2} />
            <select value={taskPriorytet} onChange={(e) => setTaskPriorytet(e.target.value as Priority)}>
              <option value="niski">Niski</option><option value="średni">Średni</option><option value="wysoki">Wysoki</option>
            </select>
            <input type="number" min="1" placeholder="Przewidywany czas (h)" value={taskCzas} onChange={(e) => setTaskCzas(Number(e.target.value))} />
            <button type="submit" style={{ backgroundColor: 'purple', color: 'white' }}>{editingTaskId ? 'Zapisz' : 'Dodaj zadanie'}</button>
            {editingTaskId && <button type="button" onClick={() => { setEditingTaskId(null); setTaskNazwa(''); setTaskOpis(''); setTaskCzas(1); }}>Anuluj</button>}
          </form>

          <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
            {/* TODO KOLUMNA */}
            <div style={{ flex: 1, backgroundColor: '#333', padding: '10px', borderRadius: '8px' }}>
              <h4>TODO</h4>
              {tasks.filter(t => t.stan === 'todo').map(task => (
                <div key={task.id} style={{ backgroundColor: '#444', padding: '10px', marginBottom: '10px', borderRadius: '5px' }}>
                  <h5>{task.nazwa} ({task.przewidywanyCzas}h)</h5>
                  <p style={{ fontSize: '14px' }}>{task.opis}</p>
                  
                  <div style={{ marginBottom: '10px' }}>
                    <select onChange={(e) => handleAssignTask(task.id, e.target.value)} defaultValue="">
                      <option value="" disabled>Przypisz osobę (Start)</option>
                      {users.filter(u => u.rola === 'devops' || u.rola === 'developer').map(u => (
                        <option key={u.id} value={u.id}>{u.imie} {u.nazwisko} ({u.rola})</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: 'flex', gap: '5px' }}>
                    <button onClick={() => handleEditTask(task)} style={{ fontSize: '12px' }}>Edytuj</button>
                    <button onClick={() => handleDeleteTask(task.id)} style={{ fontSize: '12px', color: 'red' }}>Usuń</button>
                  </div>
                </div>
              ))}
            </div>

            {/* DOING KOLUMNA */}
            <div style={{ flex: 1, backgroundColor: '#333', padding: '10px', borderRadius: '8px' }}>
              <h4>DOING</h4>
              {tasks.filter(t => t.stan === 'doing').map(task => (
                <div key={task.id} style={{ backgroundColor: '#444', padding: '10px', marginBottom: '10px', borderRadius: '5px', borderLeft: '4px solid orange' }}>
                  <h5>{task.nazwa}</h5>
                  <p style={{ fontSize: '12px', margin: 0 }}>Wykonywane przez: <strong>{getUserName(task.przypisanyUzytkownikId!)}</strong></p>
                  <p style={{ fontSize: '12px', color: '#aaa' }}>Start: {new Date(task.dataStartu!).toLocaleString()}</p>
                  
                  <div style={{ display: 'flex', gap: '5px', marginTop: '10px' }}>
                    <button onClick={() => handleChangeTaskStatus(task.id, 'done')} style={{ fontSize: '12px', backgroundColor: 'green', color: 'white' }}>Zakończ Zadanie</button>
                  </div>
                </div>
              ))}
            </div>

            {/* DONE KOLUMNA */}
            <div style={{ flex: 1, backgroundColor: '#333', padding: '10px', borderRadius: '8px' }}>
              <h4>DONE</h4>
              {tasks.filter(t => t.stan === 'done').map(task => (
                <div key={task.id} style={{ backgroundColor: '#444', padding: '10px', marginBottom: '10px', borderRadius: '5px', opacity: 0.7, borderLeft: '4px solid green' }}>
                  <h5 style={{ textDecoration: 'line-through' }}>{task.nazwa}</h5>
                  <p style={{ fontSize: '12px', margin: 0 }}>Wykonane przez: <strong>{getUserName(task.przypisanyUzytkownikId!)}</strong></p>
                  <p style={{ fontSize: '12px', color: '#aaa' }}>Zakończono: {new Date(task.dataZakonczenia!).toLocaleString()}</p>
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