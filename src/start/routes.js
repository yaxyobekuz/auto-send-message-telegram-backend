const { app, express } = require("./server");

// Routes
const authRoute = require("../routes/auth");
const groupsRoute = require("../routes/groups");

app.use(express.json());
app.use("/api/auth", authRoute);
app.use("/api/groups", groupsRoute);
