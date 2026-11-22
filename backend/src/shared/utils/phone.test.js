import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { body, validationResult } from 'express-validator';
import { MAX_PHONE_DIGITS, phoneProblem, phoneRule } from './phone.js';

describe('phoneProblem', () => {
    it('accepts 7 to 15 digits with an optional leading +', () => {
        assert.equal(phoneProblem('9876543210'), null);
        assert.equal(phoneProblem('+919876543210'), null);
        assert.equal(phoneProblem('1234567'), null);
        assert.equal(phoneProblem('123456789012345'), null);
        assert.equal(MAX_PHONE_DIGITS, 15);
    });
    it('rejects more than 15 digits', () => {
        assert.equal(phoneProblem('1234567890123456'), 'Enter up to 15 digits');
        assert.equal(phoneProblem('+1234567890123456'), 'Enter up to 15 digits');
    });
    it('rejects too few digits and letters', () => {
        assert.equal(phoneProblem('123456'), 'Enter 7 to 15 digits');
        assert.equal(phoneProblem('123456789', { min: 10 }), 'Enter 10 to 15 digits');
        assert.match(phoneProblem('98765abc10'), /digits only/);
    });
    it('counts digits only when separators are allowed', () => {
        assert.equal(phoneProblem('98-765 4321', { separators: true }), null);
        assert.equal(phoneProblem('1234 5678 9012 3456', { separators: true }), 'Enter up to 15 digits');
        assert.match(phoneProblem('98-765', { separators: false }), /digits only/);
    });
    it('keeps the value inside the varchar(15) column', () => {
        assert.match(phoneProblem('+123456789012345'), /at most 15 characters/);
    });
});

describe('phoneRule', () => {
    const errorsOf = async (rule, data) => {
        const req = { body: data };
        await rule.run(req);
        return validationResult(req).array().map((e) => e.msg);
    };
    it('reports the helper message on a 16-digit number', async () => {
        assert.deepEqual(await errorsOf(phoneRule(body('phone')), { phone: '9'.repeat(16) }), ['Enter up to 15 digits']);
    });
    it('passes a valid number, and an empty one only with allowEmpty', async () => {
        assert.deepEqual(await errorsOf(phoneRule(body('phone')), { phone: '9876543210' }), []);
        assert.equal((await errorsOf(phoneRule(body('phone')), { phone: '' })).length, 1);
        assert.deepEqual(await errorsOf(phoneRule(body('phone'), { allowEmpty: true }), { phone: '' }), []);
    });
    it('rejects a non-string', async () => {
        assert.deepEqual(await errorsOf(phoneRule(body('phone')), { phone: 9876543210 }), ['Phone number must be text']);
    });
    it('accepts a freely typed number when the service normalises it, still capping digits', async () => {
        const rule = () => phoneRule(body('phone'), { separators: true, normalised: true });
        assert.deepEqual(await errorsOf(rule(), { phone: '+91 - 98765 - 43210' }), []);
        assert.deepEqual(await errorsOf(rule(), { phone: '+91 98765 43210 12345' }), ['Enter up to 15 digits']);
    });
});
