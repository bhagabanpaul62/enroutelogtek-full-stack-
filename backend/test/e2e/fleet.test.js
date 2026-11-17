import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import { PASSWORDS, api, login, startStack, stopStack } from './helpers.js';

const futureDate = (days) => new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);

describe('fleet', { timeout: 180000 }, () => {
    let transporter;
    let other;
    let customer;
    let typeId;
    before(
        async () => {
            await startStack();
            transporter = await login('transporter@enroute.local', PASSWORDS.demo);
            other = await login('transporter2@enroute.local', PASSWORDS.demo);
            customer = await login('customer@enroute.local', PASSWORDS.demo);
            typeId = (await api(transporter, 'GET', '/masters/vehicle-types')).body.data[0].id;
        },
        { timeout: 120000 },
    );
    after(stopStack);

    const vehicleBody = (extra = {}) => ({
        registrationNumber: 'WB 23 C 4471',
        vehicleTypeId: typeId,
        capacityTons: 20,
        rcNumber: 'RC-1',
        rcExpiry: futureDate(400),
        insuranceNumber: 'INS-1',
        insuranceExpiry: futureDate(10),
        ...extra,
    });

    test('customers cannot use fleet', async () => {
        assert.equal((await api(customer, 'GET', '/fleet/vehicles')).status, 403);
    });

    test('vehicle: normalised, unique platform-wide, company scoped, documents, expiry', async () => {
        const created = await api(transporter, 'POST', '/fleet/vehicles', vehicleBody());
        assert.equal(created.status, 201);
        const vehicle = created.body.data;
        assert.equal(vehicle.registrationNumber, 'WB23C4471');
        assert.equal(vehicle.docStatus.insurance, 'expiring');

        assert.equal((await api(other, 'POST', '/fleet/vehicles', vehicleBody({ registrationNumber: 'wb-23-c-4471' }))).status, 409);
        assert.equal((await api(transporter, 'POST', '/fleet/vehicles', vehicleBody({ registrationNumber: 'XX' }))).status, 422);

        // another company cannot see or change it
        assert.equal((await api(other, 'GET', `/fleet/vehicles/${vehicle.id}`)).status, 404);
        assert.equal((await api(other, 'PATCH', `/fleet/vehicles/${vehicle.id}`, { capacityTons: 1 })).status, 404);

        const list = await api(transporter, 'GET', '/fleet/vehicles?q=wb23c&expiry=expiring');
        assert.ok(list.body.data.some((row) => row.id === vehicle.id));
        assert.equal((await api(other, 'GET', '/fleet/vehicles?q=wb23c')).body.data.length, 0);

        // on_trip cannot be set by hand
        assert.equal((await api(transporter, 'PATCH', `/fleet/vehicles/${vehicle.id}`, { availability: 'on_trip' })).status, 422);

        const doc = await api(transporter, 'POST', `/fleet/vehicles/${vehicle.id}/documents`, {
            documentType: 'insurance',
            fileUrl: 'https://files.example.com/ins.pdf',
            expiry: futureDate(-1),
        });
        assert.equal(doc.status, 201);
        const detail = (await api(transporter, 'GET', `/fleet/vehicles/${vehicle.id}`)).body.data;
        assert.equal(detail.documents.length, 1);
        assert.equal(detail.docStatus.insurance, 'expired');
        assert.equal(detail.assignable.ok, false);

        // expired insurance keeps it out of the picker and shows in the expiring list
        const picker = (await api(transporter, 'GET', '/fleet/availability')).body.data;
        assert.ok(!picker.vehicles.some((row) => row.id === vehicle.id));
        const expiring = (await api(transporter, 'GET', '/fleet/expiring')).body.data;
        assert.ok(expiring.some((row) => row.entityId === vehicle.id && row.kind === 'insurance' && row.status === 'expired'));

        assert.equal((await api(transporter, 'DELETE', `/fleet/vehicles/${vehicle.id}`)).status, 200);
        assert.equal((await api(transporter, 'GET', `/fleet/vehicles/${vehicle.id}`)).status, 404);
        // the number is free again after a soft delete
        assert.equal((await api(other, 'POST', '/fleet/vehicles', vehicleBody())).status, 201);
    });

    test('driver: phone normalised and unique per company', async () => {
        const body = { name: 'Ramesh', phone: '+91 98765-43210', licenceNumber: 'DL-1', licenceExpiry: futureDate(20) };
        const created = await api(transporter, 'POST', '/fleet/drivers', body);
        assert.equal(created.status, 201);
        assert.equal(created.body.data.phone, '9876543210');
        assert.equal(created.body.data.licenceStatus, 'expiring');
        assert.equal((await api(transporter, 'POST', '/fleet/drivers', { name: 'Dup', phone: '9876543210' })).status, 409);
        assert.equal((await api(other, 'POST', '/fleet/drivers', { name: 'Same phone, other company', phone: '9876543210' })).status, 201);
        assert.equal((await api(transporter, 'POST', '/fleet/drivers', { name: 'Bad', phone: '12345' })).status, 422);
        const found = await api(transporter, 'GET', '/fleet/drivers?q=98765-43210&availability=available');
        assert.equal(found.body.data.length, 1);
        const picker = (await api(transporter, 'GET', '/fleet/availability')).body.data;
        assert.ok(picker.drivers.some((row) => row.id === created.body.data.id));
    });
});
