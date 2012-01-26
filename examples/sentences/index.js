var task = require('./task_helper.js');

var valueSet = [
	"Let's split this sentence",
	"How about this sentence?",
	"We need just a couple more",
	"Give me another sentence please"
];

var i = 0;
var t = new task(function(msg){});

setInterval(function(){
	t.emit("split", [valueSet[i]]);
	i = (i + 1) % valueSet.length;
}, 1000);


t.start();