'use strict';
const Switchbot = require('../lib/switchbot.js');

let switchbot = new Switchbot();
switchbot.discover({
	model: 'T',
	id: 'cb:4e:b9:03:c9:6d',
	//id: 'cb4eb903c96d',
	quick: true,
	duration: 10000
}).then((list) => {
	list.forEach((dev) => {
		console.log(dev);
	});
	process.exit();
}).catch((error) => {
	console.error(error);
})