module.exports = {
	zookeeper_host: "127.0.0.1:2181",
	zookeeper_timeout: 200000,
	
	master_host: "127.0.0.1",
	master_port: 3005,
	master_client_port: 3004,
	master_bindaddr: "0.0.0.0",
	
	slave_port: 3010,
	slave_bindaddr: "0.0.0.0",
	slave_tmpdir: "/tmp/ads",
	
	heartbeat_tick: 3000
};