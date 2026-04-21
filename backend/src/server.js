require("dotenv").config();

const app = require("./app");

const PORT = Number(process.env.PORT || 3000);

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Geo-Sentinel backend running on http://0.0.0.0:${PORT}`);
});