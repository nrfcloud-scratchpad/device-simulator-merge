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
class DummySensor extends events_1.EventEmitter {
    constructor(dummyData, interval) {
        super();
        this.dummyData = dummyData;
        this.interval = interval;
    }
    start() {
        return __awaiter(this, void 0, void 0, function* () {
            this.tick = setInterval(() => {
                this.emit('data', Date.now(), this.dummyData);
            }, this.interval);
        });
    }
    cleanUp() {
        if (this.tick) {
            clearInterval(this.tick);
        }
    }
    stop() {
        return __awaiter(this, void 0, void 0, function* () {
            this.cleanUp();
            return;
        });
    }
}
exports.DummySensor = DummySensor;
//# sourceMappingURL=DummySensor.js.map