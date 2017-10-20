export interface IPairingMethod {
    readonly methodName: string;
    readonly dataLength: number;

    retrievePattern(length: number): Promise<Array<number>>;
}

export interface Pairing {
    config: PairingConfig | null;
    state: string;
    iteration: number;
}

export interface PairingConfig {
    method: string;
    length: number;
}

export interface PairingStatus {
    method: string;
    pattern: Array<number> | null;
}
