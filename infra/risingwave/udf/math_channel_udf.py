"""
PurpleSector Math Channel UDF Server for RisingWave.

Evaluates user-defined math channel expressions using simpleeval,
which supports the same arithmetic and function syntax as mathjs.

Deploy as a sidecar to RisingWave or as a standalone K8s deployment.

Usage:
    pip install -r requirements.txt
    python math_channel_udf.py
"""

import json
import math
from typing import Optional

from risingwave.udf import udf, UdfServer
from simpleeval import simple_eval, DEFAULT_FUNCTIONS

# Extend simpleeval with mathjs-compatible functions
MATH_FUNCTIONS = {
    **DEFAULT_FUNCTIONS,
    "abs": abs,
    "sqrt": math.sqrt,
    "pow": pow,
    "sin": math.sin,
    "cos": math.cos,
    "tan": math.tan,
    "asin": math.asin,
    "acos": math.acos,
    "atan": math.atan,
    "atan2": math.atan2,
    "log": math.log,
    "log10": math.log10,
    "log2": math.log2,
    "ceil": math.ceil,
    "floor": math.floor,
    "round": round,
    "min": min,
    "max": max,
    "exp": math.exp,
}

# Constants available in expressions
MATH_NAMES = {
    "pi": math.pi,
    "e": math.e,
    "true": True,
    "false": False,
}

# Standard telemetry channel names in order, matching the ARRAY passed from SQL
CHANNEL_ORDER = [
    "speed",
    "throttle",
    "brake",
    "steering",
    "gear",
    "rpm",
    "normalized_position",
    "lap_number",
    "lap_time",
]


@udf(input_types=["VARCHAR", "VARCHAR", "FLOAT8[]"], result_type="FLOAT8")
def eval_math_channel(
    expression: str, input_json: str, values: list[float]
) -> Optional[float]:
    """
    Evaluate a math channel expression against telemetry values.

    Args:
        expression: mathjs-compatible expression (e.g., "brake / (throttle + brake) * 100")
        input_json: JSON array of {"channelId": "...", "alias": "..."} mappings.
                    If empty/null, uses standard CHANNEL_ORDER mapping.
        values: Array of float values corresponding to the input channels.

    Returns:
        Computed float value, or None on error.
    """
    try:
        # Build the scope (variable name -> value mapping)
        if input_json and input_json.strip():
            inputs = json.loads(input_json)
            scope = {inp["alias"]: val for inp, val in zip(inputs, values)}
        else:
            # Default: map standard channel names to values
            scope = {
                name: val
                for name, val in zip(CHANNEL_ORDER, values)
                if val is not None
            }

        # Merge in math constants
        scope.update(MATH_NAMES)

        result = simple_eval(expression, names=scope, functions=MATH_FUNCTIONS)
        return float(result)
    except Exception:
        return None


if __name__ == "__main__":
    server = UdfServer(location="0.0.0.0:8815")
    server.add_function(eval_math_channel)
    print("Math Channel UDF server starting on :8815")
    server.serve()
