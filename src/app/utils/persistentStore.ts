export class PersistentStore {
    static prefix: string = 'ng-virtual-grid';

    static get(key: string) {
        const value = localStorage.getItem(`${this.prefix}-${key}`);
        return value ? JSON.parse(value) : value;
    }

    static set(key: string, value: any) {
        localStorage.setItem(`${this.prefix}-${key}`, JSON.stringify(value));
    }
}