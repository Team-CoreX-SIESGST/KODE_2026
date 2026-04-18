import Patient from '../models/Patient.js';
import AnmAccount from '../models/AnmAccount.js';
import { verifyToken } from '../utils/jwt.js';
import { AppError, asyncHandler } from '../utils/errors.js';

const buildProtect = (Model, role) =>
    asyncHandler(async (req, res, next) => {
        let token;

        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            throw new AppError('Not authorized, no token', 401, 'AUTH_REQUIRED');
        }

        const decoded = verifyToken(token);
        if (decoded.role !== role) {
            throw new AppError('Not authorized for this role', 403, 'ROLE_FORBIDDEN');
        }

        const user = await Model.findById(decoded.id).select('-password');

        if (!user) {
            throw new AppError('Not authorized, user not found', 401, 'AUTH_USER_NOT_FOUND');
        }

        req.user = user;
        req.authRole = role;
        next();
    });

export const protectPatient = buildProtect(Patient, 'patient');
export const protectAnm = buildProtect(AnmAccount, 'anm');
