const awsIot = require('aws-iot-device-sdk');

class Pairing {
	constructor(device) {
		this.cloud;
		this.qos = 1;
		this.device = device;


		// methods used with simulator
		this.connect = this.connect.bind(this);
		this.onReceiveMessage = this.onReceiveMessage.bind(this);

		// methods used for testing purposes
		this.hasCloud = this.hasCloud.bind(this);
		this.hasQos = this.hasQos.bind(this);
		this.hasDevice = this.hasDevice.bind(this);
	}

	connect() {
		return new Promise((resolve, reject) => {
			try {
				this.cloud = awsIot.device({
		            keyPath: this.device.authentificationDocumentsFilePaths.deviceCertificatePrivateKey,
		            certPath: this.device.authentificationDocumentsFilePaths.deviceCertificate,
		            caPath: this.device.authentificationDocumentsFilePaths.caCertificate,
		            clientId: this.device.deviceId,
		            host: 'a2n7tk1kp18wix.iot.us-east-1.amazonaws.com'
		        });

				// Initial subscriptions are placed here instead of the on('connect')
				// so that we don't resubscribe to the same topics each time we connect
				this.subscribeToTopic([`$aws/things/${this.device.deviceId}/shadow/get/accepted`, `$aws/things/${this.device.deviceId}/shadow/get/rejected`]);
		    } catch (e) {
		    	console.log(`Error connecting to cloud: ${JSON.stringify(e)}`);
		    }
		    
		    this.cloud.on('connect', () => {
		    	console.log("Connected to cloud");
		    	this.getThingShadow();
		    });

		    this.cloud.on('error', error => {
		    	console.log(`Error: ${error}`);
		    });

		    this.cloud.on('close', () => {
		    	this.device.deviceState = 'unknown';
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
				if (message.state.hasOwnProperty('reported')) {
					if (message.state.reported.hasOwnProperty('tenantId')) {
						this.device.deviceState = 'paired';

						// allow connection
						break;
					}
				}

				this.device.deviceState = 'unpaired';

				// do more stuff
				break;
			case `$aws/things/${this.device.deviceId}/shadow/get/rejected`:
				console.log("Can't access thing shadow");
				this.device.deviceState = 'unknown';
				break;
			default:
				console.log(topic);
				console.log(message);
				break;
		}
		console.log(this.device.deviceState);
		console.log("--");
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