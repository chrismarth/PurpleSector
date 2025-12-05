import * as $protobuf from "protobufjs";
import Long = require("long");
/** Namespace purplesector. */
export namespace purplesector {

    /** Properties of a TelemetryFrame. */
    interface ITelemetryFrame {

        /** TelemetryFrame timestamp */
        timestamp?: (number|Long|null);

        /** TelemetryFrame speed */
        speed?: (number|null);

        /** TelemetryFrame throttle */
        throttle?: (number|null);

        /** TelemetryFrame brake */
        brake?: (number|null);

        /** TelemetryFrame steering */
        steering?: (number|null);

        /** TelemetryFrame gear */
        gear?: (number|null);

        /** TelemetryFrame rpm */
        rpm?: (number|null);

        /** TelemetryFrame normalizedPosition */
        normalizedPosition?: (number|null);

        /** TelemetryFrame lapNumber */
        lapNumber?: (number|null);

        /** TelemetryFrame lapTime */
        lapTime?: (number|null);

        /** TelemetryFrame sessionTime */
        sessionTime?: (number|null);

        /** TelemetryFrame sessionType */
        sessionType?: (number|null);

        /** TelemetryFrame trackPosition */
        trackPosition?: (number|null);

        /** TelemetryFrame delta */
        delta?: (number|null);
    }

    /** Represents a TelemetryFrame. */
    class TelemetryFrame implements ITelemetryFrame {

        /**
         * Constructs a new TelemetryFrame.
         * @param [properties] Properties to set
         */
        constructor(properties?: purplesector.ITelemetryFrame);

        /** TelemetryFrame timestamp. */
        public timestamp: (number|Long);

        /** TelemetryFrame speed. */
        public speed: number;

        /** TelemetryFrame throttle. */
        public throttle: number;

        /** TelemetryFrame brake. */
        public brake: number;

        /** TelemetryFrame steering. */
        public steering: number;

        /** TelemetryFrame gear. */
        public gear: number;

        /** TelemetryFrame rpm. */
        public rpm: number;

        /** TelemetryFrame normalizedPosition. */
        public normalizedPosition: number;

        /** TelemetryFrame lapNumber. */
        public lapNumber: number;

        /** TelemetryFrame lapTime. */
        public lapTime: number;

        /** TelemetryFrame sessionTime. */
        public sessionTime?: (number|null);

        /** TelemetryFrame sessionType. */
        public sessionType?: (number|null);

        /** TelemetryFrame trackPosition. */
        public trackPosition?: (number|null);

        /** TelemetryFrame delta. */
        public delta?: (number|null);

        /** TelemetryFrame _sessionTime. */
        public _sessionTime?: "sessionTime";

        /** TelemetryFrame _sessionType. */
        public _sessionType?: "sessionType";

        /** TelemetryFrame _trackPosition. */
        public _trackPosition?: "trackPosition";

        /** TelemetryFrame _delta. */
        public _delta?: "delta";

        /**
         * Creates a new TelemetryFrame instance using the specified properties.
         * @param [properties] Properties to set
         * @returns TelemetryFrame instance
         */
        public static create(properties?: purplesector.ITelemetryFrame): purplesector.TelemetryFrame;

        /**
         * Encodes the specified TelemetryFrame message. Does not implicitly {@link purplesector.TelemetryFrame.verify|verify} messages.
         * @param message TelemetryFrame message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: purplesector.ITelemetryFrame, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified TelemetryFrame message, length delimited. Does not implicitly {@link purplesector.TelemetryFrame.verify|verify} messages.
         * @param message TelemetryFrame message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: purplesector.ITelemetryFrame, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a TelemetryFrame message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns TelemetryFrame
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): purplesector.TelemetryFrame;

        /**
         * Decodes a TelemetryFrame message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns TelemetryFrame
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): purplesector.TelemetryFrame;

        /**
         * Verifies a TelemetryFrame message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a TelemetryFrame message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns TelemetryFrame
         */
        public static fromObject(object: { [k: string]: any }): purplesector.TelemetryFrame;

