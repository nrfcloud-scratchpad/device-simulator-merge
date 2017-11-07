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
const events_1 = require("events");
let logger = require('winston');
class FakeHostConnection extends events_1.EventEmitter {
    constructor(onUpdateShadow, onSendMessage, newLogger) {
        super();
        this.onUpdateShadow = onUpdateShadow;
        this.onSendMessage = onSendMessage;
        if (newLogger) {
            logger = newLogger;
        }
    }
    connect() {
        this.emit('connect');
        this.emit('shadowDelta', {
            pairing: {
                state: 'initiate'
            }
        });
        return;
    }
    disconnect() {
        this.emit('disconnect');
        return;
    }
    updateShadow(reported) {
        return __awaiter(this, void 0, void 0, function* () {
            logger.debug(`Fake: Updating shadow.reported on host '${JSON.stringify(reported)}'`);
            if (this.onUpdateShadow) {
                yield this.onUpdateShadow(reported);
            }
            this.reported = reported;
        });
    }
    sendMessage(message) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.onSendMessage) {
                yield this.onSendMessage(this.d2c, message);
            }
            return;
        });
    }
    setTopics(c2d, d2c) {
        return __awaiter(this, void 0, void 0, function* () {
            this.c2d = c2d;
            this.d2c = d2c;
        });
    }
}
exports.FakeHostConnection = FakeHostConnection;
//# sourceMappingURL=FakeHostConnection.js.map