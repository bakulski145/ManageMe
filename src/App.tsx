import { useState, useEffect, type FormEvent } from 'react';
import { ProjectService, type Project } from './api/ProjectService'
import { UserService, type User } from './api/UserService';
import { StoryService, type Story, type Priority, type Status } from './api/StoryService';
import { TaskService, type Task } from './api/TaskService';
import { NotificationService, type Notification, type NotificationPriority } from './api/NotificationService';

function App() {
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

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showToast, setShowToast] = useState<Notification | null>(null);
  
  const [isNotificationsViewActive, setIsNotificationsViewActive] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);

  useEffect(() => {
    loadProjects();
    const loggedUser = UserService.getLoggedUser();
    setCurrentUser(loggedUser);
    setUsers(UserService.getAllUsers());
    
    const savedTheme = localStorage.getItem('manageme_theme') as 'light' | 'dark' | null;
    if (savedTheme) setTheme(savedTheme);

    if (loggedUser) {
      loadNotifications(loggedUser.id);
    }
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-bs-theme', theme);
    localStorage.setItem('manageme_theme', theme);
  }, [theme]);

  useEffect(() => { if (activeProject) loadStories(); }, [activeProject]);
  useEffect(() => { if (activeStory) loadTasks(); }, [activeStory]);

  const loadNotifications = async (userId: string) => {
    const data = await NotificationService.getByRecipient(userId);
    setNotifications(data);
  };

  const notifyUser = async (recipientId: string, title: string, message: string, priority: NotificationPriority) => {
    const newNotif = await NotificationService.create({ title, message, priority, recipientId });
    
    if (currentUser && currentUser.id === recipientId) {
      await loadNotifications(currentUser.id);
      if (priority === 'medium' || priority === 'high') {
        setShowToast(newNotif);
        setTimeout(() => setShowToast(null), 5000);
      }
    }
  };

  const handleNotificationClick = async (notif: Notification) => {
    if (!notif.isRead) {
      await NotificationService.markAsRead(notif.id);
      if (currentUser) loadNotifications(currentUser.id);
    }
    setSelectedNotification(notif);
  };

  const handleMarkAsRead = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await NotificationService.markAsRead(id);
    if (currentUser) loadNotifications(currentUser.id);
  };

  const loadProjects = async () => { setProjects(await ProjectService.getAll()); }
  const loadStories = async () => { if (activeProject) setStories(await StoryService.getByProject(activeProject.id)); };
  const loadTasks = async () => { if (activeStory) setTasks(await TaskService.getByStory(activeStory.id)); };

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
      const admins = users.filter(u => u.rola === 'admin');
      for (const admin of admins) {
        await notifyUser(admin.id, 'Utworzono nowy projekt', `Został utworzony projekt o nazwie: "${nazwa}"`, 'high');
      }
    }
    setNazwa(''); setOpis(''); await loadProjects();
  };

  const handleDelete = async (id: string) => { await ProjectService.delete(id); await loadProjects(); };
  const handleEdit = (project: Project) => { setEditingId(project.id); setNazwa(project.nazwa); setOpis(project.opis); };

  const handleStorySubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!storyNazwa.trim() || !storyOpis.trim() || !activeProject || !currentUser) return;
    if (editingStoryId) {
      await StoryService.update(editingStoryId, { nazwa: storyNazwa, opis: storyOpis, priorytet: storyPriorytet });
      setEditingStoryId(null);
    } else {
      await StoryService.create({ nazwa: storyNazwa, opis: storyOpis, priorytet: storyPriorytet, projektId: activeProject.id, stan: 'todo', wlascicielId: currentUser.id });
    }
    setStoryNazwa(''); setStoryOpis(''); setStoryPriorytet('niski'); await loadStories();
  };

  const handleDeleteStory = async (id: string) => { await StoryService.delete(id); await loadStories(); };
  const handleEditStory = (story: Story) => { setEditingStoryId(story.id); setStoryNazwa(story.nazwa); setStoryOpis(story.opis); setStoryPriorytet(story.priorytet); };

  const handleTaskSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!taskNazwa.trim() || !taskOpis.trim() || !activeStory) return;
    if (editingTaskId) {
      await TaskService.update(editingTaskId, { nazwa: taskNazwa, opis: taskOpis, priorytet: taskPriorytet, przewidywanyCzas: taskCzas });
      setEditingTaskId(null);
    } else {
      await TaskService.create({ nazwa: taskNazwa, opis: taskOpis, priorytet: taskPriorytet, przewidywanyCzas: taskCzas, storyId: activeStory.id });
      await notifyUser(activeStory.wlascicielId, 'Nowe zadanie', `W historyjce "${activeStory.nazwa}" dodano zadanie "${taskNazwa}"`, 'medium');
    }
    setTaskNazwa(''); setTaskOpis(''); setTaskPriorytet('niski'); setTaskCzas(1); await loadTasks(); await updateStoryStatusIfNeeded(activeStory.id);
  };

  const handleAssignTask = async (taskId: string, userId: string) => {
    if (!userId) return;
    const task = tasks.find(t => t.id === taskId);
    await TaskService.update(taskId, { przypisanyUzytkownikId: userId, stan: 'doing', dataStartu: new Date().toISOString() });
    await loadTasks(); await updateStoryStatusIfNeeded(activeStory!.id);
    if (task) {
      await notifyUser(userId, 'Przypisanie do zadania', `Zostałeś przypisany do zadania "${task.nazwa}"`, 'high');
    }
  };

  const handleChangeTaskStatus = async (taskId: string, nowyStan: Status) => {
    const task = tasks.find(t => t.id === taskId);
    const updates: Partial<Task> = { stan: nowyStan };
    if (nowyStan === 'done') updates.dataZakonczenia = new Date().toISOString();
    await TaskService.update(taskId, updates); await loadTasks(); await updateStoryStatusIfNeeded(activeStory!.id);
    
    if (task && activeStory) {
      const prio = nowyStan === 'done' ? 'medium' : 'low';
      await notifyUser(activeStory.wlascicielId, 'Zaktualizowano zadanie', `Zadanie "${task.nazwa}" zmieniło status na: ${nowyStan.toUpperCase()}`, prio);
    }
  };

  const handleDeleteTask = async (id: string) => { 
    const task = tasks.find(t => t.id === id);
    await TaskService.delete(id); await loadTasks(); await updateStoryStatusIfNeeded(activeStory!.id); 
    if (task && activeStory) {
      await notifyUser(activeStory.wlascicielId, 'Usunięto zadanie', `Zadanie "${task.nazwa}" zostało usunięte z historyjki.`, 'medium');
    }
  };

  const handleEditTask = (task: Task) => { setEditingTaskId(task.id); setTaskNazwa(task.nazwa); setTaskOpis(task.opis); setTaskPriorytet(task.priorytet); setTaskCzas(task.przewidywanyCzas); };

  const getUserName = (id: string) => {
    const u = users.find(user => user.id === id);
    return u ? `${u.imie} ${u.nazwisko} (${u.rola})` : 'Nieznany';
  };

  const getPriorityBadgeClass = (priority: Priority) => {
    if (priority === 'wysoki') return 'bg-danger';
    if (priority === 'średni') return 'bg-warning text-dark';
    return 'bg-success';
  };
  
  const getNotifBadgeClass = (priority: NotificationPriority) => {
    if (priority === 'high') return 'bg-danger';
    if (priority === 'medium') return 'bg-warning text-dark';
    return 'bg-secondary';
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="container py-4">
      <header className="d-flex justify-content-between align-items-center border-bottom pb-3 mb-4">
        <h1 className="h3 mb-0 text-primary" style={{ cursor: 'pointer' }} onClick={() => setIsNotificationsViewActive(false)}>ManageMe</h1>
        
        <div className="d-flex align-items-center gap-3">
          <button className={`btn btn-sm ${theme === 'light' ? 'btn-dark' : 'btn-light'}`} onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
            {theme === 'light' ? 'Ciemny' : 'Jasny'}
          </button>

          {currentUser && (
            <div className="d-flex align-items-center gap-1">
               <button 
                className="btn btn-outline-secondary position-relative border-0 fs-5" 
                onClick={() => { setIsNotificationsViewActive(true); setSelectedNotification(null); }}
                title="Powiadomienia"
              >
                🔔
                {unreadCount > 0 && (
                  <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" style={{ fontSize: '0.65rem' }}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                    <span className="visually-hidden">nieprzeczytane</span>
                  </span>
                )}
              </button>
            </div>
          )}

          {currentUser && (
            <div className="text-muted d-none d-md-block ms-2">
              Zalogowany: <strong className="fw-bold text-body">{currentUser.imie} {currentUser.nazwisko} ({currentUser.rola})</strong>
            </div>
          )}
        </div>
      </header>

      {isNotificationsViewActive ? (
        
        <div className="row justify-content-center">
          <div className="col-md-8">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h2 className="h4 mb-0">Powiadomienia</h2>
              <button className="btn btn-outline-secondary btn-sm" onClick={() => { setIsNotificationsViewActive(false); setSelectedNotification(null); }}>
                Powrót
              </button>
            </div>

            {selectedNotification ? (
              <div className="card shadow-sm bg-body-tertiary">
                <div className="card-header d-flex justify-content-between align-items-center bg-transparent py-3">
                   <h5 className="mb-0">{selectedNotification.title}</h5>
                   <span className={`badge ${getNotifBadgeClass(selectedNotification.priority)}`}>{selectedNotification.priority.toUpperCase()}</span>
                </div>
                <div className="card-body">
                   <p className="fs-5">{selectedNotification.message}</p>
                   <hr />
                   <small className="text-muted">Data otrzymania: {new Date(selectedNotification.date).toLocaleString()}</small>
                </div>
                <div className="card-footer bg-transparent py-3">
                   <button className="btn btn-secondary btn-sm" onClick={() => setSelectedNotification(null)}>⬅ Wróć do listy</button>
                </div>
              </div>
            ) : (
              <div className="list-group shadow-sm">
                {notifications.length === 0 ? (
                  <div className="alert alert-info border-0">Brak powiadomień na Twoim koncie.</div>
                ) : (
                  notifications.map(notif => (
                    <div 
                      key={notif.id} 
                      className={`list-group-item list-group-item-action d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center p-3 ${!notif.isRead ? 'bg-primary bg-opacity-10' : 'bg-body-tertiary'}`}
                      style={{ cursor: 'pointer' }}
                      onClick={() => handleNotificationClick(notif)}
                    >
                      <div className="mb-2 mb-md-0">
                        <div className="d-flex align-items-center gap-2 mb-1">
                          <span className={!notif.isRead ? 'fw-bold' : ''}>{notif.title}</span>
                          {!notif.isRead && <span className="badge bg-primary rounded-pill" style={{fontSize: '0.65rem'}}>Nowe</span>}
                        </div>
                        <small className="text-muted fw-normal">{new Date(notif.date).toLocaleString()}</small>
                      </div>
                      <div className="d-flex align-items-center gap-3">
                        <span className={`badge ${getNotifBadgeClass(notif.priority)}`}>{notif.priority}</span>
                        {!notif.isRead && (
                          <button 
                            className="btn btn-sm btn-outline-success"
                            onClick={(e) => handleMarkAsRead(e, notif.id)}
                          >
                            ✓ Przeczytane
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

      ) : !activeProject ? (
        <div className="row justify-content-center">
          <div className="col-md-8">
            <h2 className="h4 mb-3">Lista Projektów</h2>
            <div className="card shadow-sm mb-4 bg-body-tertiary border-0">
              <div className="card-body">
                <form onSubmit={handleSubmit}>
                  <div className="mb-3"><input type="text" className="form-control" placeholder="Nazwa projektu" value={nazwa} onChange={(e) => setNazwa(e.target.value)} /></div>
                  <div className="mb-3"><textarea className="form-control" placeholder="Opis projektu" value={opis} onChange={(e) => setOpis(e.target.value)} rows={3} /></div>
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
                  <div className="col"><select className="form-select form-select-sm" value={taskPriorytet} onChange={(e) => setTaskPriorytet(e.target.value as Priority)}><option value="niski">Niski</option><option value="średni">Średni</option><option value="wysoki">Wysoki</option></select></div>
                  <div className="col"><input type="number" className="form-control form-control-sm" min="1" placeholder="Czas (h)" value={taskCzas} onChange={(e) => setTaskCzas(Number(e.target.value))} /></div>
                </div>
                <div className="d-flex gap-2">
                  <button type="submit" className="btn btn-sm btn-secondary" style={{ backgroundColor: 'purple', borderColor: 'purple', color: 'white' }}>{editingTaskId ? 'Zapisz' : 'Dodaj zadanie'}</button>
                  {editingTaskId && <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => { setEditingTaskId(null); setTaskNazwa(''); setTaskOpis(''); setTaskCzas(1); }}>Anuluj</button>}
                </div>
              </form>
            </div>
          </div>

          <div className="row g-3">
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

      {showToast && (
        <div className="toast-container position-fixed bottom-0 end-0 p-3" style={{ zIndex: 1050 }}>
          <div className="toast show" role="alert" aria-live="assertive" aria-atomic="true">
            <div className={`toast-header text-white ${showToast.priority === 'high' ? 'bg-danger' : 'bg-warning text-dark'}`}>
              <strong className="me-auto">Nowe powiadomienie ({showToast.priority})</strong>
              <small>{new Date(showToast.date).toLocaleTimeString()}</small>
              <button type="button" className="btn-close btn-close-white ms-2" onClick={() => setShowToast(null)}></button>
            </div>
            <div className="toast-body bg-body-tertiary text-body">
              <strong>{showToast.title}</strong><br/>
              {showToast.message}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;