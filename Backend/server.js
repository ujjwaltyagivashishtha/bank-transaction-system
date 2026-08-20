require("dotenv").config();

const app = require("./src/app");
const connectToDB = require("./src/config/db");

async function startServer() {
    await connectToDB();

    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`🚀 Server is running on port ${PORT}`);
    });
}

startServer();