const fs = require('fs');
const pem = require('pem');

class Device {
	constructor(type, pairingMethods) {
		if (new.target === Device) {
			throw new TypeError('Cannot create device without specifying type');
		}

		this.type = type;
		this.pairingMethods = pairingMethods;
		this.deviceId;
		this.deviceState = 'unknown';		

		// methods used with simulator
		this.extractDeviceId = this.extractDeviceId.bind(this);

		// methods used for testing purposes
		this.hasType = this.hasType.bind(this);
		this.hasPairingMethods = this.hasPairingMethods.bind(this);
		this.hasDeviceId = this.hasDeviceId.bind(this);

		this.authentificationDocumentsFilePaths = {
			deviceCertificate: 'authentificationDocuments/deviceCertificate.pem.crt',
			caCertificate: 'authentificationDocuments/caCertificate.pem',
			deviceCertificatePrivateKey: 'authentificationDocuments/privateKey.pem.key'
		}
	}

	getDeviceType() {
		return this.type;
	}

	getPairingMethods() {
		return this.pairingMethods;
	}

	getAuthentificationDocuments() {
		return this.authentificationDocuments;
	}

	extractDeviceId() {
		return new Promise((resolve, reject) => {
			fs.readFile(this.authentificationDocumentsFilePaths.deviceCertificate, (err, devCert) => {
	            if (err) {
	                console.log("Rejected: Reading device certificate failed");
	                console.log(err);
	                reject();
	            } else {
					pem.readCertificateInfo(devCert.toString(), (err2, certificateInformation) => {
		                if (err2) {
		                    console.log("Rejected: Couldn't read certificate information");
		                    console.log(err2);
		                    reject();
		                } else {
		                    this.deviceId = certificateInformation.commonName;

		                    console.log("Resolved: Read and set device id to: " + this.deviceId);
		                    resolve();
		                }
		            })
		        }
			})
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
}

module.exports = Device;
