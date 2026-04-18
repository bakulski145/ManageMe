export type Priority = 'niski' | 'średni' | 'wysoki';
export type Status = 'todo' | 'doing' | 'done';

export interface Story {
    id: string;
    nazwa: string;
    opis: string;
    priorytet: Priority;
    projektId: string;
    dataUtworzenia: string;
    stan: Status;
    wlascicielId: string;
}

export type CreateStoryDTO = Omit<Story, 'id' | 'dataUtworzenia'>;

const STORAGE_KEY = 'manageme_stories';

export class StoryService {
    static async getAll(): Promise<Story[]> {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    }

    static async getByProject(projektId: string): Promise<Story[]> {
        const stories = await this.getAll();
        return stories.filter(s => s.projektId === projektId);
    }

    static async create(data: CreateStoryDTO): Promise<Story> {
        const stories = await this.getAll();
        const newStory: Story = {
            ...data,
            id: crypto.randomUUID(),
            dataUtworzenia: new Date().toISOString()
        };
        
        stories.push(newStory);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stories));
        return newStory;
    }

    static async update(id: string, data: Partial<Story>): Promise<Story | null> {
        const stories = await this.getAll();
        const index = stories.findIndex(s => s.id === id);
        if (index === -1) return null;

        stories[index] = { ...stories[index], ...data };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stories));
        return stories[index];
    }

    static async delete(id: string): Promise<void> {
        const stories = await this.getAll();
        const filteredStories = stories.filter(s => s.id !== id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredStories));
    }
}