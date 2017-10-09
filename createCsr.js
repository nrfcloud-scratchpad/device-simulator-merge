const pem = require('pem');
const fs = require('fs');

// need this to create my own csr's with compliant common names (one-click certificates from AWS IOT use spaces in their common names
// which we cant use if we want the device name to match the common name from the csr)


csrOptions = {
	commonName: 'TestThing',
}

pem.createCSR(csrOptions, (err, data) => {
	fs.writeFile('csr.txt', data['csr'], err => {
		if (err) {
			console.log("pls");
		} else {
			fs.writeFile('pk.txt', data['clientKey'], err2 => {
				if (err2) {
					console.log("pls2");
				}
			})
		}
	})
});
