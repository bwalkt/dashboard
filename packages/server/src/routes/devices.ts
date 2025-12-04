import type { AuthenticatedRequest } from "@pzero/shared";
import type { DeviceInfoType } from "@pzero/shared/pzero";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { db } from "../config/database.js";
import { authenticateToken } from "../middleware/auth.js";

interface ConnectDeviceRequest {
  uid: string;
  deviceInfo: DeviceInfoType;
}

export async function deviceRoutes(fastify: FastifyInstance): Promise<void> {
  // POST /connectDevice - Connect a device and set as verifier
  fastify.post<{
    Body: ConnectDeviceRequest;
  }>(
    "/connectDevice",
    {
      preHandler: [authenticateToken],
    },
    async (
      request: FastifyRequest<{ Body: ConnectDeviceRequest }>,
      reply: FastifyReply
    ) => {
      try {
        const { uid, deviceInfo } = request.body;

        console.log("Device connection request:", {
          uid,
          deviceInfo: {
            id: deviceInfo.id,
            deviceId: deviceInfo.deviceId,
            deviceName: deviceInfo.deviceName,
            model: deviceInfo.model,
            deviceType: deviceInfo.deviceType,
            nickname: deviceInfo.nickname,
          }
        });

        // Validate required fields
        if (!uid || !deviceInfo) {
          return reply.code(400).send({
            error: "Missing required fields",
            message: "Both uid and deviceInfo are required"
          });
        }

        if (!deviceInfo.id || !deviceInfo.deviceId || !deviceInfo.deviceName) {
          return reply.code(400).send({
            error: "Invalid device info",
            message: "Device info must contain id, deviceId, and deviceName"
          });
        }

        // Check if device already exists for this user
        const existingDeviceQuery = `
          SELECT id, is_verifier, is_primary, status
          FROM pzero.all_devices 
          WHERE uid = $1 AND (
            data->>'deviceId' = $2 OR 
            data->>'id' = $3
          ) AND is_act = true
        `;

        const existingDeviceResult = await db.query(existingDeviceQuery, [
          uid,
          deviceInfo.deviceId,
          deviceInfo.id
        ]);

        let deviceResult;

        if (existingDeviceResult.rows.length > 0) {
          // Update existing device to set as verifier
          const existingDevice = existingDeviceResult.rows[0];
          
          console.log("Updating existing device as verifier:", {
            deviceId: existingDevice.id,
            currentStatus: {
              isVerifier: existingDevice.is_verifier,
              isPrimary: existingDevice.is_primary,
              status: existingDevice.status
            }
          });

          const updateQuery = `
            UPDATE pzero.all_devices 
            SET 
              is_verifier = true,
              status = 'ACTIVE',
              data = $1::jsonb,
              name = $2,
              handle = $3,
              u_at = NOW()
            WHERE id = $4 AND uid = $5 AND is_act = true
            RETURNING *
          `;

          deviceResult = await db.query(updateQuery, [
            JSON.stringify(deviceInfo),
            deviceInfo.nickname || deviceInfo.deviceName,
            `${deviceInfo.deviceName}_${deviceInfo.deviceId}`.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
            existingDevice.id,
            uid
          ]);

        } else {
          // Insert new device as verifier
          console.log("Creating new device as verifier");

          const insertQuery = `
            INSERT INTO pzero.all_devices (
              id,
              name,
              handle,
              uid,
              type,
              status,
              is_primary,
              is_verifier,
              data,
              c_at,
              u_at,
              is_act
            ) VALUES (
              gen_random_uuid(),
              $1,
              $2,
              $3::uuid,
              $4::pzero.device_type,
              'ACTIVE'::pzero.device_status,
              false,
              true,
              $5::jsonb,
              NOW(),
              NOW(),
              true
            ) RETURNING *
          `;

          // Map device type
          let deviceType = 'OTHER';
          if (deviceInfo.deviceType) {
            const type = deviceInfo.deviceType.toUpperCase();
            if (['MOBILE', 'DESKTOP', 'TABLET', 'WEARABLE', 'OTHER'].includes(type)) {
              deviceType = type;
            }
          }

          deviceResult = await db.query(insertQuery, [
            deviceInfo.nickname || deviceInfo.deviceName,
            `${deviceInfo.deviceName}_${deviceInfo.deviceId}`.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
            uid,
            deviceType,
            JSON.stringify(deviceInfo)
          ]);
        }

        const connectedDevice = deviceResult.rows[0];

        console.log("Device connected successfully:", {
          deviceId: connectedDevice.id,
          uid: connectedDevice.uid,
          isVerifier: connectedDevice.is_verifier,
          isPrimary: connectedDevice.is_primary,
          status: connectedDevice.status,
          deviceType: connectedDevice.type
        });

        return reply.code(200).send({
          success: true,
          message: "Device connected successfully",
          device: {
            id: connectedDevice.id,
            name: connectedDevice.name,
            handle: connectedDevice.handle,
            uid: connectedDevice.uid,
            type: connectedDevice.type,
            status: connectedDevice.status,
            isVerifier: connectedDevice.is_verifier,
            isPrimary: connectedDevice.is_primary,
            deviceInfo: connectedDevice.data,
            createdAt: connectedDevice.c_at,
            updatedAt: connectedDevice.u_at
          }
        });

      } catch (error) {
        console.error("Error connecting device:", error);
        
        return reply.code(500).send({
          error: "Internal server error",
          message: "Failed to connect device",
          details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined
        });
      }
    }
  );

  // GET /devices - Get all devices for a user
  fastify.get<{
    Querystring: { uid?: string };
  }>(
    "/devices",
    {
      preHandler: [authenticateToken],
    },
    async (
      request: FastifyRequest<{ Querystring: { uid?: string } }>,
      reply: FastifyReply
    ) => {
      try {
        const { uid: queryUid } = request.query;
        
        // Get the authenticated user's ID
        const authenticatedUser = (request as unknown as AuthenticatedRequest).user;
        const authenticatedUid = authenticatedUser.id;
        
        // If uid is provided in query, verify it matches the authenticated user
        if (queryUid && queryUid !== authenticatedUid) {
          return reply.code(403).send({
            error: "Forbidden",
            message: "Cannot access devices for other users"
          });
        }
        
        // Use the authenticated user's ID regardless of query parameter
        const uid = authenticatedUid;

        const devicesQuery = `
          SELECT 
            id,
            name,
            handle,
            uid,
            type,
            status,
            is_verifier,
            is_primary,
            data,
            c_at,
            u_at
          FROM pzero.all_devices 
          WHERE uid = $1 AND is_act = true
          ORDER BY c_at DESC
        `;

        const result = await db.query(devicesQuery, [uid]);

        return reply.code(200).send({
          success: true,
          devices: result.rows.map((device: any) => ({
            id: device.id,
            name: device.name,
            handle: device.handle,
            uid: device.uid,
            type: device.type,
            status: device.status,
            isVerifier: device.is_verifier,
            isPrimary: device.is_primary,
            deviceInfo: device.data,
            createdAt: device.c_at,
            updatedAt: device.u_at
          }))
        });

      } catch (error) {
        console.error("Error fetching devices:", error);
        
        return reply.code(500).send({
          error: "Internal server error",
          message: "Failed to fetch devices"
        });
      }
    }
  );
}