export interface IPairingMethod {
    readonly methodName: string;
    readonly dataLength: number;

    retrievePattern(length: number): Promise<Array<number>>;
}

export interface PairingState {
    config: PairingConfig | null;
    state: string;
}

export interface PairingConfig {
    method: string;
    length: number;
}

export interface PairingStatus {
    method: string;
    pattern: Array<number> | null;
}
