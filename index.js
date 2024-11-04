process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";
process.on("uncaughtException", console.error);
const a = require("./client");
require("./server");
require("./config");
a.connect().catch(() => a.connect());
