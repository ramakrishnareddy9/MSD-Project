import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';

test('Community wiring remains complete', async (t) => {
  await t.test('community routes expose invite and join-request review handlers', async () => {
    const routePath = path.resolve('routes/community.routes.js');
    const content = fs.readFileSync(routePath, 'utf8');

    assert(content.includes("router.post('/join-by-code', authenticate, communityController.joinByInviteCode);"), 'join-by-code route should be registered');
    assert(content.includes("router.get('/invite/:code', authenticate, communityController.getCommunityByInviteCode);"), 'invite lookup route should be registered');
    assert(content.includes("router.patch('/:id/join-requests/:requestId/review', authenticate, communityController.reviewJoinRequest);"), 'join request review route should be registered');
  });

  await t.test('CommunityPool keeps the soft-delete plugin enabled', async () => {
    const modelPath = path.resolve('models/CommunityPool.model.js');
    const content = fs.readFileSync(modelPath, 'utf8');

    assert(content.includes("import { softDeletePlugin } from '../utils/softDelete.plugin.js';"), 'softDeletePlugin should be imported');
    assert(content.includes('communityPoolSchema.plugin(softDeletePlugin);'), 'softDeletePlugin should be applied to CommunityPool');
  });
});