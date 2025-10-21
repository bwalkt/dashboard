package com.pzero

import android.Manifest
import android.bluetooth.*
import android.bluetooth.le.AdvertiseCallback
import android.bluetooth.le.AdvertiseData
import android.bluetooth.le.AdvertiseSettings
import android.bluetooth.le.BluetoothLeAdvertiser
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.os.ParcelUuid
import android.util.Log
import androidx.core.app.ActivityCompat
import com.facebook.react.bridge.*
import org.json.JSONObject
import java.util.*

class BLEPeripheralModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val TAG = "BLEPeripheralModule"
        private val SERVICE_UUID = UUID.fromString("550e8400-e29b-41d4-a716-446655440000")
        private val GET_ENDPOINTS_UUID = UUID.fromString("550e8400-e29b-41d4-a716-446655440001")
        private val GET_TOKEN_UUID = UUID.fromString("550e8400-e29b-41d4-a716-446655440002")
    }

    private var bluetoothManager: BluetoothManager? = null
    private var bluetoothAdapter: BluetoothAdapter? = null
    private var bluetoothLeAdvertiser: BluetoothLeAdvertiser? = null
    private var bluetoothGattServer: BluetoothGattServer? = null

    private var isAdvertising = false
    private var startAdvertisingPromise: Promise? = null

    // Cached data
    private var endpointsData: ByteArray? = null
    private val tokensByEndpoint = mutableMapOf<String, ByteArray>()
    private val validEndpointIds = mutableSetOf<String>()
    private var requestedEndpointId: String? = null

    override fun getName(): String = "BLEPeripheralModule"

    private fun checkBluetoothAdvertisePermission(): Boolean {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            return ActivityCompat.checkSelfPermission(
                reactApplicationContext,
                Manifest.permission.BLUETOOTH_ADVERTISE
            ) == PackageManager.PERMISSION_GRANTED
        }
        return true
    }

    private fun checkBluetoothConnectPermission(): Boolean {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            return ActivityCompat.checkSelfPermission(
                reactApplicationContext,
                Manifest.permission.BLUETOOTH_CONNECT
            ) == PackageManager.PERMISSION_GRANTED
        }
        return true
    }

    @ReactMethod
    fun initialize(promise: Promise) {
        try {
            bluetoothManager = reactApplicationContext.getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager
            bluetoothAdapter = bluetoothManager?.adapter

            if (bluetoothAdapter == null) {
                promise.reject("BLUETOOTH_NOT_SUPPORTED", "Bluetooth not supported on this device")
                return
            }

            if (!bluetoothAdapter!!.isEnabled) {
                promise.reject("BLUETOOTH_DISABLED", "Bluetooth is disabled")
                return
            }

            bluetoothLeAdvertiser = bluetoothAdapter?.bluetoothLeAdvertiser

            if (bluetoothLeAdvertiser == null) {
                promise.reject("ADVERTISING_NOT_SUPPORTED", "BLE advertising not supported on this device")
                return
            }

            Log.d(TAG, "BLE Peripheral initialized successfully")
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to initialize BLE Peripheral", e)
            promise.reject("INITIALIZATION_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun startAdvertising(endpointsJSON: String, promise: Promise) {
        try {
            if (bluetoothAdapter == null || bluetoothLeAdvertiser == null) {
                promise.reject("NOT_INITIALIZED", "BLE Peripheral not initialized")
                return
            }

            // Check permissions
            if (!checkBluetoothAdvertisePermission()) {
                promise.reject("PERMISSION_DENIED", "BLUETOOTH_ADVERTISE permission not granted")
                return
            }

            // Validate and store endpoints data
            try {
                val endpointsResponse = JSONObject(endpointsJSON)
                val endpointsArray = endpointsResponse.optJSONArray("data")

                // Extract valid endpoint IDs
                validEndpointIds.clear()
                if (endpointsArray != null) {
                    for (i in 0 until endpointsArray.length()) {
                        val endpoint = endpointsArray.getJSONObject(i)
                        val id = endpoint.optString("id")
                        if (id.isNotEmpty()) {
                            validEndpointIds.add(id)
                        }
                    }
                }

                Log.d(TAG, "Loaded ${validEndpointIds.size} valid endpoint IDs")
            } catch (e: Exception) {
                promise.reject("INVALID_JSON", "endpointsJSON is not valid JSON", e)
                return
            }
            endpointsData = endpointsJSON.toByteArray(Charsets.UTF_8)

            // Setup GATT server
            setupGattServer()

            // Start advertising
            val settings = AdvertiseSettings.Builder()
                .setAdvertiseMode(AdvertiseSettings.ADVERTISE_MODE_LOW_POWER)
                .setConnectable(true)
                .setTimeout(0)
                .setTxPowerLevel(AdvertiseSettings.ADVERTISE_TX_POWER_MEDIUM)
                .build()

            val data = AdvertiseData.Builder()
                .setIncludeDeviceName(true)
                .setIncludeTxPowerLevel(false)
                .addServiceUuid(ParcelUuid(SERVICE_UUID))
                .build()

            startAdvertisingPromise = promise
            bluetoothLeAdvertiser?.startAdvertising(settings, data, advertiseCallback)

            Log.d(TAG, "Initiated BLE advertising")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to start advertising", e)
            promise.reject("ADVERTISING_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun stopAdvertising(promise: Promise) {
        try {
            if (bluetoothLeAdvertiser == null) {
                promise.resolve(true)
                return
            }

            // Check permissions
            if (!checkBluetoothAdvertisePermission()) {
                promise.reject("PERMISSION_DENIED", "BLUETOOTH_ADVERTISE permission not granted")
                return
            }

            bluetoothLeAdvertiser?.stopAdvertising(advertiseCallback)
            bluetoothGattServer?.close()
            bluetoothGattServer = null
            isAdvertising = false

            // Clear cached data
            tokensByEndpoint.clear()
            validEndpointIds.clear()
            requestedEndpointId = null

            Log.d(TAG, "Stopped BLE advertising")
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to stop advertising", e)
            promise.reject("STOP_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun isAdvertising(promise: Promise) {
        promise.resolve(isAdvertising)
    }

    @ReactMethod
    fun setTokenForEndpoint(endpointId: String, token: String, promise: Promise) {
        try {
            // Validate endpoint exists
            if (!validEndpointIds.contains(endpointId)) {
                promise.reject("INVALID_ENDPOINT", "Endpoint not found: $endpointId")
                return
            }

            val response = JSONObject()
            response.put("type", "token")
            response.put("data", token)

            tokensByEndpoint[endpointId] = response.toString().toByteArray(Charsets.UTF_8)

            Log.d(TAG, "Token set for endpoint: $endpointId")
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to set token", e)
            promise.reject("TOKEN_ERROR", e.message, e)
        }
    }

    private fun setupGattServer() {
        if (!checkBluetoothConnectPermission()) {
            Log.e(TAG, "BLUETOOTH_CONNECT permission not granted")
            return
        }

        bluetoothGattServer = bluetoothManager?.openGattServer(reactApplicationContext, gattServerCallback)

        // Create characteristics
        val getEndpointsCharacteristic = BluetoothGattCharacteristic(
            GET_ENDPOINTS_UUID,
            BluetoothGattCharacteristic.PROPERTY_READ or BluetoothGattCharacteristic.PROPERTY_WRITE,
            BluetoothGattCharacteristic.PERMISSION_READ or BluetoothGattCharacteristic.PERMISSION_WRITE
        )

        val getTokenCharacteristic = BluetoothGattCharacteristic(
            GET_TOKEN_UUID,
            BluetoothGattCharacteristic.PROPERTY_READ or BluetoothGattCharacteristic.PROPERTY_WRITE,
            BluetoothGattCharacteristic.PERMISSION_READ or BluetoothGattCharacteristic.PERMISSION_WRITE
        )

        // Create service
        val service = BluetoothGattService(SERVICE_UUID, BluetoothGattService.SERVICE_TYPE_PRIMARY)
        service.addCharacteristic(getEndpointsCharacteristic)
        service.addCharacteristic(getTokenCharacteristic)

        // Add service to GATT server
        bluetoothGattServer?.addService(service)

        Log.d(TAG, "GATT server setup complete")
    }

    private val advertiseCallback = object : AdvertiseCallback() {
        override fun onStartSuccess(settingsInEffect: AdvertiseSettings?) {
            Log.d(TAG, "Advertising started successfully")
            isAdvertising = true
            startAdvertisingPromise?.resolve(true)
            startAdvertisingPromise = null
        }

        override fun onStartFailure(errorCode: Int) {
            Log.e(TAG, "Advertising failed with error code: $errorCode")
            isAdvertising = false
            startAdvertisingPromise?.reject("ADVERTISING_FAILED", "Failed with code: $errorCode")
            startAdvertisingPromise = null
        }
    }

    private val gattServerCallback = object : BluetoothGattServerCallback() {
        override fun onConnectionStateChange(device: BluetoothDevice?, status: Int, newState: Int) {
            if (newState == BluetoothProfile.STATE_CONNECTED) {
                Log.d(TAG, "Device connected: ${device?.address}")
            } else if (newState == BluetoothProfile.STATE_DISCONNECTED) {
                Log.d(TAG, "Device disconnected: ${device?.address}")
            }
        }

        override fun onCharacteristicReadRequest(
            device: BluetoothDevice?,
            requestId: Int,
            offset: Int,
            characteristic: BluetoothGattCharacteristic?
        ) {
            Log.d(TAG, "Read request for characteristic: ${characteristic?.uuid}")

            if (!checkBluetoothConnectPermission()) {
                bluetoothGattServer?.sendResponse(
                    device,
                    requestId,
                    BluetoothGatt.GATT_FAILURE,
                    offset,
                    null
                )
                return
            }

            var responseData: ByteArray? = null

            when (characteristic?.uuid) {
                GET_ENDPOINTS_UUID -> {
                    Log.d(TAG, "Client requesting endpoints data")
                    responseData = endpointsData
                }
                GET_TOKEN_UUID -> {
                    val endpointId = requestedEndpointId
                    if (endpointId != null) {
                        Log.d(TAG, "Client requesting token data for endpoint: $endpointId")
                        responseData = tokensByEndpoint[endpointId]
                    } else {
                        Log.d(TAG, "No endpoint ID specified in token request")
                    }
                }
            }

            if (responseData != null) {
                if (offset >= responseData.size) {
                    bluetoothGattServer?.sendResponse(
                        device,
                        requestId,
                        BluetoothGatt.GATT_INVALID_OFFSET,
                        offset,
                        null
                    )
                    return
                }

                val value = responseData.copyOfRange(offset, responseData.size)
                bluetoothGattServer?.sendResponse(
                    device,
                    requestId,
                    BluetoothGatt.GATT_SUCCESS,
                    offset,
                    value
                )
                Log.d(TAG, "Read request successful")
            } else {
                bluetoothGattServer?.sendResponse(
                    device,
                    requestId,
                    BluetoothGatt.GATT_FAILURE,
                    offset,
                    null
                )
                Log.d(TAG, "No data available for characteristic")
            }
        }

        override fun onCharacteristicWriteRequest(
            device: BluetoothDevice?,
            requestId: Int,
            characteristic: BluetoothGattCharacteristic?,
            preparedWrite: Boolean,
            responseNeeded: Boolean,
            offset: Int,
            value: ByteArray?
        ) {
            Log.d(TAG, "Write request for characteristic: ${characteristic?.uuid}")

            if (!checkBluetoothConnectPermission()) {
                if (responseNeeded) {
                    bluetoothGattServer?.sendResponse(
                        device,
                        requestId,
                        BluetoothGatt.GATT_FAILURE,
                        offset,
                        null
                    )
                }
                return
            }

            // Parse write request to extract endpoint ID for token requests
            when (characteristic?.uuid) {
                GET_TOKEN_UUID -> {
                    try {
                        if (value != null) {
                            val requestJson = JSONObject(String(value, Charsets.UTF_8))
                            val requestType = requestJson.optString("type")

                            if (requestType == "getToken") {
                                requestedEndpointId = requestJson.optString("endpointId", null)
                                Log.d(TAG, "Token request for endpoint: $requestedEndpointId")
                            }
                        }
                    } catch (e: Exception) {
                        Log.e(TAG, "Failed to parse token request", e)
                    }
                }
            }

            // Acknowledge write requests
            if (responseNeeded) {
                bluetoothGattServer?.sendResponse(
                    device,
                    requestId,
                    BluetoothGatt.GATT_SUCCESS,
                    offset,
                    null
                )
            }
            Log.d(TAG, "Write request acknowledged")
        }
    }
}
