import {
    inject,
    Injectable,
    linkedSignal,
    resource,
    signal,
} from '@angular/core';

import { apiEndpoint, toQueryString } from '../common/api';
import { get, post } from '../common/http';
import {
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

    /** User settings for test runs */
    private _settings = signal<TestSettings>({});

    /** Spec files available in the selected repository */
    private _spec_list = resource({
        params: () => this._build.active_repo() || undefined,
        loader: ({ params: repo, abortSignal }) => {
            const query = toQueryString({
                repository: repo === 'Public' ? '' : repo,
            });
            const url = `${apiEndpoint()}/test${query ? '?' + query : ''}`;
            return get<string[]>(url, abortSignal).catch(() => []);
        },
        defaultValue: [] as string[],
    });

    /** Selected spec file, defaults to the closest match for the driver */
    private _active_spec = linkedSignal({
        source: () => ({
            driver: this._build.active_driver(),
            list: this._spec_list.value(),
        }),
        computation: ({ driver, list }) => this.closestSpec(driver, list),
    });

    /** Commits available for the selected spec file */
    private _commit_list = resource({
        params: () => this._active_spec() || undefined,
        loader: async ({ params: spec, abortSignal }) => {
            const url = `${apiEndpoint()}/test/${encodeURIComponent(
                spec,
            )}/commits`;
            const list = await get<RepositoryCommit[]>(url, abortSignal).catch(
                () => null,
            );
            return list ? [LATEST_COMMIT, ...list] : [];
        },
        defaultValue: [] as RepositoryCommit[],
    });

    /** Selected spec commit, resets when the commit list reloads */
    private _active_commit = linkedSignal<
        RepositoryCommit[],
        RepositoryCommit | null
    >({
        source: this._commit_list.value,
        computation: (commits) => commits[0] || null,
    });

    /** Socket for the active test run */
    private _socket: WebSocket | null = null;
    /** Accumulated output of the active or last test run */
    private _run_output = signal('');
    /** Whether a test run is currently in progress */
    private _run_active = signal(false);

    public readonly active_spec = this._active_spec.asReadonly();

    public readonly active_commit = this._active_commit.asReadonly();

    public readonly settings = this._settings.asReadonly();

    public readonly spec_list = this._spec_list.value.asReadonly();

    public readonly commit_list = this._commit_list.value.asReadonly();

    public readonly run_output = this._run_output.asReadonly();

    public readonly run_active = this._run_active.asReadonly();

    public setSpec(spec: string): void {
        this._active_spec.set(spec);
    }

    public setCommit(commit: RepositoryCommit): void {
        this._active_commit.set(commit);
    }

    public setSettings(options: TestSettings): void {
        this._settings.update((current) => ({ ...current, ...options }));
    }

    public async runSpec(options: RunTestOptions = {}) {
        options = this._generateRunOptions(options);
        if (!options.spec) return;
        const query = toQueryString(options);
        const url = `${apiEndpoint()}/test${query ? '?' + query : ''}`;
        return post(url, query, 'text').then((data) =>
            this._parseResponse(data),
        );
    }

    /** Run the selected spec, streaming results into the run signals */
    public async startSpecRun(options: RunTestOptions = {}): Promise<void> {
        this.stopSpecRun();
        this._run_output.set('');
        this._run_active.set(true);
        if (localStorage.getItem('DEBUG_WITH_API')) {
            const result = await this.runSpec(options).catch((e) => `${e}`);
            this._appendRunOutput(result);
            this._run_active.set(false);
            return;
        }
        options = this._generateRunOptions(options);
        if (!options.spec) return;
        const query = toQueryString(options);
        const secure = location.protocol.includes('https');
        const url = `ws${secure ? 's' : ''}://${location.host}/test/run_spec${
            query ? '?' + query : ''
        }`;
        const socket = new WebSocket(url);
        this._socket = socket;
        socket.addEventListener('message', ({ data }) =>
            this._appendRunOutput(this._parseResponse(data)),
        );
        socket.addEventListener('error', () => this._appendRunOutput(''));
        socket.addEventListener('close', () => {
            if (this._socket !== socket) return;
            this._socket = null;
            this._run_active.set(false);
        });
    }

    /** Close the active test run socket */
    public stopSpecRun(): void {
        const socket = this._socket;
        this._socket = null;
        this._run_active.set(false);
        if (
            socket &&
            (socket.readyState === WebSocket.OPEN ||
                socket.readyState === WebSocket.CONNECTING)
        ) {
            socket.close();
        }
    }

    public clearRunOutput(): void {
        this._run_output.set('');
    }

    private _appendRunOutput(message: string): void {
        this._run_output.update((current) => current + message);
        const passed = message.includes('exited with 0');
        this._build.setTestStatus(passed ? 'passed' : 'failed');
        if (passed) this.stopSpecRun();
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

    private closestSpec(driver: string, list: string[]): string {
        if (!driver || !list.length) return '';
        const comp = list.map((spec: string) => ({
            spec,
            similarity: this.stringSimilarity(spec, driver),
        }));
        comp.sort((a: any, b: any) => b.similarity - a.similarity);
        return comp[0].similarity > 0.7 ? comp[0].spec : '';
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
