var valueSet = [
	"Let's split this sentence",
	"How about this sentence?",
	"We need just a couple more",
	"Give me another sentence please"
];

var i = 0;
	
setInterval(function(){
	emit("split", [valueSet[i]]);
	i = (i + 1) % valueSet.length;
}, 1000);
