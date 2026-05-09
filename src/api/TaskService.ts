import type { Priority, Status } from './StoryService';

export interface Task {
    id: string;
    nazwa: string;
    opis: string;
    priorytet: Priority;
    storyId: string;
    przewidywanyCzas: number; // np. w godzinach
    stan: Status;
    dataDodania: string;
    dataStartu?: string;      // Uzupełniane przy przejściu w 'doing'
    dataZakonczenia?: string; // Uzupełniane przy przejściu w 'done'
    przypisanyUzytkownikId?: string;
}

export type CreateTaskDTO = Omit<Task, 'id' | 'dataDodania' | 'stan' | 'dataStartu' | 'dataZakonczenia' | 'przypisanyUzytkownikId'>;

const STORAGE_KEY = 'manageme_tasks';

export class TaskService {
    static async getAll(): Promise<Task[]> {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    }

    static async getByStory(storyId: string): Promise<Task[]> {
        const tasks = await this.getAll();
        return tasks.filter(t => t.storyId === storyId);
    }

    static async create(data: CreateTaskDTO): Promise<Task> {
        const tasks = await this.getAll();
        const newTask: Task = {
            ...data,
            id: crypto.randomUUID(),
            stan: 'todo',
            dataDodania: new Date().toISOString()
        };
        
        tasks.push(newTask);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
        return newTask;
    }

    static async update(id: string, data: Partial<Task>): Promise<Task | null> {
        const tasks = await this.getAll();
        const index = tasks.findIndex(t => t.id === id);
        if (index === -1) return null;

        tasks[index] = { ...tasks[index], ...data };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
        return tasks[index];
    }

    static async delete(id: string): Promise<void> {
        const tasks = await this.getAll();
        const filteredTasks = tasks.filter(t => t.id !== id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredTasks));
    }
}