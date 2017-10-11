const awsIot = require('aws-iot-device-sdk');
const AWS = require('aws-sdk');
AWS.config.update({
	region: 'us-east-1',
	accessKeyId: 'AKIAJBNH7Y2KPGXQ4YGA',
	secretAccessKey: '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'
});

class Pairing {
	constructor() {
		this.cloud;
		this.cloudConfiguration;
		this.qos = 1;
		this.device;
		this.STATE;
		this.lambda = new AWS.Lambda();
		this.timeoutTime = 1000;

		// methods used with simulator
		this.connect = this.connect.bind(this);
		this.onReceiveMessage = this.onReceiveMessage.bind(this);

		// methods used for testing purposes
		this.hasCloud = this.hasCloud.bind(this);
		this.hasQos = this.hasQos.bind(this);
		this.hasDevice = this.hasDevice.bind(this);
	}

	setDevice(device) {
		this.device = device;
	}

	setCloudConfiguration() {
		return new Promise((resolve, reject) => {
			if (this.device) {
				this.cloudConfiguration = {
					keyPath: this.device.authentificationDocumentsFilePaths.deviceCertificatePrivateKey,
		            certPath: this.device.authentificationDocumentsFilePaths.deviceCertificate,
		            caPath: this.device.authentificationDocumentsFilePaths.caCertificate,
		            clientId: this.device.deviceId,
		            host: 'a2n7tk1kp18wix.iot.us-east-1.amazonaws.com'
				}

				resolve();
			} else {
				console.log('Rejected: Could not specify configuration as device and its documents are not set');
				reject();
			}
		})
	}

	connect() {
		return new Promise((resolve, reject) => {
			try {
				this.cloud = awsIot.device(this.cloudConfiguration);

				// Initial subscriptions are placed here instead of the on('connect')
				// so that we don't resubscribe to the same topics each time we connect
				this.subscribeToTopic([
					`$aws/things/${this.device.deviceId}/shadow/get/accepted`,
					`$aws/things/${this.device.deviceId}/shadow/get/rejected`,
					`$aws/things/${this.device.deviceId}/shadow/update/rejected`,
					`$aws/things/${this.device.deviceId}/shadow/update/delta`
				]);
		    } catch (e) {
		    	console.log(`Rejected: Error connecting to cloud: ${JSON.stringify(e)}`);
		    	reject();
		    }
		    
		    this.cloud.on('connect', () => {
		    	console.log("Connected to cloud");
		    	this.getThingShadow();
		    });

		    this.cloud.on('error', error => {
		    	console.log(`Error: ${error}`);
		    });

		    this.cloud.on('close', () => {
		    	this.STATE = 'UNKNOWN';
		    });

		    this.cloud.on('message', this.onReceiveMessage);

		    process.on('SIGINT', () => {
		    	this.unsubscribeToTopic('#');
            	process.exit();
        	});
		})
	}

	onReceiveMessage(topic, message) {
		message = JSON.parse(message.toString());
		console.log(message);
		console.log("--");
		switch (topic) {
			case `$aws/things/${this.device.deviceId}/shadow/get/accepted`:
				if (
					message.state.hasOwnProperty('desired') &&
					message.state.reported.hasOwnProperty('pairing') &&
					message.state.reported.pairing.hasOwnProperty('paired')
				) {
					switch (message.state.reported.pairing.paired) {
						case true:
							this.STATE = 'PAIRED';
							break;

						case false:
							if (message.state.reported.pairing.hasOwnProperty('status')) {
								switch (message.state.reported.pairing.status) {
									case: 'initiate':
										this.STATE = 'INITIATE';
										break;

									case 'waiting_for_pattern':
										this.STATE = 'WAITING_FOR_PATTERN';
										break;

									case 'timeout':
										this.STATE = 'TIMEOUT';
										break;

									case 'pattern_mismatch':
										this.STATE = 'PATTERN_MISMATCH';
										break;
								}
							} else {
								this.STATE = 'ERROR';
							}

							break;

						default:
							this.STATE = 'ERROR';
							break;
					}
				} else {
					// publish message to update document with necessary attributes?
					this.STATE = 'ERROR';
				}

				this.evaluateState();

				// react based on device state
			case `$aws/things/${this.device.deviceId}/shadow/get/rejected`:
				this.STATE = 'ERROR';
				this.evaluateState();
				break;

			case `$aws/things/${this.device.deviceId}/shadow/update/rejected`:
				console.log(topic);
				console.log(message);

				// handle based on state - set state to error? 
				this.STATE = 'ERROR';
				break;

			case `$aws/things/${this.device.deviceId}/shadow/update/delta`:
				console.log(topic);
				console.log(message);
				break;

			default:
				console.log(topic);
				console.log(message);
				break;
		}
	}

	evaluateState() {
		switch (this.STATE) {
			case 'PAIRED':
				this.endPairing();
				break;

			case 'INITIATE':
				this.makeNewPairingRequest();
				break;

			case 'TIMEOUT':
				// do stuff
				break;

			case 'PATTERN_MISMATCH':
				// do stuff
				break;

			case 'ERROR':
				this.timeout(this.getThingShadow);
				break;

			default:
				break;
		}
	}

	timeout(cb) {
		setTimeout(cb, this.timeoutTime);
	}

	makeNewPairingRequest() {
		return new Promise((resolve, reject) => {
			const supportedPairingMethods = this.device.getPairingMethods();
			const message = {"reported": {"pairingStatus": {"supports": supportedPairingMethods}}}
			const pairingRequestLambdaConfig = {
				FunctionName: 'dua-pairingrequest',
				InvocationType: 'Event',
			}

			this.publishToTopic(`$aws/things/${this.device.deviceId}/shadow/update`, message)

			this.invokeLambda(pairingRequestLambdaConfig)
			.then(() => {
				console.log("Resolved: Made new pairing request");
				resolve();
			})
			.catch(reason => {
				console.log("Rejected: Making of pairing request failed due to problems with lambda function.");
				reject();
			})
		})
	}

	invokeLambda(config) {
		return new Promise((resolve, reject) => {
			if (config.hasOwnProperty('FunctionName')) {
				this.lambda.invoke(config, function(error, data) {
					if (error) {
						console.log("Rejected: Lambda function could not resolve:");
						console.log(error);
						reject(error);
					} else {
						console.log(data);
						resolve(data);
					}
				});
			} else {
				console.log("Rejected: Configuration doesn't contain name of function you want to invoke");
				reject();
			}
		})
	}

	subscribeToTopic(topic) {
		this.cloud.subscribe(topic, {qos:this.qos});
	}

	unsubscribeToTopic(topic) {
		this.cloud.unsubscribe(topic);
	}

	publishToTopic(topic, message) {
		this.cloud.publish(topic, message, {qos:this.qos})
	}

	getThingShadow() {
		this.publishToTopic(`$aws/things/${this.device.deviceId}/shadow/get`, '');
	}

	endPairing() {
		// do stuff
		console.log("Pairing is completed");
	}


	hasCloud() {
		return this.cloud ? true : false;
	}

	hasQos() {
		return this.qos ? true : false;
	}

	hasDevice() {
		return this.device ? true : false;
	}
}

module.exports = Pairing;