        /**
         * Creates a plain object from a TelemetryFrame message. Also converts values to other types if specified.
         * @param message TelemetryFrame
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: purplesector.TelemetryFrame, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this TelemetryFrame to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for TelemetryFrame
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a WebSocketMessage. */
    interface IWebSocketMessage {

        /** WebSocketMessage type */
        type?: (purplesector.WebSocketMessage.MessageType|null);

        /** WebSocketMessage telemetry */
        telemetry?: (purplesector.ITelemetryFrame|null);

        /** WebSocketMessage status */
        status?: (purplesector.IStatusMessage|null);
    }

    /** Represents a WebSocketMessage. */
    class WebSocketMessage implements IWebSocketMessage {

        /**
         * Constructs a new WebSocketMessage.
         * @param [properties] Properties to set
         */
        constructor(properties?: purplesector.IWebSocketMessage);

        /** WebSocketMessage type. */
        public type: purplesector.WebSocketMessage.MessageType;

        /** WebSocketMessage telemetry. */
        public telemetry?: (purplesector.ITelemetryFrame|null);

        /** WebSocketMessage status. */
        public status?: (purplesector.IStatusMessage|null);

        /** WebSocketMessage _telemetry. */
        public _telemetry?: "telemetry";

        /** WebSocketMessage _status. */
        public _status?: "status";

        /**
         * Creates a new WebSocketMessage instance using the specified properties.
         * @param [properties] Properties to set
         * @returns WebSocketMessage instance
         */
        public static create(properties?: purplesector.IWebSocketMessage): purplesector.WebSocketMessage;

        /**
         * Encodes the specified WebSocketMessage message. Does not implicitly {@link purplesector.WebSocketMessage.verify|verify} messages.
         * @param message WebSocketMessage message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: purplesector.IWebSocketMessage, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified WebSocketMessage message, length delimited. Does not implicitly {@link purplesector.WebSocketMessage.verify|verify} messages.
         * @param message WebSocketMessage message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: purplesector.IWebSocketMessage, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a WebSocketMessage message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns WebSocketMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): purplesector.WebSocketMessage;

        /**
         * Decodes a WebSocketMessage message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns WebSocketMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): purplesector.WebSocketMessage;

        /**
         * Verifies a WebSocketMessage message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a WebSocketMessage message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns WebSocketMessage
         */
        public static fromObject(object: { [k: string]: any }): purplesector.WebSocketMessage;

        /**
         * Creates a plain object from a WebSocketMessage message. Also converts values to other types if specified.
         * @param message WebSocketMessage
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: purplesector.WebSocketMessage, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this WebSocketMessage to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for WebSocketMessage
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    namespace WebSocketMessage {

        /** MessageType enum. */
        enum MessageType {
            UNKNOWN = 0,
            CONNECTED = 1,
            TELEMETRY = 2,
            START_DEMO = 3,
            STOP_DEMO = 4,
            DEMO_COMPLETE = 5,
            PING = 6,
            PONG = 7
        }
    }

    /** Properties of a StatusMessage. */
    interface IStatusMessage {

        /** StatusMessage message */
        message?: (string|null);

        /** StatusMessage timestamp */
        timestamp?: (number|Long|null);
    }

    /** Represents a StatusMessage. */
    class StatusMessage implements IStatusMessage {

        /**
         * Constructs a new StatusMessage.
         * @param [properties] Properties to set
         */
        constructor(properties?: purplesector.IStatusMessage);

        /** StatusMessage message. */
        public message: string;

        /** StatusMessage timestamp. */
        public timestamp: (number|Long);

        /**
         * Creates a new StatusMessage instance using the specified properties.
         * @param [properties] Properties to set
         * @returns StatusMessage instance
         */
        public static create(properties?: purplesector.IStatusMessage): purplesector.StatusMessage;

