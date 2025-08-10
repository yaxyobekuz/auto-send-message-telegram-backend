require("dotenv").config();
require("./src/start/routes");
const { app } = require("./src/start/server");
const connectDB = require("./src/db/connectDB");

const PORT = process.env.PORT || 4000;

(async () => {
  await connectDB();
})();

app.listen(PORT, () => {
  console.log(`Tinglamoqdaman: http://localhost:${PORT}`);
});
