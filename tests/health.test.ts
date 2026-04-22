import { describe, it, expect } from '@jest/globals';
import request from 'supertest';
import app from '../src/index';

describe('Health Check Endpoint', () => {
  it('seharusnya mengembalikan status 200 dan pesan sukses', async () => {
    const res = await request(app).get('/api/v1/health');
    
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toContain('PMI Donorku API');
  });
});