        /**
         * Encodes the specified StatusMessage message. Does not implicitly {@link purplesector.StatusMessage.verify|verify} messages.
         * @param message StatusMessage message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: purplesector.IStatusMessage, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified StatusMessage message, length delimited. Does not implicitly {@link purplesector.StatusMessage.verify|verify} messages.
         * @param message StatusMessage message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: purplesector.IStatusMessage, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a StatusMessage message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns StatusMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): purplesector.StatusMessage;

        /**
         * Decodes a StatusMessage message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns StatusMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): purplesector.StatusMessage;

        /**
         * Verifies a StatusMessage message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a StatusMessage message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns StatusMessage
         */
        public static fromObject(object: { [k: string]: any }): purplesector.StatusMessage;

        /**
         * Creates a plain object from a StatusMessage message. Also converts values to other types if specified.
         * @param message StatusMessage
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: purplesector.StatusMessage, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this StatusMessage to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for StatusMessage
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a DemoData. */
    interface IDemoData {

        /** DemoData laps */
        laps?: (purplesector.ILapData[]|null);
    }

    /** Represents a DemoData. */
    class DemoData implements IDemoData {

        /**
         * Constructs a new DemoData.
         * @param [properties] Properties to set
         */
        constructor(properties?: purplesector.IDemoData);

        /** DemoData laps. */
        public laps: purplesector.ILapData[];

        /**
         * Creates a new DemoData instance using the specified properties.
         * @param [properties] Properties to set
         * @returns DemoData instance
         */
        public static create(properties?: purplesector.IDemoData): purplesector.DemoData;

        /**
         * Encodes the specified DemoData message. Does not implicitly {@link purplesector.DemoData.verify|verify} messages.
         * @param message DemoData message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: purplesector.IDemoData, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified DemoData message, length delimited. Does not implicitly {@link purplesector.DemoData.verify|verify} messages.
         * @param message DemoData message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: purplesector.IDemoData, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a DemoData message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns DemoData
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): purplesector.DemoData;

        /**
         * Decodes a DemoData message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns DemoData
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): purplesector.DemoData;

        /**
         * Verifies a DemoData message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a DemoData message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns DemoData
         */
        public static fromObject(object: { [k: string]: any }): purplesector.DemoData;

        /**
         * Creates a plain object from a DemoData message. Also converts values to other types if specified.
         * @param message DemoData
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: purplesector.DemoData, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this DemoData to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for DemoData
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a LapData. */
    interface ILapData {

        /** LapData lapNumber */
        lapNumber?: (number|null);

        /** LapData frames */
        frames?: (purplesector.ITelemetryFrame[]|null);
    }

    /** Represents a LapData. */
    class LapData implements ILapData {

        /**
         * Constructs a new LapData.
         * @param [properties] Properties to set
         */
        constructor(properties?: purplesector.ILapData);

        /** LapData lapNumber. */
        public lapNumber: number;

        /** LapData frames. */
        public frames: purplesector.ITelemetryFrame[];

        /**
         * Creates a new LapData instance using the specified properties.
         * @param [properties] Properties to set
         * @returns LapData instance
         */
        public static create(properties?: purplesector.ILapData): purplesector.LapData;

        /**
         * Encodes the specified LapData message. Does not implicitly {@link purplesector.LapData.verify|verify} messages.
         * @param message LapData message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: purplesector.ILapData, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified LapData message, length delimited. Does not implicitly {@link purplesector.LapData.verify|verify} messages.
         * @param message LapData message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: purplesector.ILapData, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a LapData message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns LapData
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): purplesector.LapData;

        /**
         * Decodes a LapData message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns LapData
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): purplesector.LapData;

        /**
         * Verifies a LapData message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a LapData message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns LapData
         */
        public static fromObject(object: { [k: string]: any }): purplesector.LapData;

        /**
         * Creates a plain object from a LapData message. Also converts values to other types if specified.
         * @param message LapData
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: purplesector.LapData, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this LapData to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for LapData
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }
}
