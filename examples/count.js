var counts = {};
var run = function(msg){
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
		
		emit("done", [msg.values[i], counts[msg.values[i]]]);
	}
}
