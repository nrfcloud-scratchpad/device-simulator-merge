const fs = require('fs');
const pem = require('pem');

class Device {
	constructor(type) {
		if (new.target === Device) {
			throw new TypeError('Cannot create device without specifying type');
		}

		this.type = type;
		this.deviceId;
		this.pairingMethods;	

		// methods used with simulator
		this.extractDeviceId = this.extractDeviceId.bind(this);

		// methods used for testing purposes
		this.hasType = this.hasType.bind(this);
		this.hasPairingMethods = this.hasPairingMethods.bind(this);
		this.hasDeviceId = this.hasDeviceId.bind(this);

		this.authentificationDocumentsFilePaths = {
			deviceCertificate: process.env.CERT_PATH,
			caCertificate: process.env.CA_PATH,
			deviceCertificatePrivateKey: process.env.KEY_PATH
		}
	}


	getDeviceType() {
		return this.type;
	}

	getAuthentificationDocuments() {
		return this.authentificationDocuments;
	}

	getPairingMethods() {
		return this.pairingMethods;
	}

	setPairingMethods(methods) {
		this.pairingMethods = methods;
	}

	createCertificate() {
		// create it
	}

	flashCertificate(certificate) {
		// flash it
	}

	extractDeviceId() {
		
		return new Promise((resolve, reject) => {
			this.deviceId = 'TestThing';
			resolve();
		})
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

module.exports = Device;
