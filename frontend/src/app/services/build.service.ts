import {
    effect,
    Injectable,
    linkedSignal,
    resource,
    signal,
} from '@angular/core';

import { apiEndpoint, toQueryString } from '../common/api';
import { del, get, post } from '../common/http';
import { HashMap } from '../common/types';

export interface DriverListingOptions {
    /** Name of a third party repository */
    repository?: string;
    /** Whether to list only compiled drivers */
    compiled?: boolean;
}

export interface DriverCompileOptions {
    /** Name of a driver file */
    driver: string;
    /** Hash of a specific commit */
    commit: string;
}

export interface CommitOptions {
    /** Name of a third party repository */
    repository?: string;
    /** Depth of the commit history to retrieve. Defaults to `50` */
    count?: number;
}

export interface DriverClearOptions {
    /** Name of a third party repository */
    repository?: string;
    /** Hash of a specific commit */
    commit: string;
}

export interface RepositoryCommit {
    /** Commit hash */
    readonly commit: string;
    /** Commit date ISO string */
    readonly date: string;
    /** Name of the commit author */
    readonly author: string;
    /** Description of the commit */
    readonly subject: string;
}

export const LATEST_COMMIT = {
    subject: 'Latest Commit',
    author: 'system',
    commit: 'HEAD',
    date: new Date().toISOString(),
};

@Injectable({
    providedIn: 'root',
})
export class SpecBuildService {
    /** Whether the sidebar is visible */
    private _sidebar = signal(true);
    /** Currently selected driver */
    private _active_driver = signal('');
    /** Test statuses of previously run drivers */
    private _test_statuses = signal<HashMap<string>>({});

    /** Currently available repositories */
    private _repo_list = resource({
        loader: async ({ abortSignal }) => {
            const url = `${apiEndpoint()}/build/repositories`;
            const list = await get<string[]>(url, abortSignal).catch(() => []);
            return ['Public', ...list.filter((i) => i[0] !== '.')];
        },
        defaultValue: [] as string[],
    });

    /** Currently selected repository, defaults to the first available */
    private _active_repo = linkedSignal<string[], string>({
        source: this._repo_list.value,
        computation: (repos, previous) =>
            previous && repos.includes(previous.value)
                ? previous.value
                : repos[0] || '',
    });

    /** Drivers available in the selected repository */
    private _driver_list = resource({
        params: () => this._active_repo() || undefined,
        loader: ({ params: repo, abortSignal }) => {
            const query = toQueryString({
                repository: repo === 'Public' ? undefined : repo,
            });
            const url = `${apiEndpoint()}/build${query ? '?' + query : ''}`;
            return get<string[]>(url, abortSignal).catch(() => []);
        },
        defaultValue: [] as string[],
    });

    /** Compiled versions of the selected driver */
    private _driver_versions = resource({
        params: () => this._active_driver() || undefined,
        loader: ({ params: driver, abortSignal }) => {
            const url = `${apiEndpoint()}/build/${encodeURIComponent(driver)}`;
            return get<string[]>(url, abortSignal).catch(() => []);
        },
        defaultValue: [] as string[],
    });

    /** Commits available for the selected driver */
    private _driver_commits = resource({
        params: () => {
            const driver = this._active_driver();
            return driver
                ? { driver, repository: this._active_repo() }
                : undefined;
        },
        loader: async ({ params, abortSignal }) => {
            const url = `${apiEndpoint()}/build/${encodeURIComponent(
                params.driver,
            )}/commits`;
            const list = await get<RepositoryCommit[]>(url, abortSignal).catch(
                () => null,
            );
            return list ? [LATEST_COMMIT, ...list] : [];
        },
        defaultValue: [] as RepositoryCommit[],
    });

    /** Currently selected driver commit, resets when the commit list reloads */
    private _active_commit = linkedSignal<
        RepositoryCommit[],
        RepositoryCommit | null
    >({
        source: this._driver_commits.value,
        computation: (commits) => commits[0] || null,
    });

    /** Signal of the sidebar visibility state */
    public readonly sidebar = this._sidebar.asReadonly();
    /** Signal of the currently available repositories */
    public readonly repositories = this._repo_list.value.asReadonly();
    /** Signal of the currently selected repository */
    public readonly active_repo = this._active_repo.asReadonly();
    /** Signal of the test statuses */
    public readonly test_statuses = this._test_statuses.asReadonly();
    /** Signal of the currently selected driver commit */
    public readonly active_commit = this._active_commit.asReadonly();
    /** Signal of the currently available drivers */
    public readonly driver_list = this._driver_list.value.asReadonly();
    /** Signal of the available versions of the selected driver */
    public readonly driver_versions = this._driver_versions.value.asReadonly();
    /** Signal of the currently selected driver */
    public readonly active_driver = this._active_driver.asReadonly();
    /** Signal of the available commits for the selected driver */
    public readonly driver_commits = this._driver_commits.value.asReadonly();

    constructor() {
        this._test_statuses.set(
            JSON.parse(localStorage.getItem('HARNESS.statuses') || '{}'),
        );
        effect(() => {
            localStorage.setItem(
                'HARNESS.statuses',
                JSON.stringify(this._test_statuses()),
            );
        });
    }

    public getRepository(): string {
        return this._active_repo();
    }

    public getDriver(): string {
        return this._active_driver();
    }

    public toggleSidebar(): void {
        this._sidebar.update((value) => !value);
    }

    public getCommit(): RepositoryCommit {
        return this._active_commit()!;
    }

    public setTestStatus(status: 'passed' | 'failed' | ''): void {
        this._test_statuses.update((current) => ({
            ...current,
            [`${this._active_repo()}|${this._active_driver()}`]: status,
        }));
    }

    public setCommit(repo: RepositoryCommit): void {
        this._active_commit.set(repo);
    }

    public setRepository(name: string): void {
        this._active_repo.set(name);
    }

    public setDriver(path: string): void {
        this._active_driver.set(path);
    }

    public async loadRepositoryCommits(
        options: CommitOptions = {},
    ): Promise<RepositoryCommit[]> {
        const url = `${apiEndpoint()}/build/repositories_commits`;
        const list = await get(url);
        return [LATEST_COMMIT, ...list];
    }

    public async cleanDriverVersions(
        id: string,
        options: DriverClearOptions,
    ): Promise<void> {
        const query = toQueryString(options);
        const url = `${apiEndpoint()}/build/${encodeURIComponent(id)}${
            query ? '?' + query : ''
        }`;
        await del(url);
        this._driver_versions.reload();
    }

    public async compileDriver(options: DriverCompileOptions): Promise<void> {
        const query = toQueryString(options);
        const url = `${apiEndpoint()}/build`;
        return post(url, query);
    }
}
