export function get<T = any>(url: string): Promise<T> {
    return fetch(url, { method: 'get' }).then((resp) => resp.json());
}

export function del<T = any>(url: string): Promise<T> {
    return fetch(url, { method: 'delete' }).then((resp) => resp.json());
}

export function post<T = any>(
    url: string,
    body: string,
    type: 'text' | 'json' = 'json',
): Promise<T> {
    return fetch(url, { method: 'get', body }).then((resp) =>
        type == 'json' ? resp.json() : resp.text(),
    );
}
