Array.prototype.shuffle = function(){
	for (var i = 0; i < this.length; i++){
    	var a = this[i];
    	var b = Math.floor(Math.random() * this.length);
        this[i] = this[b];
        this[b] = a;
    }
}


module.exports = {
    
	shuffleProperties: function(obj) {
	    var new_obj = {};
	    var keys = getKeys(obj);
	    keys.shuffle();
	    for (var key in keys){
	        if (key == "shuffle") continue; // skip our prototype method
	        new_obj[keys[key]] = obj[keys[key]];
	    }
	    return new_obj;
	},
    
	getKeys: function(obj){
	    var arr = new Array();
	    for (var key in obj)
	        arr.push(key);
	    return arr;
	},

	merge_options: function(obj1,obj2){
	    var obj3 = {};
	    for (var attrname in obj1) { obj3[attrname] = obj1[attrname]; }
	    for (var attrname in obj2) { obj3[attrname] = obj2[attrname]; }
	    return obj3;
	}
};
