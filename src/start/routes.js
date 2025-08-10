const { app, express } = require("./server");
const authRoute = require("../routes/auth");

app.use(express.json());
app.use("/api/auth", authRoute);
