var util = require('util'),
	cluster = require('cluster'),
	spawn = require('child_process').spawn,
	daemonConfig = require('./config.js'),
	zmq = require('zmq'),
	u = require('./utils.js'),
	defaults = require('./defaults.js');

daemonConfig = u.merge_options(defaults, daemonConfig);	

var Master = function(){
	this.config = daemonConfig;	
	this.sock = zmq.socket("pull");
	this.client_sock = zmq.socket("pull");
};

Master.prototype = {
	zk: null,
	
	config: {},
	tasks: [],
	
	sock: null,
	client_sock: null,
	
	slaves: [],
	
	start: function() {
		var self = this;
		
		self.sock.bindSync("tcp://" + this.config.master_bindaddr + ":" + this.config.master_port);
		
		self.sock.on('message', function(msg){
			msg = msg.toString("utf8");
			var data = JSON.parse(msg);

			console.log("New slave connected and registering from " + data.host + ":" + data.port);
				
			var slavesock = zmq.socket("pair");
				
			slavesock.on("error", function(err){ console.log("Error: " + err); });
				
			slavesock.on('message', function(msg){
				self.messageProc(data.id, self.parseMsg(msg), self);
			});
				
			slavesock.connect("tcp://" + data.host + ":" + data.port);
				
			self.slaves[data.id] = {
				sock: slavesock,
				info: data,
				tasks: []
			};			
				
			setInterval(function() { slavesock.send('PING'); }, self.config.heartbeat_tick);
		});
		
		self.client_sock.on("message", function(msg){
			self.clientMsgProc(self.parseMsg(msg), self);			
		});
		
		self.client_sock.bindSync("tcp://" + this.config.master_bindaddr + ":" + this.config.master_client_port);
	},
	
	parseMsg: function(msg) {
		return msg.toString("utf8");
	},
	
	clientMsgProc: function(msg, self) {
		var data = JSON.parse(msg);
		
		switch(data.command) {
			case 'start_task':
				self.startTask(data, self);
				break;
			case 'stop_task': 
				self.stopTask(data, self);
				break;
			case 'restart_task':
				self.restartTask(data, self);
		}
	},
	
	
	messageProc: function(slave_id, msg, self) {
		if(msg == "PONG") {
			self.slaves[slave_id].heartbeat = new Date().getTime();
			return;
		} else if(msg == "DIED"){ 
			delete self.slaves[slave_id];
			console.log("Slave " + slave_id + " died.\n");
			return;
		}
		
		var data = JSON.parse(msg);
		
		switch(data.command)
		{
			case 'task_msg':
				self.sendTaskMsg(data, self);
				break;
		}
	},
	
	sendTaskMsg: function(msg, self){
		var task = null;
		
		for(i in self.tasks) {
			if(self.tasks[i].name == msg.toTask)
			{
				task = self.tasks[i];
				break;
			}	
		}
		
		
		if(task == null)
			return null;
		
		for(i in self.slaves)
		{
			for(j in self.slaves[i].tasks)
			{
				if(msg.toTask == self.slaves[i].tasks[j])
				{
					self.slaves[i].sock.send(JSON.stringify(msg));
				}
			}
		}
		
	},
	
	restarkTask: function(task, self)
	{
		self.stopTask(task, self);
		self.startTask(task, self);		
	},
	
	startTask: function(task, self) {
		var cmd = {
			command: "start_task",
			id: task.name + "-" + new Date().getTime(),
			name: task.name,
			numWorkers: task.numWorkers,
			fileContents: task.code
		};
		
		self.tasks.push({
			id: cmd.id,
			name: task.name,
			numWorkers: cmd.numWorkers,
			lastSent: 0
		});
		
		console.log("Starting task " + cmd.name + " id: " + cmd.id + " num: " + cmd.numWorkers);
		
		var i = "";
		
		for(i in self.slaves) {
			if(i == "shuffle")
				continue;
			
			try {
				self.slaves[i].sock.send(JSON.stringify(cmd));
				self.slaves[i].tasks.push(task.name);
			} catch(e) {
				console.log(e);
			}
		}
	},
	
	stopTask: function(task, self) {
		var cmd = {
			command: "stop_task",
			task_name: task.name
		};
		
		console.log("Killing task by name: " + task.name);
		
		for(i in self.slaves) {
			self.slaves[i].sock.send(JSON.stringify(cmd));
		}
	}
	
};

var m = new Master();

m.start();