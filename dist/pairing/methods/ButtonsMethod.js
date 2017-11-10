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
const readline = require("readline");
class SwitchesMethod {
    addKeypress(key) {
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
    retrievePattern(patternLength) {
        this.patternLength = patternLength;
        console.log(`Press buttons 1-${this.numberOfButtons} ${this.patternLength} times.`);
        return new Promise((resolve, reject) => {
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
                    resolve(Array.prototype.slice.call(this.pattern, 0));
                }
            });
        });
    }
    cancelRetrievePattern() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.rejectRetrievePattern) {
                this.rejectRetrievePattern('Canceled retrieval of pattern');
            }
            process.stdin.pause();
            if (process.stdin.isTTY) {
                process.stdin.setRawMode(false);
            }
            process.stdin.removeAllListeners('keypress');
        });
    }
    constructor(numberOfButtons) {
        this.numberOfButtons = numberOfButtons;
        this.methodName = 'buttons';
    }
}
exports.SwitchesMethod = SwitchesMethod;
//# sourceMappingURL=ButtonsMethod.js.map