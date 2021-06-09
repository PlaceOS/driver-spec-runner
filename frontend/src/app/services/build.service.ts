import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, combineLatest } from 'rxjs';
import { debounceTime, share, shareReplay, switchMap } from 'rxjs/operators';

import { apiEndpoint, toQueryString } from '../common/api';
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
    date: new Date().toISOString()
};

@Injectable({
    providedIn: 'root',
})
export class SpecBuildService {
    /** Currently active repository */
    private _sidebar = new BehaviorSubject<boolean>(true);
    /** Currently available repositories */
    private _repo_list = new BehaviorSubject<string[]>([]);
    /** Currently active repository */
    private _active_repo = new BehaviorSubject<string>(null);
    /** Currently active repository */
    private _active_driver = new BehaviorSubject<string>(null);
    /** Currently active repository */
    private _active_commit = new BehaviorSubject<RepositoryCommit>(null);
    /** Currently active repository */
    private _test_statuses = new BehaviorSubject<HashMap<string>>({});

    /** Observable of the currently available repositories */
    public readonly sidebar = this._sidebar.asObservable();
    /** Observable of the currently available repositories */
    public readonly repositories = this._repo_list.asObservable();
    /** Observable of the currently selected repository */
    public readonly active_repo = this._active_repo.asObservable();
    /** Observable of the currently selected repository */
    public readonly test_statuses = this._test_statuses.asObservable();
    /** Observable of the currently selected repository */
    public readonly active_commit = this._active_commit.asObservable();
    /** Currently available drivers */
    public readonly driver_list = this._active_repo.pipe(
        debounceTime(300),
        switchMap((i) =>
            this.loadDrivers({ repository: i === 'Public' ? undefined : i })
        ),
        shareReplay()
    );
    /** Currently available drivers */
    public readonly driver_versions = this._active_driver.pipe(
        switchMap((i) => this.loadDriverVersions(i)),
        shareReplay()
    );
    /** Observable of the currently selected repository */
    public readonly active_driver = this._active_driver.asObservable();
    /** Currently available drivers */
    public readonly driver_commits = combineLatest([
        this._active_repo,
        this._active_driver,
    ]).pipe(
        switchMap((i) => {
            const [repo, driver] = i;
            return this.loadDriverCommits(driver, { repository: repo });
        }),
        share()
    );

    constructor(private _http: HttpClient) {
        this.loadRepositories();
        this._test_statuses.next(JSON.parse(localStorage.getItem('HARNESS.statuses') || '{}'));
        this._test_statuses.subscribe((status) => localStorage.setItem('HARNESS.statuses', JSON.stringify(status)));
    }

    public getRepository(): string {
        return this._active_repo.getValue();
    }

    public getDriver(): string {
        return this._active_driver.getValue();
    }

    public toggleSidebar(): void {
        this._sidebar.next(!this._sidebar.getValue());
    }

    public getCommit(): RepositoryCommit {
        return this._active_commit.getValue();
    }

    public setTestStatus(status: 'passed' | 'failed' | ''): void {
        const statuses = { ...this._test_statuses.getValue() };
        statuses[`${this._active_repo.getValue()}|${this._active_driver.getValue()}`] = status;
        this._test_statuses.next(statuses);
    }

    public setCommit(repo: RepositoryCommit): void {
        this._active_commit.next(repo);
    }

    public setRepository(name: string): void {
        if (name !== this._active_repo.getValue()) {
            this._active_repo.next(name);
        }
    }

    public setDriver(path: string): void {
        this._active_driver.next(path);
    }

    public async loadRepositories(): Promise<void> {
        const url = `${apiEndpoint()}/build/repositories`;
        const repo_list = await this._http.get<string[]>(url).toPromise();
        const list = ['Public', ...repo_list.filter((i) => i[0] !== '.')];
        this._repo_list.next(list);
        if (!this._active_repo.getValue()) {
            this._active_repo.next(list[0]);
        }
    }

    public async loadRepositoryCommits(
        options: CommitOptions = {}
    ): Promise<RepositoryCommit[]> {
        const url = `${apiEndpoint()}/build/repositories_commits`;
        const list = await this._http.get<RepositoryCommit[]>(url).toPromise();
        return [LATEST_COMMIT, ...list];
    }

    public async loadDrivers(
        options: DriverListingOptions = {}
    ): Promise<string[]> {
        const query = toQueryString(options);
        const url = `${apiEndpoint()}/build${query ? '?' + query : ''}`;
        return this._http.get<string[]>(url).toPromise();
    }

    public async loadDriverCommits(
        id: string,
        options: CommitOptions = {}
    ): Promise<RepositoryCommit[]> {
        const url = `${apiEndpoint()}/build/${encodeURIComponent(id)}/commits`;
        const list = await this._http.get<RepositoryCommit[]>(url).toPromise();
        this._active_commit.next(LATEST_COMMIT);
        return [LATEST_COMMIT, ...list];
    }

    public async loadDriverVersions(id: string): Promise<string[]> {
        const url = `${apiEndpoint()}/build/${encodeURIComponent(id)}`;
        return this._http.get<string[]>(url).toPromise();
    }

    public async cleanDriverVersions(
        id: string,
        options: DriverClearOptions
    ): Promise<void> {
        const query = toQueryString(options);
        const url = `${apiEndpoint()}/build/${encodeURIComponent(id)}${
            query ? '?' + query : ''
        }`;
        return this._http.delete<void>(url).toPromise();
    }

    public async compileDriver(options: DriverCompileOptions): Promise<void> {
        const query = toQueryString(options);
        const url = `${apiEndpoint()}/build`;
        return this._http.post<void>(url, query).toPromise();
    }
}
