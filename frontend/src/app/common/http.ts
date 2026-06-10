export function get<T = any>(
    url: string,
    abortSignal?: AbortSignal,
): Promise<T> {
    return fetch(url, { method: 'get', signal: abortSignal }).then((resp) =>
        resp.json(),
    );
}

export function del<T = any>(
    url: string,
    abortSignal?: AbortSignal,
): Promise<T> {
    return fetch(url, { method: 'delete', signal: abortSignal }).then((resp) =>
        resp.json(),
    );
}

export function post<T = any>(
    url: string,
    body: string,
    type: 'text' | 'json' = 'json',
    abortSignal?: AbortSignal,
): Promise<T> {
    return fetch(url, { method: 'post', body, signal: abortSignal }).then(
        (resp) => (type == 'json' ? resp.json() : resp.text()),
    );
}
