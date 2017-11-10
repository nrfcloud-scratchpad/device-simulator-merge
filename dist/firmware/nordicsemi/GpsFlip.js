"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const Firmware_1 = require("../Firmware");
let logger = require('winston');
const GPS = 'GPS';
const GPS_SEND_INTERVAL = 10000;
class GpsFlip {
    constructor(config, pairingEngine, hostConnection, sensors, newLogger) {
        this.config = config;
        this.pairingEngine = pairingEngine;
        this.hostConnection = hostConnection;
        this.state = {
            connects: 0,
            connected: false,
            messages: {
                sent: 0,
                received: 0,
            },
        };
        this.sensors = sensors;
        this.applicationStarted = false;
        this.lastGpsSend = 0;
        if (newLogger) {
            logger = newLogger;
        }
    }
    sendGeneric(appId, messageType, timestamp) {
        const timeStamp = new Date(timestamp).toISOString();
        logger.debug(`Timestamp in message #${this.state.messages.sent}, ${timeStamp} removed from message, since firmware implementation does not support it yet.`);
        const message = {
            appId,
            messageId: this.state.messages.sent,
            messageType: messageType,
        };
        this.state.messages.sent++;
        this.hostConnection.sendMessage(JSON.stringify(message)).catch(error => {
            logger.error(`Error sending ${messageType} to nRF Cloud. Error is ${error.message}.`);
        });
    }
    sendGpsData(timestamp, data) {
        const timeStamp = new Date(timestamp).toISOString();
        logger.debug(`Timestamp in message #${this.state.messages.sent}, ${timeStamp} removed from message, since firmware implementation does not support it yet.`);
        const message = {
            appId: GPS,
            messageId: this.state.messages.sent,
            messageType: 'DATA',
            data
        };
        this.state.messages.sent++;
        this.hostConnection.sendMessage(JSON.stringify(message)).catch(error => {
            logger.error(`Error sending GPS sensor data to nRF Cloud. Error is ${error.message}`);
        });
    }
    startApplication(pairing) {
        return __awaiter(this, void 0, void 0, function* () {
            if (pairing.state === 'paired') {
                if (pairing.topics && pairing.topics.d2c) {
                    yield this.hostConnection.setTopics(pairing.topics.c2d, pairing.topics.d2c);
                    yield this.sendGeneric(GPS, 'HELLO', Date.now());
                    this.applicationStarted = true;
                    logger.info(`Pairing done, application started.`);
                }
                else {
                    logger.warn('Paired but application topics are NOT provided by nRF Cloud.');
                }
            }
        });
    }
    main() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.sensors) {
                throw new Firmware_1.FirmwareError('Sensors not provided. Required by GpsFlip.');
            }
            if (!this.sensors.get('gps')) {
                throw new Firmware_1.FirmwareError('GPS sensor not provided. Required by GpsFlip.');
            }
            this.pairingEngine.on('pairingUpdate', (state, status) => {
                logger.debug(`gpsFlip; updating shadow -> reported.pairing: ${JSON.stringify(state)} status: ${JSON.stringify(status)}`);
                this.hostConnection.updateShadow({
                    pairing: state === null ? undefined : state,
                    pairingStatus: status,
                });
            });
            this.hostConnection.on('shadowGetAccepted', (shadow) => __awaiter(this, void 0, void 0, function* () {
                this.pairingEngine.updatePairingState(shadow.desired.pairing);
                if (shadow.desired.pairing && shadow.desired.pairing.state === 'paired') {
                    yield this.startApplication(shadow.desired.pairing);
                }
            }));
            this.hostConnection.on('shadowDelta', (delta) => __awaiter(this, void 0, void 0, function* () {
                if (delta.pairing) {
                    this.pairingEngine.updatePairingState(delta.pairing);
                    if (delta.pairing.state === 'paired') {
                        yield this.startApplication(delta.pairing);
                    }
                }
                else {
                    // Some application specific state is desired, reply back as reported and process afterwards
                    logger.debug(`shadow; json data not related to pairing: ${JSON.stringify(delta)}`);
                    yield this.hostConnection.updateShadow(delta);
                }
            }));
            const gps = this.sensors.get('gps');
            this.hostConnection.on('reconnect', () => {
                logger.info('Reconnecting to nRF Cloud.');
            });
            this.hostConnection.on('connect', () => {
                logger.info('Connected to nRF Cloud.');
            });
            this.hostConnection.on('disconnect', () => {
                logger.info('Disconnected from nRF Cloud.');
            });
            this.hostConnection.on('message', (message) => {
                const demopackMessage = Object.assign({}, message);
                if (demopackMessage.appId === GPS && demopackMessage.messageType === 'OK' &&
                    this.applicationStarted && !gps.isStarted()) {
                    gps.start();
                    logger.info(`Received message ${JSON.stringify(demopackMessage)}`);
                }
                else {
                    logger.info(`Received message (ignoring it) ${JSON.stringify(demopackMessage)}`);
                }
            });
            gps.on('data', (timestamp, data) => {
                if (Date.now() >= this.lastGpsSend + GPS_SEND_INTERVAL) {
                    this.sendGpsData(timestamp, String.fromCharCode.apply(null, data));
                    this.lastGpsSend = Date.now();
                }
            });
            yield this.hostConnection.connect();
            return new Promise(() => {
            });
        });
    }
}
exports.GpsFlip = GpsFlip;
//# sourceMappingURL=GpsFlip.js.map