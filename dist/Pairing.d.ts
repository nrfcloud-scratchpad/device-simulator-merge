declare const awsIot: any;
declare const AWS: any;
declare class Pairing {
    constructor();
    setDevice(device: any): Promise<{}>;
    setCloudConfiguration(): Promise<{}>;
    connect(): Promise<{}>;
    onReceiveMessage(topic: any, message: any): void;
    evaluateState(): void;
    delay(cb: any): void;
    setTimeout(time: any): Promise<{}>;
    makeNewPairingRequest(): Promise<{}>;
    invokeLambda(config: any): Promise<{}>;
    subscribeToTopic(topic: any): void;
    unsubscribeToTopic(topic: any): void;
    publishToTopic(topic: any, message: any): void;
    getThingShadow(): void;
    endPairing(): void;
    hasCloud(): boolean;
    hasQos(): boolean;
    hasDevice(): boolean;
}
