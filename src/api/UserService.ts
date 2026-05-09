export type Role = 'admin' | 'devops' | 'developer';

export interface User{
    id: string;
    imie: string;
    nazwisko: string;
    rola: Role;
}

const MOCK_USERS: User[] = [
    { id: 'user-1', imie: 'Jan', nazwisko: 'Kowalski', rola: 'admin' },
    { id: 'user-2', imie: 'Anna', nazwisko: 'Nowak', rola: 'developer' },
    { id: 'user-3', imie: 'Piotr', nazwisko: 'Wiśniewski', rola: 'devops' },
];

export class UserService {
    static getLoggedUser(): User {
        // Zalogowany pozostaje admin (user-1)
        return MOCK_USERS.find(u => u.rola === 'admin') || MOCK_USERS[0];
    }

    static getAllUsers(): User[] {
        return MOCK_USERS;
    }
}