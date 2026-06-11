import { SwUpdate } from '@angular/service-worker';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

import { log } from './general';
import { notifyInfo } from './notifications';

let _timer: number;
let _subscriptions: Subscription[] = [];
let _new_version = false;

export function hasNewVersion() {
    return _new_version;
}

/**
 * Setup handler for cache change events
 * @param cache Angular Service worker service
 * @param interval Time interval to check the cache for changes
 */
export function setupCache(cache: SwUpdate, interval: number = 5 * 60 * 1000) {
    if (!cache.isEnabled) return;
    clearCacheCheck();
    _subscriptions.push(
        cache.versionUpdates
            .pipe(filter((event) => event.type === 'VERSION_READY'))
            .subscribe(() => {
                log('CACHE', `New version ready to activate.`);
                _new_version = true;
                notifyInfo(
                    'Newer version of the application is available',
                    'Refresh',
                    () => location.reload(),
                );
            }),
        // SW is in a broken state (e.g. cached files evicted); a reload is the
        // only way to recover a working application
        cache.unrecoverable.subscribe((event) => {
            log('CACHE', `Unrecoverable state: ${event.reason}`);
            location.reload();
        }),
    );
    _timer = <any>setInterval(() => {
        log('CACHE', `Checking for updates...`);
        cache.checkForUpdate().catch((err) => {
            log('CACHE', `Failed to check for updates: ${err}`);
        });
    }, interval);
}

export function clearCacheCheck() {
    if (_timer) clearInterval(_timer);
    for (const sub of _subscriptions) sub.unsubscribe();
    _subscriptions = [];
}
