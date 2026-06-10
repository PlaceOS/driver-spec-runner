import { effect, inject, Injectable, signal } from '@angular/core';

import { apiEndpoint, toQueryString } from '../common/api';
import { get, post } from '../common/http';
import {
    CommitOptions,
    LATEST_COMMIT,
    RepositoryCommit,
    SpecBuildService,
} from './build.service';

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
    type: 'failure' | 'not_found' | 'success' | 'test_output';
    output?: string;
}

@Injectable({
    providedIn: 'root',
})
export class SpecTestService {
    private _build = inject(SpecBuildService);

    /** Currently active repository */
    private _active_spec = signal('');
    /** Currently active repository */
    private _active_commit = signal<RepositoryCommit | null>(null);
    /** Currently active repository */
    private _settings = signal<TestSettings>({});
    /** Currently available spec files */
    private _spec_list = signal<string[]>([]);
    /** Currently available spec commits */
    private _commit_list = signal<RepositoryCommit[]>([]);

    private _spec_list_request = 0;
    private _commit_list_request = 0;

    public readonly active_spec = this._active_spec.asReadonly();

    public readonly active_commit = this._active_commit.asReadonly();

    public readonly settings = this._settings.asReadonly();

    public readonly spec_list = this._spec_list.asReadonly();

    public readonly commit_list = this._commit_list.asReadonly();

    constructor() {
        effect(() => {
            const repo = this._build.active_repo();
            this.reloadSpecFiles(repo);
        });
        effect(() => {
            const driver = this._build.active_driver();
            const list = this._spec_list();
            this.selectClosestSpec(driver, list);
        });
        effect(() => {
            const spec = this._active_spec();
            this.reloadSpecCommits(spec);
        });
    }

    public setSpec(spec: string): void {
        this._active_spec.set(spec);
    }

    public setCommit(commit: RepositoryCommit): void {
        this._active_commit.set(commit);
    }

    public setSettings(options: TestSettings): void {
        this._settings.update((current) => ({ ...current, ...options }));
    }

    public async loadSpecFiles(
        options: SpecQueryOptions = {},
    ): Promise<string[]> {
        const query = toQueryString(options);
        const url = `${apiEndpoint()}/test${query ? '?' + query : ''}`;
        return get(url);
    }

    public async loadSpecCommits(
        id: string,
        options: CommitOptions,
    ): Promise<RepositoryCommit[]> {
        const url = `${apiEndpoint()}/test/${encodeURIComponent(id)}/commits`;
        const list = await get(url);
        this._active_commit.set(LATEST_COMMIT);
        return [LATEST_COMMIT, ...list];
    }

    public async runSpec(options: RunTestOptions = {}) {
        options = this._generateRunOptions(options);
        const query = toQueryString(options);
        const url = `${apiEndpoint()}/test${query ? '?' + query : ''}`;
        return post(url, query, 'text').then((data) =>
            this._parseResponse(data),
        );
    }

    public runSpecWithFeedback(
        options: RunTestOptions = {},
        onMessage: (message: string) => void,
        onComplete: () => void,
    ): () => void {
        options = this._generateRunOptions(options);
        const query = toQueryString(options);
        const secure = location.protocol.includes('https');
        const url = `ws${secure ? 's' : ''}://${location.host}/test/run_spec${
            query ? '?' + query : ''
        }`;
        const socket = new WebSocket(url);
        socket.addEventListener('message', ({ data }) =>
            onMessage(this._parseResponse(data)),
        );
        socket.addEventListener('error', () => onMessage(''));
        socket.addEventListener('close', () => onComplete());
        return () => {
            if (
                socket.readyState === WebSocket.OPEN ||
                socket.readyState === WebSocket.CONNECTING
            ) {
                socket.close();
            }
        };
    }

    private _generateRunOptions(options: RunTestOptions = {}) {
        const repo = this._build.getRepository() || options.repository;
        return {
            repository: repo === 'Public' ? undefined : repo,
            driver: this._build.getDriver() || options.driver,
            spec: this._active_spec() || options.spec,
            commit: this._build.getCommit()?.commit || options.commit,
            spec_commit: this._active_commit()?.commit || options.spec_commit,
            force: this._settings().force || options.force,
            debug: this._settings().debug_symbols || options.debug,
        };
    }

    private _processMessage({ type, output }: TestResponse): string {
        let result = output || '';
        if (type === 'failure') {
            try {
                const value =
                    typeof output === 'string' ? JSON.parse(output) : output;
                result = `${JSON.stringify(value, undefined, 4)}`;
            } catch (e) {}
            console.info(`✗`, result);
            return result;
        } else if (type === 'not_found') {
            return `\\033[31mTest specifications not found.`;
        } else if (type === 'success') {
            try {
                const value =
                    typeof output === 'string' ? JSON.parse(output) : output;
                result = `${JSON.stringify(value, undefined, 4)}`;
            } catch (e) {}
            console.info(`✓`, result);
            return result;
        }
        return `${
            typeof output !== 'string'
                ? JSON.stringify(output, undefined, 4)
                : output
        }`;
    }

    private _parseResponse(data: any) {
        let json: any = data;
        try {
            json = JSON.parse(data);
        } catch (e) {}
        const value = `${
            typeof json === 'string' ? json : this._processMessage(json)
        }`;
        return value;
    }

    private async reloadSpecFiles(repo: string): Promise<void> {
        const request = ++this._spec_list_request;
        const list = await this.loadSpecFiles({
            repository: repo === 'Public' ? '' : repo,
        }).catch(() => []);
        if (request === this._spec_list_request) this._spec_list.set(list);
    }

    private async reloadSpecCommits(spec: string): Promise<void> {
        const request = ++this._commit_list_request;
        const list = spec
            ? await this.loadSpecCommits(spec, {
                  repository: spec === 'Public' ? undefined : spec,
              }).catch(() => [])
            : [];
        if (request === this._commit_list_request) this._commit_list.set(list);
    }

    private selectClosestSpec(driver: string, list: string[]): void {
        if (!driver || !list.length) {
            this._active_spec.set('');
            return;
        }
        const comp = list.map((spec: string) => ({
            spec,
            similarity: this.stringSimilarity(spec, driver),
        }));
        comp.sort((a: any, b: any) => b.similarity - a.similarity);
        this._active_spec.set(comp[0].similarity > 0.7 ? comp[0].spec : '');
    }

    private stringSimilarity(a: string, b: string): number {
        const first = this.normaliseSimilarityInput(a);
        const second = this.normaliseSimilarityInput(b);
        if (first === second) return 1;
        if (first.length < 2 || second.length < 2) return 0;

        const firstPairs = this.wordLetterPairs(first);
        const secondPairs = this.wordLetterPairs(second);
        const pairCount = firstPairs.length + secondPairs.length;
        let intersection = 0;

        for (const pair of firstPairs) {
            const index = secondPairs.indexOf(pair);
            if (index >= 0) {
                intersection++;
                secondPairs.splice(index, 1);
            }
        }

        return pairCount ? (2 * intersection) / pairCount : 0;
    }

    private wordLetterPairs(value: string): string[] {
        const pairs: string[] = [];
        for (const word of value.split(/\s+/)) {
            for (let i = 0; i < word.length - 1; i++) {
                pairs.push(word.slice(i, i + 2));
            }
        }
        return pairs;
    }

    private normaliseSimilarityInput(value: string): string {
        return value
            .toLowerCase()
            .replace(/[_./-]+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }
}
