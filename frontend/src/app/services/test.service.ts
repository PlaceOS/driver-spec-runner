import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, combineLatest, Observable } from 'rxjs';
import { filter, shareReplay, switchMap } from 'rxjs/operators';

import { webSocket } from 'rxjs/webSocket';

import { stringSimilarity } from 'string-similarity-js';

import {
    CommitOptions,
    RepositoryCommit,
    SpecBuildService,
    LATEST_COMMIT,
} from './build.service';
import { apiEndpoint, toQueryString } from '../common/api';

export interface SpecQueryOptions {
    /** Name of a third party repository */
    repository?: string;
    /** Whether to list only compiled drivers */
    compiled?: boolean;
}

export interface RunTestOptions {
    /** 3rd party repository to use */
    repository?: string;
    /** Name of the driver to test */
    driver?: string;
    /** Spec file to use for the driver */
    spec?: string;
    /** Commit version to use for the driver */
    commit?: string;
    /** Commit version to use for the spec */
    spec_commit?: string;
    /** Force a recompilation of the spec and driver */
    force?: boolean;
    /** Compile files with debugging symbols */
    debug?: boolean;
}

export interface TestSettings {
    force?: boolean;
    debug_symbols?: boolean;
}

export interface TestResponse {
    type: 'failure' | 'not_found' | 'success' | 'test_output',
    output?: string;
}

@Injectable({
    providedIn: 'root',
})
export class SpecTestService {
    /** Currently active repository */
    private _active_spec = new BehaviorSubject<string>(null);
    /** Currently active repository */
    private _active_commit = new BehaviorSubject<RepositoryCommit>(null);
    /** Currently active repository */
    private _settings = new BehaviorSubject<TestSettings>({});

    public readonly active_spec = this._active_spec.asObservable();

    public readonly active_commit = this._active_commit.asObservable();

    public readonly settings = this._settings.asObservable();

    public readonly spec_list = this._build.active_repo.pipe(
        switchMap((repo) =>
            this.loadSpecFiles({
                repository: repo === 'Public' ? undefined : repo,
            })
        ),
        shareReplay()
    );

    public readonly commit_list = this._active_spec.pipe(
        filter((i) => !!i),
        switchMap((i) =>
            this.loadSpecCommits(i, {
                repository: i === 'Public' ? undefined : i,
            })
        ),
        shareReplay()
    );

    constructor(private _http: HttpClient, private _build: SpecBuildService) {
        combineLatest([this._build.active_driver, this.spec_list]).subscribe(
            async (details) => {
                const [driver, list] = details;
                const comp = list.map((spec) => ({
                    spec,
                    similarity: stringSimilarity(spec, driver),
                }));
                comp.sort((a, b) => b.similarity - a.similarity);
                this._active_spec.next(comp[0].spec);
            }
        );
    }

    public setSpec(spec: string): void {
        this._active_spec.next(spec);
    }

    public setCommit(commit: RepositoryCommit): void {
        this._active_commit.next(commit);
    }

    public setSettings(options: TestSettings): void {
        this._settings.next({ ...this._settings.getValue(), ...options });
    }

    public async loadSpecFiles(
        options: SpecQueryOptions = {}
    ): Promise<string[]> {
        const query = toQueryString(options);
        const url = `${apiEndpoint()}/test${query ? '?' + query : ''}`;
        return this._http.get<string[]>(url).toPromise();
    }

    public async loadSpecCommits(
        id: string,
        options: CommitOptions
    ): Promise<RepositoryCommit[]> {
        const url = `${apiEndpoint()}/test/${encodeURIComponent(id)}/commits`;
        const list = await this._http.get<RepositoryCommit[]>(url).toPromise();
        this._active_commit.next(LATEST_COMMIT);
        return [LATEST_COMMIT, ...list];
    }

    public async runSpec(options: RunTestOptions) {
        options = this._generateRunOptions(options);
        const query = toQueryString(options);
        const url = `${apiEndpoint()}/test${query ? '?' + query : ''}`;
        return this._http
            .post(url, options, { responseType: 'text' })
            .toPromise();
    }

    public runSpecWithFeedback(options: RunTestOptions): Observable<string> {
        options = this._generateRunOptions(options);
        const query = toQueryString(options);
        const secure = location.protocol.includes('https');
        const url = `ws${secure ? 's' : ''}://${location.host}/test/run_spec${query ? '?' + query : ''}`;
        return webSocket<string>({
            url,
            deserializer: ({data}) => typeof data === 'string' ? data : this._processMessage(data)
        }).asObservable();
    }

    private _generateRunOptions(options: RunTestOptions) {
        const repo = this._build.getRepository() || options.repository;
        return {
            repository: repo === 'Public' ? undefined : repo,
            driver:
                this._build.getDriver() ||
                options.driver,
            spec: this._active_spec.getValue() || options.spec,
            commit:
                this._build.getCommit()?.commit ||
                options.commit,
            spec_commit:
                this._active_commit.getValue()?.commit ||
                options.spec_commit,
            force: this._settings.getValue().force || options.force,
            debug: this._settings.getValue().debug_symbols || options.debug,
        };
    }

    private _processMessage({ type, output }: TestResponse): string {
        if (type === 'failure') {
            return`\\033[31m${output}`;
        } else if (type === 'not_found') {
            return`\\033[31mTest specifications not found.`;
        } else if (type === 'success') {
            return`\\033[32m${output}`;
        }
        return output;
    }
}
