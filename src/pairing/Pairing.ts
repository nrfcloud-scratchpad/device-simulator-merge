export interface IPairingMethod {
    readonly methodName: string;
    readonly patternLength: number;

    retrievePattern(length: number): Promise<Array<number>>;
}

export interface Pairing {
    config: PairingConfig | null;
    state: string;
    iteration: number;
    topics: Topics;
}

export interface PairingConfig {
    method: string;
    length: number;
}

export interface PairingStatus {
    method: string;
    pattern: Array<number> | null;
}

export interface Topics {
    c2d: string;
    d2c: string;
}
