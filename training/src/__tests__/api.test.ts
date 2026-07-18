import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';

import { createApp } from '../api/server.ts';

async function startServer() {
  const { server } = createApp();
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const { port } = server.address() as AddressInfo;
  const base = `http://127.0.0.1:${port}`;
  const close = () => new Promise<void>((resolve) => server.close(() => resolve()));
  return { base, close };
}

async function post(base: string, path: string, body?: unknown) {
  const res = await fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, json: (await res.json()) as Record<string, unknown> };
}

async function get(base: string, path: string) {
  const res = await fetch(`${base}${path}`);
  return { status: res.status, json: await res.json() };
}

test('API drives an assessment course to completion', async () => {
  const { base, close } = await startServer();
  try {
    assert.equal((await get(base, '/health')).status, 200);

    const company = await post(base, '/companies', { name: 'Globex' });
    const companyId = company.json.id as string;

    const learner = await post(base, '/learners', {
      companyId,
      firstName: 'Robin',
      lastName: 'Park',
      email: 'robin.park@example.com',
    });
    const learnerId = learner.json.id as string;

    const course = await post(base, '/courses', {
      companyId,
      title: 'Sexual Harassment Prevention',
      lessons: ['intro', 'policy', 'scenarios'],
      passingScore: 80,
    });
    assert.equal(course.status, 201);
    const courseId = course.json.id as string;

    const enrollment = await post(base, '/enrollments', { companyId, courseId, learnerId });
    assert.equal(enrollment.status, 201);
    const enrollmentId = enrollment.json.id as string;
    assert.equal(enrollment.json.status, 'not_started');

    for (const lesson of ['intro', 'policy', 'scenarios']) {
      await post(base, `/enrollments/${enrollmentId}/lessons`, { lesson });
    }
    // Assessment before all lessons would 409; here all are done, so a low score fails.
    const failed = await post(base, `/enrollments/${enrollmentId}/assessment`, { score: 50 });
    assert.equal(failed.json.status, 'failed');

    const passed = await post(base, `/enrollments/${enrollmentId}/assessment`, { score: 90 });
    assert.equal(passed.json.status, 'completed');

    const listed = await get(base, `/enrollments?learnerId=${learnerId}&status=completed`);
    assert.equal((listed.json as unknown[]).length, 1);
  } finally {
    await close();
  }
});

test('API returns structured errors', async () => {
  const { base, close } = await startServer();
  try {
    const missing = await get(base, '/enrollments/enr_nope');
    assert.equal(missing.status, 404);
    assert.equal((missing.json as { error: { code: string } }).error.code, 'not_found');

    assert.equal((await get(base, '/nonsense')).status, 404);

    const badCourse = await post(base, '/courses', { companyId: 'co_nope', title: 'X', lessons: [] });
    assert.equal(badCourse.status, 404);
  } finally {
    await close();
  }
});
