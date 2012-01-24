var emit = function(next_task, values){
	var cmd = {
		command: "task_msg",
		toTask: next_task,
		values: values
	};
	
	var strcmd = JSON.stringify(cmd);
	process.stdout.write(strcmd)
};


{****SCRIPT_CODE_HERE****}


process.stdin.on("data", function(data){
	try {
		if(data instanceof Buffer)
			data = data.toString("utf8");
		
		var cmds = data.split("\n");
		
		for(i in cmds)
		{
			if(cmds[i] != "")
				run(JSON.parse(cmds[i]));
		}
	} catch(e) {
		process.stderr.write("Data: " + data + " Type: " + typeof(data) + "\n");
		throw e;
	}
});


process.stdin.resume();