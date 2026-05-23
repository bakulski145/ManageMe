export type NotificationPriority = 'low' | 'medium' | 'high';

export interface Notification {
    id: string;
    title: string;
    message: string;
    date: string; 
    priority: NotificationPriority;
    isRead: boolean;
    recipientId: string;
}

export type CreateNotificationDTO = Omit<Notification, 'id' | 'date' | 'isRead'>;

const STORAGE_KEY = 'manageme_notifications';

export class NotificationService {
    static async getAll(): Promise<Notification[]> {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    }

    static async getByRecipient(recipientId: string): Promise<Notification[]> {
        const notifications = await this.getAll();
        return notifications
            .filter(n => n.recipientId === recipientId)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }

    static async create(data: CreateNotificationDTO): Promise<Notification> {
        const notifications = await this.getAll();
        const newNotification: Notification = {
            ...data,
            id: crypto.randomUUID(),
            date: new Date().toISOString(),
            isRead: false
        };
        
        notifications.push(newNotification);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
        return newNotification;
    }

    static async markAsRead(id: string): Promise<void> {
        const notifications = await this.getAll();
        const index = notifications.findIndex(n => n.id === id);
        if (index !== -1) {
            notifications[index].isRead = true;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
        }
    }

    static async markAllAsRead(recipientId: string): Promise<void> {
        const notifications = await this.getAll();
        let changed = false;
        notifications.forEach(n => {
            if (n.recipientId === recipientId && !n.isRead) {
                n.isRead = true;
                changed = true;
            }
        });
        if (changed) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
        }
    }
}