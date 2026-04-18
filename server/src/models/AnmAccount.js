import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const locationSchema = new mongoose.Schema(
    {
        latitude: { type: Number, required: true },
        longitude: { type: Number, required: true }
    },
    { _id: false }
);

const anmAccountSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        username: { type: String, required: true, unique: true, index: true, trim: true, lowercase: true },
        password: { type: String, required: true },
        phoneNumber: { type: String, trim: true, index: true },
        facilityName: { type: String, trim: true },
        serviceArea: { type: String, trim: true },
        locationCoordinates: { type: locationSchema, required: true }
    },
    { timestamps: true }
);

anmAccountSchema.pre('save', async function () {
    if (!this.isModified('password')) return;
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

anmAccountSchema.methods.matchPassword = async function (enteredPassword) {
    return bcrypt.compare(enteredPassword, this.password);
};

anmAccountSchema.set('toJSON', {
    transform: (doc, ret) => {
        delete ret.password;
        return ret;
    }
});

const AnmAccount = mongoose.model('AnmAccount', anmAccountSchema);

export default AnmAccount;
