export interface MessageStatus {
    received: number;
    sent: number;
}

export interface FirmwareState {
    connects: number;
    connected: boolean;
    messages: MessageStatus;
}

export interface IFirmware {
    main(): Promise<number>;
}

export class FirmwareError extends Error {
    constructor(message: string) {
        super(message);
    }
}
