declare class Cli {
    pairingSession: any;
    stepInProgress: boolean;
    currentStep: number;
    constructor(pairing: typeof Pairing);
    closeSession(): void;
}
