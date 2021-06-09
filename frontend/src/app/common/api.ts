import { HashMap } from './types';

export function apiEndpoint(): string {
    return location.origin;
}

/**
 * Convert map into a query string
 * @param map Key value pairs to convert
 */
export function toQueryString(map: HashMap): string {
    let str = '';
    if (map) {
        for (const key in map) {
            if (
                map.hasOwnProperty(key) &&
                map[key] !== undefined &&
                map[key] !== null
            ) {
                str += `${str ? '&' : ''}${key}=${encodeURIComponent(map[key])}`;
            }
        }
    }
    return str;
}
