#!/usr/bin/env bash
# Operator-runnable script to re-export the LLMLingua-2 model from
# PyTorch into ONNX and quantize it to int8.
#
# NOT exercised in CI. Requires Python with `optimum`, `onnxruntime`,
# and `transformers` installed. Output goes to ./onnx-out/.
#
# Documented for completeness; v0.1 consumers should rely on the
# pre-exported `atjsh/llmlingua-2-js-xlm-roberta-large-meetingbank`
# Hub repo unless they have a custom checkpoint.
set -euo pipefail

MODEL_ID="${1:-microsoft/llmlingua-2-xlm-roberta-large-meetingbank}"
OUT_DIR="${2:-./onnx-out}"

echo "==> Exporting $MODEL_ID to ONNX in $OUT_DIR"
optimum-cli export onnx \
  --model "$MODEL_ID" \
  --task token-classification \
  "$OUT_DIR"

echo "==> Quantizing fp32 -> int8"
python - <<PY
from onnxruntime.quantization import quantize_dynamic, QuantType
from pathlib import Path

src = Path("$OUT_DIR") / "model.onnx"
dst = Path("$OUT_DIR") / "model_quantized.onnx"
quantize_dynamic(str(src), str(dst), weight_type=QuantType.QInt8)
print(f"Wrote {dst}")
PY

echo "==> Done. To use locally:"
echo "    new LLMLingua2Wrapper({"
echo "      modelId: '$OUT_DIR',"
echo "      transformersOptions: { local_files_only: true }"
echo "    })"
