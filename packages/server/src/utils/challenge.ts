import { genFunctionAsJson  } from "@pzero/shared/grid";
import { uuid } from "@pzero/shared/uuid";
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
        next: nextChallengeId,
        c_at: Date.now()
    };
    console.log(`get Current challenge in Redis: ${challengeKey}`, challengePayload);
    await redis.set(challengeKey, JSON.stringify(challengePayload));
    console.log(`get Next challenge in Redis: ${nextChallengeKey}`, nextChallengePayload);
    await redis.set(nextChallengeKey, JSON.stringify(nextChallengePayload));
    return {
        id: challengeId,
        ...challengePayload
    };
}

export async function markChallengeUsed(
  challengeId: string,
): Promise<'ok' | 'already_used' | 'not_found'> {
    const challengeKey = `challenge:${challengeId}`;
    const script = `
        local data = redis.call('GET', KEYS[1])
        if not data then return nil end
        local payload = cjson.decode(data)
        if payload.used then return 'already_used' end
        payload.used = true
        redis.call('SET', KEYS[1], cjson.encode(payload))
        return 'ok'
    `;
    const result = await redis.eval(script, [challengeKey]);
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
