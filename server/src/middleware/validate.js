export const validateBody = (validator) => (req, res, next) => {
    req.validatedBody = validator(req.body || {});
    next();
};
