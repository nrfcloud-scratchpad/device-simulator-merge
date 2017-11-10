import { IPairingMethod } from '../Pairing';
import * as readline from 'readline';

export class SwitchesMethod implements IPairingMethod {
    methodName: string;
    patternLength: number;
    numberOfButtons: number;
    pattern: Buffer;
    idx: number;
    rejectRetrievePattern: any;

    addKeypress(key: string) {
        const keyId = key.charCodeAt(0) - '0'.charCodeAt(0);
        if (!(keyId > 0 && keyId <= this.numberOfButtons)) {
            return;
        }

        const pos = Math.floor(this.idx / 2);
        const prev = this.pattern.readUInt8(pos);
        const value = keyId | (prev << ((this.idx % 2) * 4));

        // console.log(`keyId: ${keyId} pos: ${pos} prev: ${prev} value: ${value}`);

        this.pattern.writeUInt8(value, pos);
        this.idx++;
    }

    retrievePattern(patternLength: number): Promise<Array<number>> {
        this.patternLength = patternLength;
        console.log(`Press buttons 1-${this.numberOfButtons} ${this.patternLength} times.`);

        return new Promise<Array<number>>((resolve, reject) => {
            this.rejectRetrievePattern = reject;

            readline.emitKeypressEvents(process.stdin);

            if (process.stdin.isTTY) {
                process.stdin.setRawMode(true);
            }

            this.idx = 0;
            this.pattern = Buffer.alloc(this.patternLength / 2 + (this.patternLength % 2));

            process.stdin.resume();
            process.stdin.on('keypress', str => {
                this.addKeypress(str);

                if (this.idx >= this.patternLength) {
                    console.log(`Pattern recorded. Pattern is (hex): ${this.pattern.toString('hex')}`);
                    process.stdin.pause();

                    if (process.stdin.isTTY) {
                        process.stdin.setRawMode(false);
                    }

                    this.rejectRetrievePattern = null;
                    resolve(<Array<number>>Array.prototype.slice.call(this.pattern, 0));
                }
            });
        });
    }

    async cancelRetrievePattern(): Promise<void> {
        if (this.rejectRetrievePattern) {
            this.rejectRetrievePattern('Canceled retrieval of pattern');
        }

        process.stdin.pause();

        if (process.stdin.isTTY) {
            process.stdin.setRawMode(false);
        }

        process.stdin.removeAllListeners('keypress');
    }

    constructor(numberOfButtons: number) {
        this.numberOfButtons = numberOfButtons;
        this.methodName = 'buttons';
    }
}
