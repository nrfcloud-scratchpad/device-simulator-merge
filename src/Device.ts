export class Device {
    type: string;
    deviceId: string;
    pairingMethods: Array<string>;
    authentificationDocumentsFilePaths: { [key: string]: string };
    constructor(type: string) {
        if (new.target === Device) {
            throw new TypeError('Cannot create device without specifying type');
        }

        this.type = type;
        this.deviceId;
        this.pairingMethods;

        // methods used with simulator
        this.extractDeviceId = this.extractDeviceId.bind(this);
        this.getPairingMethods = this.getPairingMethods.bind(this);

        // methods used for testing purposes
        this.hasType = this.hasType.bind(this);
        this.hasPairingMethods = this.hasPairingMethods.bind(this);
        this.hasDeviceId = this.hasDeviceId.bind(this);

        this.authentificationDocumentsFilePaths = {
            deviceCertificate: process.env.CERTIFICATE_PATH,
            caCertificate: process.env.CA_CERTIFICATE_PATH,
            deviceCertificatePrivateKey: process.env.PRIVATE_KEY_PATH
        };
    }

    getDeviceType() {
        return this.type;
    }

    getAuthentificationDocuments() {
        return this.authentificationDocumentsFilePaths;
    }

    getPairingMethods() {
        return this.pairingMethods;
    }

    setPairingMethods(methods) {
        return new Promise(resolve => {
            this.pairingMethods = methods;
            resolve();
        });
    }

    createCertificate() {
        // create it
    }

    flashCertificate() {
        // flash it
    }

    extractDeviceId() {
        return new Promise((resolve) => {

            this.deviceId = 'TestThing';
            resolve(this.deviceId);
        });
    }

    hasType() {
        return this.type ? true : false;
    }

    hasPairingMethods() {
        return (this.pairingMethods && this.pairingMethods.length > 0) ? true : false;
    }

    hasDeviceId() {
        return this.deviceId ? true : false;
    }

    hasCertificate() {
        // to be used when we create and flash our own certificates (for now we're just fetching from folder)
    }
}
