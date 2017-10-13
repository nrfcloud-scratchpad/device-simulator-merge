declare const fs: any;
declare const pem: any;
declare class Device {
    constructor(type: any);
    getDeviceType(): any;
    getAuthentificationDocuments(): any;
    getPairingMethods(): any;
    setPairingMethods(methods: any): void;
    createCertificate(): void;
    flashCertificate(certificate: any): void;
    extractDeviceId(): Promise<{}>;
    hasType(): boolean;
    hasPairingMethods(): boolean;
    hasDeviceId(): boolean;
    hasCertificate(): void;
}
