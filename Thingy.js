const Device = require('./Device');

class Thingy extends Device {
	constructor() {
		super('Thingy', ['colorPattern']);
	}
}

module.exports = Thingy;