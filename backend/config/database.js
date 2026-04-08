import mongoose from "mongoose";
import dotenv from "dotenv";
import chalk from "chalk";

dotenv.config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log(chalk.green("MongoDB bağlantısı başarılı!"));
  } catch (error) {
    console.error(chalk.red("MongoDB bağlantısı başarısız:", error));
    process.exit(1);
  }
};

const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    console.log(chalk.yellow("MongoDB bağlantısı kapatıldı."));
  } catch (error) {
    console.error(chalk.red("MongoDB bağlantısı kapatılamadı:", error));
  }
};

export { connectDB, disconnectDB };
