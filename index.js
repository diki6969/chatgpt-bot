const a = require('./client');
require("./server");
a.connect().catch(() => a.connect())