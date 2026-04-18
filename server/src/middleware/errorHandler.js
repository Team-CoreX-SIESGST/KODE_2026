import { AppError } from '../utils/errors.js';

export const notFound = (req, res, next) => {
    next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404, 'ROUTE_NOT_FOUND'));
};

export const errorHandler = (error, req, res, next) => {
    const statusCode = error instanceof AppError ? error.statusCode : 500;
    const code = error instanceof AppError ? error.code : 'INTERNAL_ERROR';
    const details = error instanceof AppError ? error.details : undefined;

    if (!(error instanceof AppError)) {
        console.error(error);
    }

    res.status(statusCode).json({
        error: {
            code,
            message: error.message || 'Internal server error',
            ...(details ? { details } : {})
        }
    });
};
