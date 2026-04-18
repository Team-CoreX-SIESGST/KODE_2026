import express from 'express';
import authRoutes from './authRoutes.js';
import patientRoutes from './patientRoutes.js';
import doctorRoutes from './doctorRoutes.js';
import ashaRoutes from './ashaRoutes.js';
import appointmentRoutes from './appointmentRoutes.js';
import sheetsRoutes from './sheetsRoutes.js';

const router = express.Router();

// Health check route
router.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', message: 'API is healthy' });
});

// Authentication routes
router.use('/auth', authRoutes);
router.use('/patient', patientRoutes);
router.use('/doctor', doctorRoutes);
router.use('/asha', ashaRoutes);
router.use('/appointments', appointmentRoutes);
router.use('/sheets', sheetsRoutes);

// Add your resource routes here
// import userRoutes from './userRoutes.js';
// router.use('/users', userRoutes);

export default router;
