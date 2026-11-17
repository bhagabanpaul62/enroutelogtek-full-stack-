import express from 'express';
import { validate } from '#shared/middleware/validate.middleware.js';
import { requirePermission } from '#shared/middleware/permission.middleware.js';
import { PERMISSIONS } from '#features/team/team.permissions.js';
import { requireFleetCompany } from '../services/fleet.common.js';
import * as v from '../validations/fleet.validation.js';
import * as c from '../controllers/fleet.controller.js';

// authMiddleware is applied to all of /fleet in routes/index.js. Reads: any member of a transporter or
// fleet owner company. Writes: fleet.manage.
const router = express.Router();
const write = requirePermission(PERMISSIONS.FLEET_MANAGE);

router.use((req, res, next) => {
    try {
        requireFleetCompany(req.user);
        next();
    } catch (error) {
        next(error);
    }
});

router.get('/availability', v.availabilityRules, validate, c.getAvailability);
router.get('/expiring', v.expiringRules, validate, c.getExpiring);

router.get('/vehicles', v.listVehiclesRules, validate, c.listVehicles);
router.post('/vehicles', write, v.createVehicleRules, validate, c.createVehicle);
router.get('/vehicles/:id', v.idRules, validate, c.getVehicle);
router.patch('/vehicles/:id', write, v.idRules, v.updateVehicleRules, validate, c.updateVehicle);
router.delete('/vehicles/:id', write, v.idRules, validate, c.deleteVehicle);
router.post('/vehicles/:id/documents', write, v.idRules, v.vehicleDocumentRules, validate, c.addVehicleDocument);

router.get('/drivers', v.listDriversRules, validate, c.listDrivers);
router.post('/drivers', write, v.createDriverRules, validate, c.createDriver);
router.get('/drivers/:id', v.idRules, validate, c.getDriver);
router.patch('/drivers/:id', write, v.idRules, v.updateDriverRules, validate, c.updateDriver);
router.delete('/drivers/:id', write, v.idRules, validate, c.deleteDriver);
router.post('/drivers/:id/documents', write, v.idRules, v.driverDocumentRules, validate, c.addDriverDocument);

export default router;
