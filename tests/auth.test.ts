import { describe, it, expect } from '@jest/globals';
import request from 'supertest';
import app from '../src/index';
import { TEST_EMAIL, TEST_NIK } from './setup';

describe('Auth Endpoint (E2E)', () => {

  const testPayload = {
    email: TEST_EMAIL,
    password: 'Password123!',
    fullName: 'Jest Test User',
    nik: TEST_NIK,
    whatsappNumber: '080000000000',
    bloodType: 'AB'
  };

  it('seharusnya gagal register jika data tidak lengkap', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      email: TEST_EMAIL
    });
    
    // Unprocessable Entity karena kurang payload
    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });

  it('seharusnya berhasil melakukan registrasi', async () => {
    const res = await request(app).post('/api/v1/auth/register').send(testPayload);
    
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(TEST_EMAIL);
    expect(res.body.data.token).toBeDefined();
  });

  it('seharusnya gagal register dengan email yang sama', async () => {
    const res = await request(app).post('/api/v1/auth/register').send(testPayload);
    
    // Conflict
    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it('seharusnya berhasil login dan mendapatkan JWT', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      email: TEST_EMAIL,
      password: testPayload.password
    });
    
    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeDefined();
  });

});
