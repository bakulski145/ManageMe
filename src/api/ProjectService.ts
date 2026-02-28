export interface Project {
    id: string;
    nazwa: string;
    opis: string;
}

export type CreateProjectDTO = Omit<Project, 'id'>;

const STORAGE_KEY = 'manageme_prjects';

export class ProjectService
    {

    static async getAll(): Promise<Project[]>
        {
            const data = localStorage.getItem(STORAGE_KEY);
            return data ? JSON.parse(data) : [];
        }

        static async create(data: CreateProjectDTO): Promise<Project>
        {
            const projects = await this.getAll();

            const newProject: Project = 
            {
                id: crypto.randomUUID(),
                nazwa: data.nazwa,
                opis: data.opis
            };

            projects.push(newProject);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));

            return newProject;
        }

        static async update(id: string, data: CreateProjectDTO): Promise<Project | null>
        {
            const projects = await this.getAll();
            const index = projects.findIndex(p => p.id === id);

            if(index === -1) return null;

            projects[index] = { ...projects[index], ...data};
            localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));

            return projects[index];
        }

        static async delete(id: string): Promise<void> 
        {
            const projects = await this.getAll();
            const filteredProjects = projects.filter(p => p.id !== id);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredProjects));
        }

    }