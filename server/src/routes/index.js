import express from 'express';
import patientRoutes from './patientRoutes.js';
import anmRoutes from './anmRoutes.js';
import cdssRoutes from './cdssRoutes.js';

const router = express.Router();

// Health check route
router.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', message: 'API is healthy' });
});

router.use('/patient', patientRoutes);
router.use('/anm', anmRoutes);
router.use('/cdss', cdssRoutes);

export default router;
