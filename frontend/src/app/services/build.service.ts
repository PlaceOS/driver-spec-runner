import { effect, Injectable, signal } from '@angular/core';

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
    /** Currently active repository */
    private _sidebar = signal(true);
    /** Currently available repositories */
    private _repo_list = signal<string[]>([]);
    /** Currently active repository */
    private _active_repo = signal('');
    /** Currently active repository */
    private _active_driver = signal('');
    /** Currently active repository */
    private _active_commit = signal<RepositoryCommit | null>(null);
    /** Currently active repository */
    private _test_statuses = signal<HashMap<string>>({});
    /** Currently available drivers */
    private _driver_list = signal<string[]>([]);
    /** Currently available driver versions */
    private _driver_versions = signal<string[]>([]);
    /** Currently available driver commits */
    private _driver_commits = signal<RepositoryCommit[]>([]);

    private _driver_list_request = 0;
    private _driver_commits_request = 0;
    private _driver_versions_request = 0;

    /** Signal of the sidebar visibility state */
    public readonly sidebar = this._sidebar.asReadonly();
    /** Signal of the currently available repositories */
    public readonly repositories = this._repo_list.asReadonly();
    /** Signal of the currently selected repository */
    public readonly active_repo = this._active_repo.asReadonly();
    /** Signal of the test statuses */
    public readonly test_statuses = this._test_statuses.asReadonly();
    /** Signal of the currently selected driver commit */
    public readonly active_commit = this._active_commit.asReadonly();
    /** Currently available drivers */
    public readonly driver_list = this._driver_list.asReadonly();
    /** Currently available drivers */
    public readonly driver_versions = this._driver_versions.asReadonly();
    /** Signal of the currently selected driver */
    public readonly active_driver = this._active_driver.asReadonly();
    /** Currently available drivers */
    public readonly driver_commits = this._driver_commits.asReadonly();

    constructor() {
        this.loadRepositories();
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
        if (name !== this._active_repo()) {
            this._active_repo.set(name);
            this.reloadDrivers();
            this.reloadDriverCommits();
        }
    }

    public setDriver(path: string): void {
        if (path !== this._active_driver()) {
            this._active_driver.set(path);
            this.reloadDriverVersions();
            this.reloadDriverCommits();
        }
    }

    public async loadRepositories(): Promise<void> {
        console.log('Load repos');
        const url = `${apiEndpoint()}/build/repositories`;
        const repo_list = await get(url);
        console.log('Repo List:', repo_list);
        const list = ['Public', ...repo_list.filter((i) => i[0] !== '.')];
        this._repo_list.set(list);
        if (!this._active_repo()) {
            this.setRepository(list[0]);
        }
    }

    public async loadRepositoryCommits(
        options: CommitOptions = {},
    ): Promise<RepositoryCommit[]> {
        const url = `${apiEndpoint()}/build/repositories_commits`;
        const list = await get(url);
        return [LATEST_COMMIT, ...list];
    }

    public async loadDrivers(
        options: DriverListingOptions = {},
    ): Promise<string[]> {
        const query = toQueryString(options);
        const url = `${apiEndpoint()}/build${query ? '?' + query : ''}`;
        return get(url);
    }

    public async loadDriverCommits(
        id: string,
        options: CommitOptions = {},
    ): Promise<RepositoryCommit[]> {
        const url = `${apiEndpoint()}/build/${encodeURIComponent(id)}/commits`;
        const list = await get(url);
        this._active_commit.set(LATEST_COMMIT);
        return [LATEST_COMMIT, ...list];
    }

    public async loadDriverVersions(id: string): Promise<string[]> {
        const url = `${apiEndpoint()}/build/${encodeURIComponent(id)}`;
        return get(url);
    }

    public async cleanDriverVersions(
        id: string,
        options: DriverClearOptions,
    ): Promise<void> {
        const query = toQueryString(options);
        const url = `${apiEndpoint()}/build/${encodeURIComponent(id)}${
            query ? '?' + query : ''
        }`;
        return del(url);
    }

    public async compileDriver(options: DriverCompileOptions): Promise<void> {
        const query = toQueryString(options);
        const url = `${apiEndpoint()}/build`;
        return post(url, query);
    }

    private async reloadDrivers(): Promise<void> {
        const request = ++this._driver_list_request;
        const repo = this._active_repo();
        const list = await this.loadDrivers({
            repository: repo === 'Public' ? undefined : repo,
        }).catch(() => []);
        if (request === this._driver_list_request) this._driver_list.set(list);
    }

    private async reloadDriverVersions(): Promise<void> {
        const request = ++this._driver_versions_request;
        const driver = this._active_driver();
        const list = driver
            ? await this.loadDriverVersions(driver).catch(() => [])
            : [];
        if (request === this._driver_versions_request) {
            this._driver_versions.set(list);
        }
    }

    private async reloadDriverCommits(): Promise<void> {
        const request = ++this._driver_commits_request;
        const repo = this._active_repo();
        const driver = this._active_driver();
        const list = driver
            ? await this.loadDriverCommits(driver, { repository: repo }).catch(
                  () => [],
              )
            : [];
        if (request === this._driver_commits_request) {
            this._driver_commits.set(list);
        }
    }
}
