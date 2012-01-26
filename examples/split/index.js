var task = require('./task_helper.js');

task.prototype.run = function(msg, self){
	self.emit("count", msg.values[0].split(" "));
};

var t = new task();
t.start();

