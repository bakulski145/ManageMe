export interface User{
    id: string;
    imie: string;
    nazwisko: string;
}

export class UserService{
    static getLoggedUser(): User{
        return {
            id: 'user-1',
            imie: 'Jan',
            nazwisko: 'kowalski',
        };
    }
}