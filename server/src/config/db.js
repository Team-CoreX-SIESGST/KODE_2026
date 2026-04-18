import mongoose from 'mongoose';
import { AppError } from '../utils/errors.js';

const connectDB = async () => {
    const uri = process.env.MONGO_URI || process.env.DB_URI;
    if (!uri) {
        throw new AppError(
            'MongoDB connection string is missing. Set MONGO_URI or DB_URI before starting the server.',
            500,
            'DB_CONFIG_MISSING'
        );
    }

    const conn = await mongoose.connect(uri);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
};

export default connectDB;
