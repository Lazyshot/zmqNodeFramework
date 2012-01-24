var util = require('util'),
	spawn = require('child_process').spawn,
	daemonConfig = require('./config.js'),
	os = require('os'),
	zmq = require('zmq'),
	fs = require('fs'),
	zip = require("zip"),
	u = require('./utils.js'),
	defaults = require('./defaults.js');

daemonConfig = u.merge_options(defaults, daemonConfig);

var Slave = function(){
	var self = this;
	this.config = daemonConfig;
	this.sock = zmq.socket("pair");
	this.sock.on("error", function(err){ console.log(err); });
	
	this.sock.bindSync("tcp://" + this.config.slave_bindaddr + ":" + this.config.slave_port);	
	
	this.slaveInfo.id = process.pid + "-" + (new Date().getTime());
	this.slaveInfo.port = this.config.slave_port;
	process.on('exit', function(){  
		self.sock.send("DIED");
	});
	
	this.modTemplate = fs.readFileSync("module_template.js").toString("utf8");
};



Slave.prototype = {
	sock: null,
	
	workers: {},
	tasks: [],
	
	slaveInfo: {},
	
	modTemplate: null,
	
	config: {},
	
	start: function(){
		var initSock = zmq.socket("push"),
			self = this;
			
		this.sock.on('message', function(msg){ msg = msg.toString("utf8"); self.procMessage(msg, self) });
			
		initSock.connect("tcp://" + this.config.master_host + ":" + this.config.master_port);
		
		var hostname = os.hostname();
		console.log("IP: " + hostname);
		this.slaveInfo.host = hostname;
		
		var strData = JSON.stringify(this.slaveInfo);
		
		console.log("Sending: " + strData);
		initSock.send(strData);
		initSock.close();
		
		setInterval(function(){
			console.log("Emits:");
			
			for(i in self.tasks)
			{
				if('numEmits' in self.tasks[i])
					console.log(self.tasks[i].name + ": " + self.tasks[i].numEmits);
			}
			
			console.log("\n");
		}, 5000)
	},
	
	procMessage: function(msg, self) {		
		if(typeof(self) == "undefined")
			self = this;
			
		if(msg == "PING") {
			self.sock.send("PONG");
			return;
		}
		
		var data = JSON.parse(msg);
		
		switch(data.command)
		{
			case "start_task":
				self.startTask(data, self);
				break;
			case "stop_task":
				self.stopTask(data, self);
				break;
			case 'task_msg':
				self.taskIn(data, self);
				break;
		}	
	},
	
	startTask: function(taskInfo, self) {
		console.log("Downloading and starting task from master");
		
		var scriptDir = self.config.slave_tmpdir + "/" + taskInfo.id;
		
		fs.mkdirSync(scriptDir);
		
		var buffer = new Buffer(taskInfo.fileContents, "base64");
		
		reader = zip.Reader(buffer);
		var iterator = reader.iterator();
		var entry = null;
		
		while(true)
		{		
			try {
				entry = iterator.next()	
			} catch(e) {
				break;
			}
			console.log("Extracting File: " + entry.getName());
			
			if(entry.isFile())
			{
				fs.writeFileSync(
					scriptDir + "/" + entry.getName(),
					entry.getData()					
				);
			}
			else if(entry.isDirectory())
			{
				fs.mkdirSync(scriptDir + "/" + entry.getName());
			}
		}
		
		var task = {
			id: taskInfo.id,
			name: taskInfo.name,
			numWorkers: taskInfo.numWorkers,
			lastWorker: 0,
			workers: [],
			numEmits: 0
		};
		
		console.log("Successfully Extracted Files for Task + " + taskInfo.name);
		
		for(var i = 0; i < taskInfo.numWorkers; i++)
		{
			var worker = spawn("node", [scriptDir], {
					cwd: scriptDir
				});
			
			worker.stderr.on('data', function(err){
				console.log(taskInfo.name + " Error: " + err);
			});
			
			worker.stdout.on('data', function(data) {
				if(typeof(data) == "Buffer")
					data = data.toString("utf8");
				
				if(typeof(data) == "object")
				{
					self.taskOut(task, data, self);
				}
				else 
				{
					var cmds = data.split("\n");
					for(i in cmds)
						self.taskOut(task, cmds[i], self);
				}
			});
			
			task.workers.push(worker);
		}
		
		self.tasks.push(task);
		
		console.log("Successfully start up task " + task.name + " id: " + task.id + " num: " + task.numWorkers);
	},
	
	stopTask: function(data, self) {
		for(i in self.tasks)
		{
			if(self.tasks[i].name == data.taskName)
			{
				for(j in self.tasks[i].workers)
				{
					self.tasks[i].workers[j].kill();
				}
				
				delete self.tasks[i];
				break;
			}
		}
	},
	
	taskIn: function(data, self){
		for(i in self.tasks)
		{
			if(self.tasks[i].name == data.toTask)
			{
				
				if(self.tasks[i].workers.length == 0)
				{
					console.log("All the workers for task " + data.toTask + " apear to be dead.");
				}
				else
				{
					var nextWorker = (self.tasks[i].lastWorker + 1) % self.tasks[i].workers.length;
				
					try {
						self.tasks[i].workers[nextWorker].stdin.write(JSON.stringify(data) + "\n");
					} catch (e) {
						console.log("Slave Worker " + self.tasks[i].workers[nextWorker].pid + " died unexpectedly.");
						self.tasks[i].workers.splice(nextWorker,1);
					}
				}
				break;
				
			}
		}
	},
	
	taskOut: function(task, data, self){			
		try {
			data = data.toString("utf8");
			data = JSON.parse(data);
		} catch(e) {
			
		}
		
		//console.log(data);
		
		if(data.toTask == "done")
			console.log(data);
			
		task.numEmits++;
		
		for(i in self.tasks)
		{
			if(self.tasks[i].name == data.toTask)
			{
				self.taskIn(data, self);
				
				return;
			}
		}
		
		self.sock.send(JSON.stringify(data));
	}
	
};

var s = new Slave();

s.start();