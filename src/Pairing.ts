const awsIot = require('aws-iot-device-sdk');
const AWS = require('aws-sdk');

AWS.config.update({
    region: process.env.AWS_REGION || 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

class Pairing {
    cloud: any;
    cloudConfiguration: { [key: string]: string };
    qos: number;
    device: any;
    STATE: string;
    lambda: any;
    timeout: any;
    constructor() {
        this.cloud;
        this.cloudConfiguration;
        this.qos = 1;
        this.device;
        this.STATE;
        this.lambda = new AWS.Lambda();
        this.timeout;

        // methods used with simulator
        this.connect = this.connect.bind(this);
        this.onReceiveMessage = this.onReceiveMessage.bind(this);
        this.evaluateState = this.evaluateState.bind(this);
        this.setCloudConfiguration = this.setCloudConfiguration.bind(this);
        this.delay = this.delay.bind(this);
        this.makeNewPairingRequest = this.makeNewPairingRequest.bind(this);
        this.invokeLambda = this.invokeLambda.bind(this);
        this.getThingShadow = this.getThingShadow.bind(this);

        // methods used for testing purposes
        this.hasCloud = this.hasCloud.bind(this);
        this.hasQos = this.hasQos.bind(this);
        this.hasDevice = this.hasDevice.bind(this);
    }

    setDevice(device) {
        return new Promise((resolve, reject) => {
            try {
                this.device = device;
                resolve();
            } catch (e) {
                console.log('Rejected: Could not set device');
                reject();
            }
        });
    }

    setCloudConfiguration() {
        return new Promise((resolve, reject) => {
            if (this.device) {
                this.cloudConfiguration = {
                    keyPath: this.device.authentificationDocumentsFilePaths.deviceCertificatePrivateKey,
                    certPath: this.device.authentificationDocumentsFilePaths.deviceCertificate,
                    caPath: this.device.authentificationDocumentsFilePaths.caCertificate,
                    clientId: this.device.deviceId,
                    host: process.env.HOST
                };

                resolve();
            } else {
                console.log('Rejected: Could not specify configuration as device and its documents are not set');
                reject();
            }
        });
    }

    connect() {
        return new Promise((resolve, reject) => {
            try {
                this.cloud = awsIot.device(this.cloudConfiguration);

                // Initial subscriptions are placed here instead of the on('connect')
                // so that we don't resubscribe to the same topics each time we connect
                console.log(this.device.deviceId);
                this.subscribeToTopic([
                    `$aws/things/${this.device.deviceId}/shadow/get/accepted`,
                    `$aws/things/${this.device.deviceId}/shadow/get/rejected`,
                    `$aws/things/${this.device.deviceId}/shadow/update/rejected`,
                    `$aws/things/${this.device.deviceId}/shadow/update/delta`
                ]);
            } catch (e) {
                console.log(`Rejected: Error connecting to cloud: ${JSON.stringify(e)}`);
                reject(e);
            }
            this.cloud.on('connect', () => {
                console.log('Connected to cloud');
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

            resolve();
        });
    }

    onReceiveMessage(topic, message) {
        message = JSON.parse(message.toString());
        console.log(topic);
        console.log(message);
        switch (topic) {
            case `$aws/things/${this.device.deviceId}/shadow/get/accepted`:
                if (
                    message.hasOwnProperty('state') &&
                    message.state.hasOwnProperty('desired') &&
                    message.state.desired.hasOwnProperty('pairing') &&
                    message.state.desired.pairing.hasOwnProperty('paired')
                ) {
                    switch (message.state.desired.pairing.paired) {
                        case true:
                            this.STATE = 'PAIRED';
                            break;

                        case false:
                            if (message.state.desired.pairing.hasOwnProperty('status')) {
                                switch (message.state.desired.pairing.status) {
                                    case 'initiate':
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
                break;

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
                this.delay(this.getThingShadow, 60000);
                break;

            default:
                break;
        }
    }

    delay(cb, time) {
        return new Promise((resolve, reject) => {
            this.timeout = setTimeout(function() {
                cb().then(() => {
                    resolve();
                })
                .catch(reason => {
                    console.log(reason);
                    reject();
                });
            }.bind(this), time);
            });
        }

    makeNewPairingRequest() {
        return new Promise((resolve) => {
            const supportedPairingMethods = this.device.getPairingMethods();
            console.log('pairing methods');
            console.log(supportedPairingMethods);
            const message = JSON.stringify({'state': {'reported': {'pairingStatus': {'supports': supportedPairingMethods}}}});
            console.log(message);
            /*const pairingRequestLambdaConfig = {
                FunctionName: 'dua-pairingrequest',
                InvocationType: 'Event',
            };*/

            this.publishToTopic(`$aws/things/${this.device.deviceId}/shadow/update`, message);
            resolve();
            /*
            this.invokeLambda(pairingRequestLambdaConfig)
            .then(() => {
                console.log('Resolved: Made new pairing request');
                resolve();
            })
            .catch(reason => {
                console.log('Rejected: Making of pairing request failed due to problems with lambda function.');
                reject(reason);
            });*/
        });
    }

    invokeLambda(config) {
        return new Promise((resolve, reject) => {
            if (config.hasOwnProperty('FunctionName')) {
                this.lambda.invoke(config, function(error, data) {
                    if (error) {
                        console.log('Rejected: Lambda function could not resolve:');
                        console.log(error);
                        reject(error);
                    } else {
                        console.log(data);
                        resolve(data);
                    }
                });
            } else {
                console.log('Rejected: Configuration does not contain name of function you want to invoke');
                reject();
            }
        });
    }

    subscribeToTopic(topic) {
        this.cloud.subscribe(topic, {qos: this.qos});
    }

    unsubscribeToTopic(topic) {
        this.cloud.unsubscribe(topic);
    }

    publishToTopic(topic, message) {
        this.cloud.publish(topic, message, {qos: this.qos});
    }

    getThingShadow() {
        return new Promise(resolve => {
            this.publishToTopic(`$aws/things/${this.device.deviceId}/shadow/get`, '');
            resolve();
        });
    }

    endPairing() {
        // do stuff
        console.log('Pairing is completed');
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

export = Pairing;
