import { genFunctionAsJson  } from "@pzero/shared/grid";
import { uuid } from "@pzero/shared/uuid";
import { config } from "../config/env.js";
import { redis } from "../config/redis.js";
export type ChallengePayload = {
    answer: string;
    uid: string;
    used: boolean;
    question: string;
    params: { x: string; y: string };
    c_at: number;
    next?: string;
}
export async function getChallenge(grid: number[][], uid: string) {
    const challengeData = genFunctionAsJson(grid);
    const challengeId = uuid();
    const challengeKey = `challenge:${challengeId}`
    const nextChallengeData = genFunctionAsJson(grid);
    const nextChallengeId = uuid();
    const nextChallengeKey = `challenge:${nextChallengeId}`
    const challengePayload: ChallengePayload = {
        answer: challengeData.result.value,
        uid: uid,
        used: false,
        question: challengeData.function.expression,
        params: challengeData.parameters,
        c_at: Date.now(),
        next: nextChallengeId
    };
    const nextChallengePayload: ChallengePayload = {
        answer: nextChallengeData.result.value,
        uid: uid,
        used: false,
        question: nextChallengeData.function.expression,
        params: nextChallengeData.parameters,
        // No next - B is end of pre-generated chain (will be extended in /auth/next flow)
        c_at: Date.now()
    };
    const ttl = config.CHALLENGE_TTL_SECONDS;
    console.log(`get Current challenge in Redis: ${challengeKey}`, challengePayload);
    await redis.set(challengeKey, JSON.stringify(challengePayload), ttl);
    console.log(`get Next challenge in Redis: ${nextChallengeKey}`, nextChallengePayload);
    await redis.set(nextChallengeKey, JSON.stringify(nextChallengePayload), ttl);
    return {
        id: challengeId,
        ...challengePayload
    };
}

export type MarkChallengeResult = 'ok' | 'already_used' | 'not_found';

export async function markChallengeUsed(challengeId: string): Promise<MarkChallengeResult> {
    const challengeKey = `challenge:${challengeId}`;
    const ttl = config.CHALLENGE_TTL_SECONDS;
    const script = `
        local data = redis.call('GET', KEYS[1])
        if not data then return nil end
        local payload = cjson.decode(data)
        if payload.used then return 'already_used' end
        payload.used = true
        local ttl = tonumber(ARGV[1])
        if ttl and ttl > 0 then
            redis.call('SETEX', KEYS[1], ttl, cjson.encode(payload))
        else
            redis.call('SET', KEYS[1], cjson.encode(payload))
        end
        return 'ok'
    `;
    const result = await redis.eval(script, [challengeKey], [ttl.toString()]);
    if (result === 'already_used') {
        console.warn(`markChallengeUsed: Challenge ${challengeId} already used.`);
        return 'already_used';
    } else if (result === null) {
        console.warn(`markChallengeUsed: Challenge ${challengeId} not found in Redis.`);
        return 'not_found';
    } else {
        console.log(`markChallengeUsed: Marked challenge ${challengeId} as used.`);
        return 'ok';
    }
}

export async function getChallengePayload(challengeId: string): Promise<ChallengePayload | null> {
    const challengeKey = `challenge:${challengeId}`;
    const challengeData = await redis.get(challengeKey);
    if (challengeData) {
        const challengePayload: ChallengePayload = JSON.parse(challengeData);
        return challengePayload;
    }
    return null;
}

/**
 * Generate multiple chained challenges
 * Each challenge has a `next` field pointing to the next one in the chain
 */
export async function getMultipleChallenges(grid: number[][], uid: string, count: number = 2) {
    const challenges: Array<{ id: string; question: string; params: { x: string; y: string } }> = [];
    const challengeIds: string[] = [];
    const challengePayloads: ChallengePayload[] = [];

    // Generate all challenge data first
    for (let i = 0; i < count; i++) {
        const challengeData = genFunctionAsJson(grid);
        const challengeId = uuid();
        challengeIds.push(challengeId);

        challengePayloads.push({
            answer: challengeData.result.value,
            uid: uid,
            used: false,
            question: challengeData.function.expression,
            params: challengeData.parameters,
            c_at: Date.now(),
        });

        challenges.push({
            id: challengeId,
            question: challengeData.function.expression,
            params: challengeData.parameters,
        });
    }

    // Chain challenges: each points to the next (last one has no next)
    for (let i = 0; i < count - 1; i++) {
        const payload = challengePayloads[i];
        const nextId = challengeIds[i + 1];
        if (payload && nextId) {
            payload.next = nextId;
        }
    }
    // Last challenge has no next - will trigger new challenge generation

    // Store all challenges in Redis with TTL to prevent orphan accumulation
    const ttl = config.CHALLENGE_TTL_SECONDS;
    for (let i = 0; i < count; i++) {
        const challengeKey = `challenge:${challengeIds[i]}`;
        await redis.set(challengeKey, JSON.stringify(challengePayloads[i]), ttl);
    }

    console.log(`[Challenge] Generated ${count} chained challenges for user ${uid}`);
    return challenges;
}
