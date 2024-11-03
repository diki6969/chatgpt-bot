const a = require('./client');
require("./server");
require("./config");
a.connect().catch(() => a.connect())