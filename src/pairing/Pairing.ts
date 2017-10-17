export interface IPairingMethod {
    readonly methodName: string;
    readonly dataLength: number;

    retrievePairingData(): Promise<Array<number>>;
}

export interface PairingState {
    config: PairingConfig | null;
    paired: boolean;
    status: string;
}

export interface PairingConfig {
    method: string;
    length: number;
}

export interface PairingStatus {
    supports: Array<string>;
    method: string;
    pattern: Array<number> | null;
}
