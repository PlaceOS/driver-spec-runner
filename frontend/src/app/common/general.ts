import { HashMap } from './types';

declare global {
    interface Window {
        debug: boolean;
    }
}

/** Available console output streams. */
export type ConsoleStream = 'debug' | 'warn' | 'log' | 'error';

/**
 * Log data to the browser console
 * @param type Type of message
 * @param msg Message body
 * @param args array of argments to log to the console
 * @param stream Stream to emit the console on. 'debug', 'log', 'warn' or 'error'
 * @param force Whether to force message to be emitted when debug is disabled
 */
export function log(
    type: string,
    msg: string,
    args?: any,
    stream: ConsoleStream = 'debug',
    force: boolean = false,
    app_name: string = 'Spec Runner'
) {
    if (window.debug || force) {
        const colors: string[] = ['color: #E91E63', 'color: #3F51B5', 'color: default'];
        if (args) {
            console[stream](`%c[${app_name}]%c[${type}] %c${msg}`, ...colors, args);
        } else {
            console[stream](`%c[${app_name}]%c[${type}] %c${msg}`, ...colors);
        }
    }
}
