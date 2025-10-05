import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

export const dbconnection = () => {
  try {
    console.log('process.env.NODE_ENV : ', process.env.NODE_ENV );
    console.log("process.env.MONGODB_URI ", process.env.MONGODB_URI);
    const dbURI =
      process.env.NODE_ENV === "production"
        ? process.env.MONGODB_URI
        : "mongodb://127.0.0.1:27017/embedapp";
    mongoose.connect(dbURI);
    console.log("connection success");
  } catch (error) {
    console.log("connection error", error);
  }
};

