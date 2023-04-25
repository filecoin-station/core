export function getPaths({ cacheRoot, stateRoot }: {
    cacheRoot: any;
    stateRoot: any;
}): {
    repoRoot: string;
    metrics: string;
    allMetrics: string;
    activity: string;
    moduleCache: string;
    moduleState: string;
    moduleLogs: string;
    allLogs: string;
    moduleBinaries: string;
    lockFile: string;
};
export function getDefaultRootDirs(): {
    cacheRoot: string;
    stateRoot: string;
};
//# sourceMappingURL=paths.d.ts.map