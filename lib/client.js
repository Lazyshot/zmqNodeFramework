var zmq = require('zmq'),
	fs = require('fs'),
	zip = require('node-native-zip');


var Client = function(){
	this.sock = zmq.socket("push");	
}


Client.prototype = {
	sock: null,
	
	filterArgs: function(args){
		if(args[0] == "node")
		{
			return args.slice(2, args.length);
		} else {
			return args.slice(1, args.length);
		}
	},
	
	start: function(args){
		args = this.filterArgs(args);
		
		console.log(args);
		
		if(args.length < 2)
		{
			this.helpMsg();
			process.exit(1);
		}
		
		switch(args[0])
		{
			case 'start':
				this.startTask(args[1]);
				break;
			case 'stop':
				this.stopTask(args[1]);
				break;
			case 'restart':
				this.restartTask(args[1]);
				break;			
		}
		
	},
	
	
	helpMsg: function(){
		process.stdout.write("client <command> <args>\n");
		process.stdout.write("Ads Daemon template help\n\n");
		process.stdout.write("Commands\n");
		process.stdout.write("start <task_config.json>\t\t Start task\n");
		process.stdout.write("stop <task_name>\t\t\t Stop task\n");
		process.stdout.write("restart <task_config.json>\t\t Restart task\n");
	},
	
	startTask: function(configFile){
		var config = fs.readFileSync(configFile);
		var self = this;
		var data = JSON.parse(config);
		
		this.sock.connect("tcp://" + process.env['ADS_MASTER']);
		
		var archive = new zip();
		
		if(!('taskPath' in data))
		{
			for(i in data)
			{
				var task = data[i];
				task.command = "start_task";
				var files = fs.readdirSync(task.taskPath);
				var archiveFiles = [];
				
				for(i in files)
				{
					archiveFiles.push({ 
						name: files[i], 
						path: task.taskPath + "/" + files[i]
					});
				}
				
				
				archive.addFiles(archiveFiles, function() { 
					task.code = archive.toBuffer().toString('base64');
					self.sock.send(JSON.stringify(task));
				}, function(err) { console.log(err); });
			}
		}
		else
		{
			var task = data;
			task.command = "start_task";
			var files = fs.readdirSync(task.taskPath);
			var archiveFiles = [];
				
			for(i in files)
			{
				archiveFiles.push({ 
					name: files[i], 
					path: task.taskPath + "/" + files[i]
				});
			}
				
				
			archive.addFiles(archiveFiles, function() { 
				task.code = archive.toBuffer().toString('base64');
				self.sock.send(JSON.stringify(task));
				process.exit(1);
			}, function(err) { console.log(err); });
			
		}
		
		console.log("Master Accepted the Task(s).");
	},
	
	stopTask: function(name) {
		var self = this;
		var cmd = {
			command: "stop_task", 
			name: name
		};
		
		this.sock.connect("tcp://" + process.env['ADS_MASTER']);
		self.sock.send(JSON.stringify(cmd));
		process.exit(1);
		
	},
	
	restartTask: function(configFile) {
		var config = fs.readFileSync(configFile);
		var data = JSON.parse(config)
		var self = this;
		
		data.command = "restart_task";
		
		data.code = fs.readFileSync(data.taskFile);
		this.sock.connect("tcp://" + process.env['ADS_MASTER']);
		self.sock.send(JSON.stringify(data));
		process.exit(1);
	}
};


c = new Client();

c.start(process.argv);