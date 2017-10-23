import { EventEmitter } from 'events';
import { HostConnectionError, IHostConnection } from './HostConnection';
import { ConfigurationData } from '../ConfigurationStorage';
import { ShadowModel, ShadowModelDesired, ShadowModelReported, Topics } from '../ShadowModel';

import * as awsIot from 'aws-iot-device-sdk';

let logger = require('winston');

export class AWSIoTHostConnection extends EventEmitter implements IHostConnection {
    private config: ConfigurationData;
    private topics: Topics;
    private mqtt: awsIot.device;

    constructor(config: ConfigurationData, newLogger?: any) {
        super();

        this.config = config;

        if (newLogger) {
            logger = newLogger;
        }
    }

    private getShadowBaseTopic(): string {
        return `$aws/things/${this.config.clientId}/shadow`;
    }

    async updateShadow(reported: ShadowModelReported): Promise<void> {
        this.mqtt.publish(`${this.getShadowBaseTopic()}/update`, JSON.stringify(reported));
    }

    connect(): Promise<void> {
        logger.debug(`Connecting to nRF Cloud stage ${this.config.stage}`);

        return new Promise<void>((resolveConnect, rejectConnect) => {
            try {
                this.mqtt = new awsIot.device({
                    ca: this.config.caCert,
                    clientCert: this.config.clientCert,
                    privateKey: this.config.privateKey,
                    clientId: this.config.clientId,
                    host: this.config.brokerHostname,
                    region: this.config.region
                });

                this.mqtt.subscribe(`${this.getShadowBaseTopic()}/get/accepted`);
                this.mqtt.subscribe(`${this.getShadowBaseTopic()}/delta`);
            } catch (error) {
                logger.error(`Error connecting to nRF Cloud. ${error}`);
                rejectConnect(error);
            }

            this.mqtt.on('error', (error: any) => {
                logger.error(`AWS IoT error ${error.message}`);

                // Do a guess if gateway has been deleted on the backend
                if (this.mqtt
                    && error
                    && error.code === 'EPROTO'
                    && error.message.indexOf('alert certificate unknown') > -1
                    && error.message.indexOf('SSL alert number 46') > -1
                ) {
                    logger.error(`This device has its certificate revoked.`);
                }
            });

            this.mqtt.on('connect', () => {
                this.emit('connect');
                this.mqtt.publish(`${this.getShadowBaseTopic()}/get`, '');

                if (resolveConnect) {
                    resolveConnect();
                }
            });

            this.mqtt.on('close', () => {
                logger.info(`Disconnected from nRF Cloud.`);
                this.emit('disconnect');
            });

            this.mqtt.on('reconnect', () => {
                logger.info('Reconnecting to nRF Cloud.');
            });

            this.mqtt.on('message', (topic: string, payload: any) => {
                if (payload == null || payload === '') {
                    return;
                }

                const shadowBaseTopic = this.getShadowBaseTopic();

                switch (topic) {
                    case `${shadowBaseTopic}/get/accepted`:
                        const shadow = <ShadowModel>JSON.parse(payload);
                        this.emit('shadowGetAccepted', shadow);
                        break;
                    case `${shadowBaseTopic}/update/delta`:
                        const state = <ShadowModelDesired>JSON.parse(payload);
                        this.emit('shadowDelta', state);
                        break;
                    default:
                        if (this.topics && this.topics.c2d && this.topics.c2d === topic) {
                            this.emit('message', payload);
                        } else {
                            logger.error(`Received message on unknown topic '${topic}', message '${JSON.parse(payload)}'`);
                        }
                        break;
                }
            });
        });
    }

    private async unsubscribeFromAll(): Promise<void> {
        const shadowBaseTopic = this.getShadowBaseTopic();

        this.mqtt.unsubscribe(`${shadowBaseTopic}/get/accepted`);
        this.mqtt.unsubscribe(`${shadowBaseTopic}/update/delta`);
        this.mqtt.unsubscribe(`${shadowBaseTopic}/get`);

        if (this.topics && this.topics.c2d) {
            this.mqtt.unsubscribe(this.topics.c2d);
        }
    }

    async disconnect(): Promise<void> {
        await this.unsubscribeFromAll();
        this.mqtt.end(true);
        return;
    }

    async sendMessage(message: string): Promise<void> {
        if (!this.topics || !this.topics.d2c) {
            throw new Error(`Application topic to send message to not provided.`);
        }

        if (!this.mqtt) {
            throw new HostConnectionError('No MQTT client provided.');
        }

        return new Promise<void>((resolve, reject) => {
            this.mqtt.publish(this.topics.d2c, message, null, error => {
                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
            });
        });
    }
}
