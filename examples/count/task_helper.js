taskHelper = function(run){
	if(typeof(run) == "function")
	{
		this.run = run;
	}
};

taskHelper.prototype = {
	emit: function(next_task, values){
		var cmd = {
			command: "task_msg",
			toTask: next_task,
			values: values
		};
	
		var strcmd = JSON.stringify(cmd);
		process.stdout.write(strcmd)
	},
	start: function(){ 
		var self = this;
		process.stdin.on("data", function(data){
			try {
				if(data instanceof Buffer)
					data = data.toString("utf8");
		
				var cmds = data.split("\n");
		
				for(i in cmds)
				{
					if(cmds[i] != "")
						self.run(JSON.parse(cmds[i]), self);
				}
			} catch(e) {
				process.stderr.write("Data: " + data + " Type: " + typeof(data) + "\n");
				throw e;
			}
		});


		process.stdin.resume();
	}
};


module.exports = taskHelper;
