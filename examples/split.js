var run = function(msg){
	emit("count", msg.values[0].split(" "));
};