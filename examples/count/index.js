var task = require('./task_helper.js');

var counts = {};

task.prototype.run = function(msg, self){
	for(i in msg.values)
	{
		if(msg.values[i] in counts)
		{
			counts[msg.values[i]]++;
		}
		else 
		{
			counts[msg.values[i]] = 1;
		}
		
		self.emit("done", [msg.values[i], counts[msg.values[i]]]);
	}
};

var t = new task();
t.start();
