/*eslint-disable block-scoped-var, id-length, no-control-regex, no-magic-numbers, no-prototype-builtins, no-redeclare, no-shadow, no-var, sort-vars*/
import * as $protobuf from "protobufjs/minimal";

// Common aliases
const $Reader = $protobuf.Reader, $Writer = $protobuf.Writer, $util = $protobuf.util;

// Exported root namespace
const $root = $protobuf.roots["default"] || ($protobuf.roots["default"] = {});

export const purplesector = $root.purplesector = (() => {

    /**
     * Namespace purplesector.
     * @exports purplesector
     * @namespace
     */
    const purplesector = {};

    purplesector.TelemetryFrame = (function() {

        /**
         * Properties of a TelemetryFrame.
         * @memberof purplesector
         * @interface ITelemetryFrame
         * @property {number|Long|null} [timestamp] TelemetryFrame timestamp
         * @property {number|null} [speed] TelemetryFrame speed
         * @property {number|null} [throttle] TelemetryFrame throttle
         * @property {number|null} [brake] TelemetryFrame brake
         * @property {number|null} [steering] TelemetryFrame steering
         * @property {number|null} [gear] TelemetryFrame gear
         * @property {number|null} [rpm] TelemetryFrame rpm
         * @property {number|null} [normalizedPosition] TelemetryFrame normalizedPosition
         * @property {number|null} [lapNumber] TelemetryFrame lapNumber
         * @property {number|null} [lapTime] TelemetryFrame lapTime
         * @property {number|null} [sessionTime] TelemetryFrame sessionTime
         * @property {number|null} [sessionType] TelemetryFrame sessionType
         * @property {number|null} [trackPosition] TelemetryFrame trackPosition
         * @property {number|null} [delta] TelemetryFrame delta
         */

        /**
         * Constructs a new TelemetryFrame.
         * @memberof purplesector
         * @classdesc Represents a TelemetryFrame.
         * @implements ITelemetryFrame
         * @constructor
         * @param {purplesector.ITelemetryFrame=} [properties] Properties to set
         */
        function TelemetryFrame(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * TelemetryFrame timestamp.
         * @member {number|Long} timestamp
         * @memberof purplesector.TelemetryFrame
         * @instance
         */
        TelemetryFrame.prototype.timestamp = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

        /**
         * TelemetryFrame speed.
         * @member {number} speed
         * @memberof purplesector.TelemetryFrame
         * @instance
         */
        TelemetryFrame.prototype.speed = 0;

        /**
         * TelemetryFrame throttle.
         * @member {number} throttle
         * @memberof purplesector.TelemetryFrame
         * @instance
         */
        TelemetryFrame.prototype.throttle = 0;

        /**
         * TelemetryFrame brake.
         * @member {number} brake
         * @memberof purplesector.TelemetryFrame
         * @instance
         */
        TelemetryFrame.prototype.brake = 0;

        /**
         * TelemetryFrame steering.
         * @member {number} steering
         * @memberof purplesector.TelemetryFrame
         * @instance
         */
        TelemetryFrame.prototype.steering = 0;

        /**
         * TelemetryFrame gear.
         * @member {number} gear
         * @memberof purplesector.TelemetryFrame
         * @instance
         */
        TelemetryFrame.prototype.gear = 0;

        /**
         * TelemetryFrame rpm.
         * @member {number} rpm
         * @memberof purplesector.TelemetryFrame
         * @instance
         */
        TelemetryFrame.prototype.rpm = 0;

        /**
         * TelemetryFrame normalizedPosition.
         * @member {number} normalizedPosition
         * @memberof purplesector.TelemetryFrame
         * @instance
         */
        TelemetryFrame.prototype.normalizedPosition = 0;

        /**
         * TelemetryFrame lapNumber.
         * @member {number} lapNumber
         * @memberof purplesector.TelemetryFrame
         * @instance
         */
        TelemetryFrame.prototype.lapNumber = 0;

        /**
         * TelemetryFrame lapTime.
         * @member {number} lapTime
         * @memberof purplesector.TelemetryFrame
         * @instance
         */
        TelemetryFrame.prototype.lapTime = 0;

        /**
         * TelemetryFrame sessionTime.
         * @member {number|null|undefined} sessionTime
         * @memberof purplesector.TelemetryFrame
         * @instance
         */
        TelemetryFrame.prototype.sessionTime = null;

        /**
         * TelemetryFrame sessionType.
         * @member {number|null|undefined} sessionType
         * @memberof purplesector.TelemetryFrame
         * @instance
         */
        TelemetryFrame.prototype.sessionType = null;

        /**
         * TelemetryFrame trackPosition.
         * @member {number|null|undefined} trackPosition
         * @memberof purplesector.TelemetryFrame
         * @instance
         */
        TelemetryFrame.prototype.trackPosition = null;

        /**
         * TelemetryFrame delta.
         * @member {number|null|undefined} delta
         * @memberof purplesector.TelemetryFrame
         * @instance
         */
        TelemetryFrame.prototype.delta = null;

        // OneOf field names bound to virtual getters and setters
        let $oneOfFields;

        /**
         * TelemetryFrame _sessionTime.
         * @member {"sessionTime"|undefined} _sessionTime
         * @memberof purplesector.TelemetryFrame
         * @instance
         */
        Object.defineProperty(TelemetryFrame.prototype, "_sessionTime", {
            get: $util.oneOfGetter($oneOfFields = ["sessionTime"]),
            set: $util.oneOfSetter($oneOfFields)
        });

        /**
         * TelemetryFrame _sessionType.
         * @member {"sessionType"|undefined} _sessionType
         * @memberof purplesector.TelemetryFrame
         * @instance
         */
        Object.defineProperty(TelemetryFrame.prototype, "_sessionType", {
            get: $util.oneOfGetter($oneOfFields = ["sessionType"]),
            set: $util.oneOfSetter($oneOfFields)
        });

        /**
         * TelemetryFrame _trackPosition.
         * @member {"trackPosition"|undefined} _trackPosition
         * @memberof purplesector.TelemetryFrame
         * @instance
         */
        Object.defineProperty(TelemetryFrame.prototype, "_trackPosition", {
            get: $util.oneOfGetter($oneOfFields = ["trackPosition"]),
            set: $util.oneOfSetter($oneOfFields)
        });

        /**
         * TelemetryFrame _delta.
         * @member {"delta"|undefined} _delta
         * @memberof purplesector.TelemetryFrame
         * @instance
         */
        Object.defineProperty(TelemetryFrame.prototype, "_delta", {
            get: $util.oneOfGetter($oneOfFields = ["delta"]),
            set: $util.oneOfSetter($oneOfFields)
        });

        /**
         * Creates a new TelemetryFrame instance using the specified properties.
         * @function create
         * @memberof purplesector.TelemetryFrame
         * @static
         * @param {purplesector.ITelemetryFrame=} [properties] Properties to set
         * @returns {purplesector.TelemetryFrame} TelemetryFrame instance
         */
        TelemetryFrame.create = function create(properties) {
            return new TelemetryFrame(properties);
        };

        /**
         * Encodes the specified TelemetryFrame message. Does not implicitly {@link purplesector.TelemetryFrame.verify|verify} messages.
         * @function encode
         * @memberof purplesector.TelemetryFrame
         * @static
         * @param {purplesector.ITelemetryFrame} message TelemetryFrame message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        TelemetryFrame.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.timestamp != null && Object.hasOwnProperty.call(message, "timestamp"))
                writer.uint32(/* id 1, wireType 0 =*/8).int64(message.timestamp);
            if (message.speed != null && Object.hasOwnProperty.call(message, "speed"))
                writer.uint32(/* id 2, wireType 5 =*/21).float(message.speed);
            if (message.throttle != null && Object.hasOwnProperty.call(message, "throttle"))
                writer.uint32(/* id 3, wireType 5 =*/29).float(message.throttle);
            if (message.brake != null && Object.hasOwnProperty.call(message, "brake"))
                writer.uint32(/* id 4, wireType 5 =*/37).float(message.brake);
            if (message.steering != null && Object.hasOwnProperty.call(message, "steering"))
                writer.uint32(/* id 5, wireType 5 =*/45).float(message.steering);
            if (message.gear != null && Object.hasOwnProperty.call(message, "gear"))
                writer.uint32(/* id 6, wireType 0 =*/48).int32(message.gear);
            if (message.rpm != null && Object.hasOwnProperty.call(message, "rpm"))
                writer.uint32(/* id 7, wireType 0 =*/56).int32(message.rpm);
            if (message.normalizedPosition != null && Object.hasOwnProperty.call(message, "normalizedPosition"))
                writer.uint32(/* id 8, wireType 5 =*/69).float(message.normalizedPosition);
            if (message.lapNumber != null && Object.hasOwnProperty.call(message, "lapNumber"))
                writer.uint32(/* id 9, wireType 0 =*/72).int32(message.lapNumber);
            if (message.lapTime != null && Object.hasOwnProperty.call(message, "lapTime"))
                writer.uint32(/* id 10, wireType 0 =*/80).int32(message.lapTime);
            if (message.sessionTime != null && Object.hasOwnProperty.call(message, "sessionTime"))
                writer.uint32(/* id 11, wireType 5 =*/93).float(message.sessionTime);
            if (message.sessionType != null && Object.hasOwnProperty.call(message, "sessionType"))
                writer.uint32(/* id 12, wireType 0 =*/96).int32(message.sessionType);
            if (message.trackPosition != null && Object.hasOwnProperty.call(message, "trackPosition"))
                writer.uint32(/* id 13, wireType 0 =*/104).int32(message.trackPosition);
            if (message.delta != null && Object.hasOwnProperty.call(message, "delta"))
                writer.uint32(/* id 14, wireType 0 =*/112).int32(message.delta);
            return writer;
        };

        /**
         * Encodes the specified TelemetryFrame message, length delimited. Does not implicitly {@link purplesector.TelemetryFrame.verify|verify} messages.
         * @function encodeDelimited
         * @memberof purplesector.TelemetryFrame
         * @static
         * @param {purplesector.ITelemetryFrame} message TelemetryFrame message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        TelemetryFrame.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a TelemetryFrame message from the specified reader or buffer.
         * @function decode
         * @memberof purplesector.TelemetryFrame
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {purplesector.TelemetryFrame} TelemetryFrame
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        TelemetryFrame.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.purplesector.TelemetryFrame();
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.timestamp = reader.int64();
                        break;
                    }
                case 2: {
                        message.speed = reader.float();
                        break;
                    }
                case 3: {
                        message.throttle = reader.float();
                        break;
                    }
                case 4: {
                        message.brake = reader.float();
                        break;
                    }
                case 5: {
                        message.steering = reader.float();
                        break;
                    }
                case 6: {
                        message.gear = reader.int32();
                        break;
                    }
                case 7: {
                        message.rpm = reader.int32();
                        break;
                    }
                case 8: {
                        message.normalizedPosition = reader.float();
                        break;
                    }
                case 9: {
                        message.lapNumber = reader.int32();
                        break;
                    }
                case 10: {
                        message.lapTime = reader.int32();
                        break;
                    }
                case 11: {
                        message.sessionTime = reader.float();
                        break;
                    }
                case 12: {
                        message.sessionType = reader.int32();
                        break;
                    }
                case 13: {
                        message.trackPosition = reader.int32();
                        break;
                    }
                case 14: {
                        message.delta = reader.int32();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a TelemetryFrame message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof purplesector.TelemetryFrame
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {purplesector.TelemetryFrame} TelemetryFrame
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        TelemetryFrame.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a TelemetryFrame message.
         * @function verify
         * @memberof purplesector.TelemetryFrame
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        TelemetryFrame.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            let properties = {};
            if (message.timestamp != null && message.hasOwnProperty("timestamp"))
                if (!$util.isInteger(message.timestamp) && !(message.timestamp && $util.isInteger(message.timestamp.low) && $util.isInteger(message.timestamp.high)))
                    return "timestamp: integer|Long expected";
            if (message.speed != null && message.hasOwnProperty("speed"))
                if (typeof message.speed !== "number")
                    return "speed: number expected";
            if (message.throttle != null && message.hasOwnProperty("throttle"))
                if (typeof message.throttle !== "number")
                    return "throttle: number expected";
            if (message.brake != null && message.hasOwnProperty("brake"))
                if (typeof message.brake !== "number")
                    return "brake: number expected";
            if (message.steering != null && message.hasOwnProperty("steering"))
                if (typeof message.steering !== "number")
                    return "steering: number expected";
            if (message.gear != null && message.hasOwnProperty("gear"))
                if (!$util.isInteger(message.gear))
                    return "gear: integer expected";
            if (message.rpm != null && message.hasOwnProperty("rpm"))
                if (!$util.isInteger(message.rpm))
                    return "rpm: integer expected";
            if (message.normalizedPosition != null && message.hasOwnProperty("normalizedPosition"))
                if (typeof message.normalizedPosition !== "number")
                    return "normalizedPosition: number expected";
            if (message.lapNumber != null && message.hasOwnProperty("lapNumber"))
                if (!$util.isInteger(message.lapNumber))
                    return "lapNumber: integer expected";
            if (message.lapTime != null && message.hasOwnProperty("lapTime"))
                if (!$util.isInteger(message.lapTime))
                    return "lapTime: integer expected";
            if (message.sessionTime != null && message.hasOwnProperty("sessionTime")) {
                properties._sessionTime = 1;
                if (typeof message.sessionTime !== "number")
                    return "sessionTime: number expected";
            }
            if (message.sessionType != null && message.hasOwnProperty("sessionType")) {
                properties._sessionType = 1;
                if (!$util.isInteger(message.sessionType))
                    return "sessionType: integer expected";
            }
            if (message.trackPosition != null && message.hasOwnProperty("trackPosition")) {
                properties._trackPosition = 1;
                if (!$util.isInteger(message.trackPosition))
                    return "trackPosition: integer expected";
            }
            if (message.delta != null && message.hasOwnProperty("delta")) {
                properties._delta = 1;
                if (!$util.isInteger(message.delta))
                    return "delta: integer expected";
            }
            return null;
        };

        /**
         * Creates a TelemetryFrame message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof purplesector.TelemetryFrame
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {purplesector.TelemetryFrame} TelemetryFrame
         */
        TelemetryFrame.fromObject = function fromObject(object) {
            if (object instanceof $root.purplesector.TelemetryFrame)
                return object;
            let message = new $root.purplesector.TelemetryFrame();
            if (object.timestamp != null)
                if ($util.Long)
                    (message.timestamp = $util.Long.fromValue(object.timestamp)).unsigned = false;
                else if (typeof object.timestamp === "string")
                    message.timestamp = parseInt(object.timestamp, 10);
                else if (typeof object.timestamp === "number")
                    message.timestamp = object.timestamp;
                else if (typeof object.timestamp === "object")
                    message.timestamp = new $util.LongBits(object.timestamp.low >>> 0, object.timestamp.high >>> 0).toNumber();
            if (object.speed != null)
                message.speed = Number(object.speed);
            if (object.throttle != null)
                message.throttle = Number(object.throttle);
            if (object.brake != null)
                message.brake = Number(object.brake);
            if (object.steering != null)
                message.steering = Number(object.steering);
            if (object.gear != null)
                message.gear = object.gear | 0;
            if (object.rpm != null)
                message.rpm = object.rpm | 0;
            if (object.normalizedPosition != null)
                message.normalizedPosition = Number(object.normalizedPosition);
            if (object.lapNumber != null)
                message.lapNumber = object.lapNumber | 0;
            if (object.lapTime != null)
                message.lapTime = object.lapTime | 0;
            if (object.sessionTime != null)
                message.sessionTime = Number(object.sessionTime);
            if (object.sessionType != null)
                message.sessionType = object.sessionType | 0;
            if (object.trackPosition != null)
                message.trackPosition = object.trackPosition | 0;
            if (object.delta != null)
                message.delta = object.delta | 0;
            return message;
        };

        /**
         * Creates a plain object from a TelemetryFrame message. Also converts values to other types if specified.
         * @function toObject
         * @memberof purplesector.TelemetryFrame
         * @static
         * @param {purplesector.TelemetryFrame} message TelemetryFrame
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        TelemetryFrame.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.defaults) {
                if ($util.Long) {
                    let long = new $util.Long(0, 0, false);
                    object.timestamp = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                } else
                    object.timestamp = options.longs === String ? "0" : 0;
                object.speed = 0;
                object.throttle = 0;
                object.brake = 0;
                object.steering = 0;
                object.gear = 0;
                object.rpm = 0;
                object.normalizedPosition = 0;
                object.lapNumber = 0;
                object.lapTime = 0;
            }
            if (message.timestamp != null && message.hasOwnProperty("timestamp"))
                if (typeof message.timestamp === "number")
                    object.timestamp = options.longs === String ? String(message.timestamp) : message.timestamp;
                else
                    object.timestamp = options.longs === String ? $util.Long.prototype.toString.call(message.timestamp) : options.longs === Number ? new $util.LongBits(message.timestamp.low >>> 0, message.timestamp.high >>> 0).toNumber() : message.timestamp;
            if (message.speed != null && message.hasOwnProperty("speed"))
                object.speed = options.json && !isFinite(message.speed) ? String(message.speed) : message.speed;
            if (message.throttle != null && message.hasOwnProperty("throttle"))
                object.throttle = options.json && !isFinite(message.throttle) ? String(message.throttle) : message.throttle;
            if (message.brake != null && message.hasOwnProperty("brake"))
                object.brake = options.json && !isFinite(message.brake) ? String(message.brake) : message.brake;
            if (message.steering != null && message.hasOwnProperty("steering"))
                object.steering = options.json && !isFinite(message.steering) ? String(message.steering) : message.steering;
            if (message.gear != null && message.hasOwnProperty("gear"))
                object.gear = message.gear;
            if (message.rpm != null && message.hasOwnProperty("rpm"))
                object.rpm = message.rpm;
            if (message.normalizedPosition != null && message.hasOwnProperty("normalizedPosition"))
                object.normalizedPosition = options.json && !isFinite(message.normalizedPosition) ? String(message.normalizedPosition) : message.normalizedPosition;
            if (message.lapNumber != null && message.hasOwnProperty("lapNumber"))
                object.lapNumber = message.lapNumber;
            if (message.lapTime != null && message.hasOwnProperty("lapTime"))
                object.lapTime = message.lapTime;
            if (message.sessionTime != null && message.hasOwnProperty("sessionTime")) {
                object.sessionTime = options.json && !isFinite(message.sessionTime) ? String(message.sessionTime) : message.sessionTime;
                if (options.oneofs)
                    object._sessionTime = "sessionTime";
            }
            if (message.sessionType != null && message.hasOwnProperty("sessionType")) {
                object.sessionType = message.sessionType;
                if (options.oneofs)
                    object._sessionType = "sessionType";
            }
            if (message.trackPosition != null && message.hasOwnProperty("trackPosition")) {
                object.trackPosition = message.trackPosition;
                if (options.oneofs)
                    object._trackPosition = "trackPosition";
            }
            if (message.delta != null && message.hasOwnProperty("delta")) {
                object.delta = message.delta;
                if (options.oneofs)
                    object._delta = "delta";
            }
            return object;
        };

        /**
         * Converts this TelemetryFrame to JSON.
         * @function toJSON
         * @memberof purplesector.TelemetryFrame
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        TelemetryFrame.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for TelemetryFrame
         * @function getTypeUrl
         * @memberof purplesector.TelemetryFrame
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        TelemetryFrame.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/purplesector.TelemetryFrame";
        };

        return TelemetryFrame;
    })();

    purplesector.WebSocketMessage = (function() {

        /**
         * Properties of a WebSocketMessage.
         * @memberof purplesector
         * @interface IWebSocketMessage
         * @property {purplesector.WebSocketMessage.MessageType|null} [type] WebSocketMessage type
         * @property {purplesector.ITelemetryFrame|null} [telemetry] WebSocketMessage telemetry
         * @property {purplesector.IStatusMessage|null} [status] WebSocketMessage status
         */

        /**
         * Constructs a new WebSocketMessage.
         * @memberof purplesector
         * @classdesc Represents a WebSocketMessage.
         * @implements IWebSocketMessage
         * @constructor
         * @param {purplesector.IWebSocketMessage=} [properties] Properties to set
         */
        function WebSocketMessage(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * WebSocketMessage type.
         * @member {purplesector.WebSocketMessage.MessageType} type
         * @memberof purplesector.WebSocketMessage
         * @instance
         */
        WebSocketMessage.prototype.type = 0;

        /**
         * WebSocketMessage telemetry.
         * @member {purplesector.ITelemetryFrame|null|undefined} telemetry
         * @memberof purplesector.WebSocketMessage
         * @instance
         */
        WebSocketMessage.prototype.telemetry = null;

        /**
         * WebSocketMessage status.
         * @member {purplesector.IStatusMessage|null|undefined} status
         * @memberof purplesector.WebSocketMessage
         * @instance
         */
        WebSocketMessage.prototype.status = null;

        // OneOf field names bound to virtual getters and setters
        let $oneOfFields;

        /**
         * WebSocketMessage _telemetry.
         * @member {"telemetry"|undefined} _telemetry
         * @memberof purplesector.WebSocketMessage
         * @instance
         */
        Object.defineProperty(WebSocketMessage.prototype, "_telemetry", {
            get: $util.oneOfGetter($oneOfFields = ["telemetry"]),
            set: $util.oneOfSetter($oneOfFields)
        });

        /**
         * WebSocketMessage _status.
         * @member {"status"|undefined} _status
         * @memberof purplesector.WebSocketMessage
         * @instance
         */
        Object.defineProperty(WebSocketMessage.prototype, "_status", {
            get: $util.oneOfGetter($oneOfFields = ["status"]),
            set: $util.oneOfSetter($oneOfFields)
        });

        /**
         * Creates a new WebSocketMessage instance using the specified properties.
         * @function create
         * @memberof purplesector.WebSocketMessage
         * @static
         * @param {purplesector.IWebSocketMessage=} [properties] Properties to set
         * @returns {purplesector.WebSocketMessage} WebSocketMessage instance
         */
        WebSocketMessage.create = function create(properties) {
            return new WebSocketMessage(properties);
        };

        /**
         * Encodes the specified WebSocketMessage message. Does not implicitly {@link purplesector.WebSocketMessage.verify|verify} messages.
         * @function encode
         * @memberof purplesector.WebSocketMessage
         * @static
         * @param {purplesector.IWebSocketMessage} message WebSocketMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        WebSocketMessage.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.type != null && Object.hasOwnProperty.call(message, "type"))
                writer.uint32(/* id 1, wireType 0 =*/8).int32(message.type);
            if (message.telemetry != null && Object.hasOwnProperty.call(message, "telemetry"))
                $root.purplesector.TelemetryFrame.encode(message.telemetry, writer.uint32(/* id 2, wireType 2 =*/18).fork()).ldelim();
            if (message.status != null && Object.hasOwnProperty.call(message, "status"))
                $root.purplesector.StatusMessage.encode(message.status, writer.uint32(/* id 3, wireType 2 =*/26).fork()).ldelim();
            return writer;
        };

        /**
         * Encodes the specified WebSocketMessage message, length delimited. Does not implicitly {@link purplesector.WebSocketMessage.verify|verify} messages.
         * @function encodeDelimited
         * @memberof purplesector.WebSocketMessage
         * @static
         * @param {purplesector.IWebSocketMessage} message WebSocketMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        WebSocketMessage.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a WebSocketMessage message from the specified reader or buffer.
         * @function decode
         * @memberof purplesector.WebSocketMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {purplesector.WebSocketMessage} WebSocketMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        WebSocketMessage.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.purplesector.WebSocketMessage();
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.type = reader.int32();
                        break;
                    }
                case 2: {
                        message.telemetry = $root.purplesector.TelemetryFrame.decode(reader, reader.uint32());
                        break;
                    }
                case 3: {
                        message.status = $root.purplesector.StatusMessage.decode(reader, reader.uint32());
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a WebSocketMessage message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof purplesector.WebSocketMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {purplesector.WebSocketMessage} WebSocketMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        WebSocketMessage.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a WebSocketMessage message.
         * @function verify
         * @memberof purplesector.WebSocketMessage
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        WebSocketMessage.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            let properties = {};
            if (message.type != null && message.hasOwnProperty("type"))
                switch (message.type) {
                default:
                    return "type: enum value expected";
                case 0:
                case 1:
                case 2:
                case 3:
                case 4:
                case 5:
                case 6:
                case 7:
                    break;
                }
            if (message.telemetry != null && message.hasOwnProperty("telemetry")) {
                properties._telemetry = 1;
                {
                    let error = $root.purplesector.TelemetryFrame.verify(message.telemetry);
                    if (error)
                        return "telemetry." + error;
                }
            }
            if (message.status != null && message.hasOwnProperty("status")) {
                properties._status = 1;
                {
                    let error = $root.purplesector.StatusMessage.verify(message.status);
                    if (error)
                        return "status." + error;
                }
            }
            return null;
        };

        /**
         * Creates a WebSocketMessage message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof purplesector.WebSocketMessage
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {purplesector.WebSocketMessage} WebSocketMessage
         */
        WebSocketMessage.fromObject = function fromObject(object) {
            if (object instanceof $root.purplesector.WebSocketMessage)
                return object;
            let message = new $root.purplesector.WebSocketMessage();
            switch (object.type) {
            default:
                if (typeof object.type === "number") {
                    message.type = object.type;
                    break;
                }
                break;
            case "UNKNOWN":
            case 0:
                message.type = 0;
                break;
            case "CONNECTED":
            case 1:
                message.type = 1;
                break;
            case "TELEMETRY":
            case 2:
                message.type = 2;
                break;
            case "START_DEMO":
            case 3:
                message.type = 3;
                break;
            case "STOP_DEMO":
            case 4:
                message.type = 4;
                break;
            case "DEMO_COMPLETE":
            case 5:
                message.type = 5;
                break;
            case "PING":
            case 6:
                message.type = 6;
                break;
            case "PONG":
            case 7:
                message.type = 7;
                break;
            }
            if (object.telemetry != null) {
                if (typeof object.telemetry !== "object")
                    throw TypeError(".purplesector.WebSocketMessage.telemetry: object expected");
                message.telemetry = $root.purplesector.TelemetryFrame.fromObject(object.telemetry);
            }
            if (object.status != null) {
                if (typeof object.status !== "object")
                    throw TypeError(".purplesector.WebSocketMessage.status: object expected");
                message.status = $root.purplesector.StatusMessage.fromObject(object.status);
            }
            return message;
        };

        /**
         * Creates a plain object from a WebSocketMessage message. Also converts values to other types if specified.
         * @function toObject
         * @memberof purplesector.WebSocketMessage
         * @static
         * @param {purplesector.WebSocketMessage} message WebSocketMessage
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        WebSocketMessage.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.defaults)
                object.type = options.enums === String ? "UNKNOWN" : 0;
            if (message.type != null && message.hasOwnProperty("type"))
                object.type = options.enums === String ? $root.purplesector.WebSocketMessage.MessageType[message.type] === undefined ? message.type : $root.purplesector.WebSocketMessage.MessageType[message.type] : message.type;
            if (message.telemetry != null && message.hasOwnProperty("telemetry")) {
                object.telemetry = $root.purplesector.TelemetryFrame.toObject(message.telemetry, options);
                if (options.oneofs)
                    object._telemetry = "telemetry";
            }
            if (message.status != null && message.hasOwnProperty("status")) {
                object.status = $root.purplesector.StatusMessage.toObject(message.status, options);
                if (options.oneofs)
                    object._status = "status";
            }
            return object;
        };

        /**
         * Converts this WebSocketMessage to JSON.
         * @function toJSON
         * @memberof purplesector.WebSocketMessage
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        WebSocketMessage.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for WebSocketMessage
         * @function getTypeUrl
         * @memberof purplesector.WebSocketMessage
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        WebSocketMessage.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/purplesector.WebSocketMessage";
        };

        /**
         * MessageType enum.
         * @name purplesector.WebSocketMessage.MessageType
         * @enum {number}
         * @property {number} UNKNOWN=0 UNKNOWN value
         * @property {number} CONNECTED=1 CONNECTED value
         * @property {number} TELEMETRY=2 TELEMETRY value
         * @property {number} START_DEMO=3 START_DEMO value
         * @property {number} STOP_DEMO=4 STOP_DEMO value
         * @property {number} DEMO_COMPLETE=5 DEMO_COMPLETE value
         * @property {number} PING=6 PING value
         * @property {number} PONG=7 PONG value
         */
        WebSocketMessage.MessageType = (function() {
            const valuesById = {}, values = Object.create(valuesById);
            values[valuesById[0] = "UNKNOWN"] = 0;
            values[valuesById[1] = "CONNECTED"] = 1;
            values[valuesById[2] = "TELEMETRY"] = 2;
            values[valuesById[3] = "START_DEMO"] = 3;
            values[valuesById[4] = "STOP_DEMO"] = 4;
            values[valuesById[5] = "DEMO_COMPLETE"] = 5;
            values[valuesById[6] = "PING"] = 6;
            values[valuesById[7] = "PONG"] = 7;
            return values;
        })();

        return WebSocketMessage;
    })();

    purplesector.StatusMessage = (function() {

        /**
         * Properties of a StatusMessage.
         * @memberof purplesector
         * @interface IStatusMessage
         * @property {string|null} [message] StatusMessage message
         * @property {number|Long|null} [timestamp] StatusMessage timestamp
         */

        /**
         * Constructs a new StatusMessage.
         * @memberof purplesector
         * @classdesc Represents a StatusMessage.
         * @implements IStatusMessage
         * @constructor
         * @param {purplesector.IStatusMessage=} [properties] Properties to set
         */
        function StatusMessage(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * StatusMessage message.
         * @member {string} message
         * @memberof purplesector.StatusMessage
         * @instance
         */
        StatusMessage.prototype.message = "";

        /**
         * StatusMessage timestamp.
         * @member {number|Long} timestamp
         * @memberof purplesector.StatusMessage
         * @instance
         */
        StatusMessage.prototype.timestamp = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

        /**
         * Creates a new StatusMessage instance using the specified properties.
         * @function create
         * @memberof purplesector.StatusMessage
         * @static
         * @param {purplesector.IStatusMessage=} [properties] Properties to set
         * @returns {purplesector.StatusMessage} StatusMessage instance
         */
        StatusMessage.create = function create(properties) {
            return new StatusMessage(properties);
        };

        /**
         * Encodes the specified StatusMessage message. Does not implicitly {@link purplesector.StatusMessage.verify|verify} messages.
         * @function encode
         * @memberof purplesector.StatusMessage
         * @static
         * @param {purplesector.IStatusMessage} message StatusMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        StatusMessage.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.message != null && Object.hasOwnProperty.call(message, "message"))
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.message);
            if (message.timestamp != null && Object.hasOwnProperty.call(message, "timestamp"))
                writer.uint32(/* id 2, wireType 0 =*/16).int64(message.timestamp);
            return writer;
        };

        /**
         * Encodes the specified StatusMessage message, length delimited. Does not implicitly {@link purplesector.StatusMessage.verify|verify} messages.
         * @function encodeDelimited
         * @memberof purplesector.StatusMessage
         * @static
         * @param {purplesector.IStatusMessage} message StatusMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        StatusMessage.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a StatusMessage message from the specified reader or buffer.
         * @function decode
         * @memberof purplesector.StatusMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {purplesector.StatusMessage} StatusMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        StatusMessage.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.purplesector.StatusMessage();
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.message = reader.string();
                        break;
                    }
                case 2: {
                        message.timestamp = reader.int64();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a StatusMessage message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof purplesector.StatusMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {purplesector.StatusMessage} StatusMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        StatusMessage.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a StatusMessage message.
         * @function verify
         * @memberof purplesector.StatusMessage
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        StatusMessage.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.message != null && message.hasOwnProperty("message"))
                if (!$util.isString(message.message))
                    return "message: string expected";
            if (message.timestamp != null && message.hasOwnProperty("timestamp"))
                if (!$util.isInteger(message.timestamp) && !(message.timestamp && $util.isInteger(message.timestamp.low) && $util.isInteger(message.timestamp.high)))
                    return "timestamp: integer|Long expected";
            return null;
        };

        /**
         * Creates a StatusMessage message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof purplesector.StatusMessage
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {purplesector.StatusMessage} StatusMessage
         */
        StatusMessage.fromObject = function fromObject(object) {
            if (object instanceof $root.purplesector.StatusMessage)
                return object;
            let message = new $root.purplesector.StatusMessage();
            if (object.message != null)
                message.message = String(object.message);
            if (object.timestamp != null)
                if ($util.Long)
                    (message.timestamp = $util.Long.fromValue(object.timestamp)).unsigned = false;
                else if (typeof object.timestamp === "string")
                    message.timestamp = parseInt(object.timestamp, 10);
                else if (typeof object.timestamp === "number")
                    message.timestamp = object.timestamp;
                else if (typeof object.timestamp === "object")
                    message.timestamp = new $util.LongBits(object.timestamp.low >>> 0, object.timestamp.high >>> 0).toNumber();
            return message;
        };

        /**
         * Creates a plain object from a StatusMessage message. Also converts values to other types if specified.
         * @function toObject
         * @memberof purplesector.StatusMessage
         * @static
         * @param {purplesector.StatusMessage} message StatusMessage
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        StatusMessage.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.defaults) {
                object.message = "";
                if ($util.Long) {
                    let long = new $util.Long(0, 0, false);
                    object.timestamp = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                } else
                    object.timestamp = options.longs === String ? "0" : 0;
            }
            if (message.message != null && message.hasOwnProperty("message"))
                object.message = message.message;
            if (message.timestamp != null && message.hasOwnProperty("timestamp"))
                if (typeof message.timestamp === "number")
                    object.timestamp = options.longs === String ? String(message.timestamp) : message.timestamp;
                else
                    object.timestamp = options.longs === String ? $util.Long.prototype.toString.call(message.timestamp) : options.longs === Number ? new $util.LongBits(message.timestamp.low >>> 0, message.timestamp.high >>> 0).toNumber() : message.timestamp;
            return object;
        };

        /**
         * Converts this StatusMessage to JSON.
         * @function toJSON
         * @memberof purplesector.StatusMessage
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        StatusMessage.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for StatusMessage
         * @function getTypeUrl
         * @memberof purplesector.StatusMessage
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        StatusMessage.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/purplesector.StatusMessage";
        };

        return StatusMessage;
    })();

    purplesector.DemoData = (function() {

        /**
         * Properties of a DemoData.
         * @memberof purplesector
         * @interface IDemoData
         * @property {Array.<purplesector.ILapData>|null} [laps] DemoData laps
         */

        /**
         * Constructs a new DemoData.
         * @memberof purplesector
         * @classdesc Represents a DemoData.
         * @implements IDemoData
         * @constructor
         * @param {purplesector.IDemoData=} [properties] Properties to set
         */
        function DemoData(properties) {
            this.laps = [];
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * DemoData laps.
         * @member {Array.<purplesector.ILapData>} laps
         * @memberof purplesector.DemoData
         * @instance
         */
        DemoData.prototype.laps = $util.emptyArray;

        /**
         * Creates a new DemoData instance using the specified properties.
         * @function create
         * @memberof purplesector.DemoData
         * @static
         * @param {purplesector.IDemoData=} [properties] Properties to set
         * @returns {purplesector.DemoData} DemoData instance
         */
        DemoData.create = function create(properties) {
            return new DemoData(properties);
        };

        /**
         * Encodes the specified DemoData message. Does not implicitly {@link purplesector.DemoData.verify|verify} messages.
         * @function encode
         * @memberof purplesector.DemoData
         * @static
         * @param {purplesector.IDemoData} message DemoData message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        DemoData.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.laps != null && message.laps.length)
                for (let i = 0; i < message.laps.length; ++i)
                    $root.purplesector.LapData.encode(message.laps[i], writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
            return writer;
        };

        /**
         * Encodes the specified DemoData message, length delimited. Does not implicitly {@link purplesector.DemoData.verify|verify} messages.
         * @function encodeDelimited
         * @memberof purplesector.DemoData
         * @static
         * @param {purplesector.IDemoData} message DemoData message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        DemoData.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a DemoData message from the specified reader or buffer.
         * @function decode
         * @memberof purplesector.DemoData
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {purplesector.DemoData} DemoData
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        DemoData.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.purplesector.DemoData();
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        if (!(message.laps && message.laps.length))
                            message.laps = [];
                        message.laps.push($root.purplesector.LapData.decode(reader, reader.uint32()));
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a DemoData message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof purplesector.DemoData
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {purplesector.DemoData} DemoData
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        DemoData.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a DemoData message.
         * @function verify
         * @memberof purplesector.DemoData
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        DemoData.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.laps != null && message.hasOwnProperty("laps")) {
                if (!Array.isArray(message.laps))
                    return "laps: array expected";
                for (let i = 0; i < message.laps.length; ++i) {
                    let error = $root.purplesector.LapData.verify(message.laps[i]);
                    if (error)
                        return "laps." + error;
                }
            }
            return null;
        };

        /**
         * Creates a DemoData message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof purplesector.DemoData
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {purplesector.DemoData} DemoData
         */
        DemoData.fromObject = function fromObject(object) {
            if (object instanceof $root.purplesector.DemoData)
                return object;
            let message = new $root.purplesector.DemoData();
            if (object.laps) {
                if (!Array.isArray(object.laps))
                    throw TypeError(".purplesector.DemoData.laps: array expected");
                message.laps = [];
                for (let i = 0; i < object.laps.length; ++i) {
                    if (typeof object.laps[i] !== "object")
                        throw TypeError(".purplesector.DemoData.laps: object expected");
                    message.laps[i] = $root.purplesector.LapData.fromObject(object.laps[i]);
                }
            }
            return message;
        };

        /**
         * Creates a plain object from a DemoData message. Also converts values to other types if specified.
         * @function toObject
         * @memberof purplesector.DemoData
         * @static
         * @param {purplesector.DemoData} message DemoData
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        DemoData.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.arrays || options.defaults)
                object.laps = [];
            if (message.laps && message.laps.length) {
                object.laps = [];
                for (let j = 0; j < message.laps.length; ++j)
                    object.laps[j] = $root.purplesector.LapData.toObject(message.laps[j], options);
            }
            return object;
        };

        /**
         * Converts this DemoData to JSON.
         * @function toJSON
         * @memberof purplesector.DemoData
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        DemoData.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for DemoData
         * @function getTypeUrl
         * @memberof purplesector.DemoData
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        DemoData.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/purplesector.DemoData";
        };

        return DemoData;
    })();

    purplesector.LapData = (function() {

        /**
         * Properties of a LapData.
         * @memberof purplesector
         * @interface ILapData
         * @property {number|null} [lapNumber] LapData lapNumber
         * @property {Array.<purplesector.ITelemetryFrame>|null} [frames] LapData frames
         */

        /**
         * Constructs a new LapData.
         * @memberof purplesector
         * @classdesc Represents a LapData.
         * @implements ILapData
         * @constructor
         * @param {purplesector.ILapData=} [properties] Properties to set
         */
        function LapData(properties) {
            this.frames = [];
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * LapData lapNumber.
         * @member {number} lapNumber
         * @memberof purplesector.LapData
         * @instance
         */
        LapData.prototype.lapNumber = 0;

        /**
         * LapData frames.
         * @member {Array.<purplesector.ITelemetryFrame>} frames
         * @memberof purplesector.LapData
         * @instance
         */
        LapData.prototype.frames = $util.emptyArray;

        /**
         * Creates a new LapData instance using the specified properties.
         * @function create
         * @memberof purplesector.LapData
         * @static
         * @param {purplesector.ILapData=} [properties] Properties to set
         * @returns {purplesector.LapData} LapData instance
         */
        LapData.create = function create(properties) {
            return new LapData(properties);
        };

        /**
         * Encodes the specified LapData message. Does not implicitly {@link purplesector.LapData.verify|verify} messages.
         * @function encode
         * @memberof purplesector.LapData
         * @static
         * @param {purplesector.ILapData} message LapData message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        LapData.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.lapNumber != null && Object.hasOwnProperty.call(message, "lapNumber"))
                writer.uint32(/* id 1, wireType 0 =*/8).int32(message.lapNumber);
            if (message.frames != null && message.frames.length)
                for (let i = 0; i < message.frames.length; ++i)
                    $root.purplesector.TelemetryFrame.encode(message.frames[i], writer.uint32(/* id 2, wireType 2 =*/18).fork()).ldelim();
            return writer;
        };

        /**
         * Encodes the specified LapData message, length delimited. Does not implicitly {@link purplesector.LapData.verify|verify} messages.
         * @function encodeDelimited
         * @memberof purplesector.LapData
         * @static
         * @param {purplesector.ILapData} message LapData message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        LapData.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a LapData message from the specified reader or buffer.
         * @function decode
         * @memberof purplesector.LapData
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {purplesector.LapData} LapData
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        LapData.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.purplesector.LapData();
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.lapNumber = reader.int32();
                        break;
                    }
                case 2: {
                        if (!(message.frames && message.frames.length))
                            message.frames = [];
                        message.frames.push($root.purplesector.TelemetryFrame.decode(reader, reader.uint32()));
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a LapData message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof purplesector.LapData
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {purplesector.LapData} LapData
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        LapData.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a LapData message.
         * @function verify
         * @memberof purplesector.LapData
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        LapData.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.lapNumber != null && message.hasOwnProperty("lapNumber"))
                if (!$util.isInteger(message.lapNumber))
                    return "lapNumber: integer expected";
            if (message.frames != null && message.hasOwnProperty("frames")) {
                if (!Array.isArray(message.frames))
                    return "frames: array expected";
                for (let i = 0; i < message.frames.length; ++i) {
                    let error = $root.purplesector.TelemetryFrame.verify(message.frames[i]);
                    if (error)
                        return "frames." + error;
                }
            }
            return null;
        };

        /**
         * Creates a LapData message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof purplesector.LapData
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {purplesector.LapData} LapData
         */
        LapData.fromObject = function fromObject(object) {
            if (object instanceof $root.purplesector.LapData)
                return object;
            let message = new $root.purplesector.LapData();
            if (object.lapNumber != null)
                message.lapNumber = object.lapNumber | 0;
            if (object.frames) {
                if (!Array.isArray(object.frames))
                    throw TypeError(".purplesector.LapData.frames: array expected");
                message.frames = [];
                for (let i = 0; i < object.frames.length; ++i) {
                    if (typeof object.frames[i] !== "object")
                        throw TypeError(".purplesector.LapData.frames: object expected");
                    message.frames[i] = $root.purplesector.TelemetryFrame.fromObject(object.frames[i]);
                }
            }
            return message;
        };

        /**
         * Creates a plain object from a LapData message. Also converts values to other types if specified.
         * @function toObject
         * @memberof purplesector.LapData
         * @static
         * @param {purplesector.LapData} message LapData
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        LapData.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.arrays || options.defaults)
                object.frames = [];
            if (options.defaults)
                object.lapNumber = 0;
            if (message.lapNumber != null && message.hasOwnProperty("lapNumber"))
                object.lapNumber = message.lapNumber;
            if (message.frames && message.frames.length) {
                object.frames = [];
                for (let j = 0; j < message.frames.length; ++j)
                    object.frames[j] = $root.purplesector.TelemetryFrame.toObject(message.frames[j], options);
            }
            return object;
        };

        /**
         * Converts this LapData to JSON.
         * @function toJSON
         * @memberof purplesector.LapData
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        LapData.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for LapData
         * @function getTypeUrl
         * @memberof purplesector.LapData
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        LapData.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/purplesector.LapData";
        };

        return LapData;
    })();

    return purplesector;
})();

export { $root as default };
