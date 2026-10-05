# Model output limits audit

Audited 2026-10-05 against publisher `config.json`, `generation_config.json`, and model cards for every alias in the 26-model catalog. General web discovery and official documentation scraping used the configured self-hosted Firecrawl MCP; no crawl or hosted fallback was used. Short aliases are matched to the same upstream artifacts as the context audit; the exact backend build/quantization is not established. Deployment settings were outside the requested scope.

## Findings and classification

No separate architectural hard output maximum was established for any of the 26 aliases from these sources. The initial configuration used an **8,192** client output budget for every alias. The user has now selected publisher recommendations and the coding examples identified below for the output-budget policy. Entries without applicable guidance now use a user-selected **32,768** fallback to give reasoning and longer code responses more room. This fallback is a configuration policy, not a publisher recommendation. These configured budgets are not sourced hard model maxima.

There are four different quantities:

- **Hard output maximum:** a separately specified model/service ceiling. None established for these exact local checkpoint families; hosted API service limits cannot be transferred to a local checkpoint.
- **Serialized generation default:** explicit `max_new_tokens` or `max_length` in a checkpoint's generation config. Only Nano Omni and Muse provide relevant fields here, with important qualifications below.
- **Recommended budget:** publisher guidance for a use case. Qwen3.5/3.6 recommends 32,768 for typical queries; this is not a checkpoint default or ceiling.
- **Example/evaluation budget:** request parameters chosen for an example or benchmark, such as 256, 65,536, or 131,072. These do not establish a model's maximum.

[Transformers documentation](https://huggingface.co/docs/transformers/en/main_classes/text_generation) defines `max_new_tokens` as generated tokens excluding the prompt. Its [v4.57.1 generation configuration source](https://github.com/huggingface/transformers/blob/v4.57.1/src/transformers/generation/configuration_utils.py) distinguishes `max_length`, which includes prompt length for decoder-only models. Omitted length fields do not imply a model-specific 20-token cap: older framework fallback values are defaults of the software, not architectural ceilings. Likewise, [vLLM's `SamplingParams`](https://docs.vllm.ai/en/latest/api/vllm/sampling_params/#vllm.sampling_params.SamplingParams.max_tokens) has a software default of 16 generated tokens; this is not a checkpoint output maximum.

The prompt, reasoning, final answer, and formatting/control tokens still occupy the model's total context. A maximum permitted continuation depends on remaining context, even when no smaller independent output cap is defined.

## All 26 aliases

The hard output maximum is **not independently established for every row**. Each row links the inspected model config, generation config (or repository file list when absent), and publisher card. “Length fields omitted” means the file contains neither `max_new_tokens` nor `max_length` nor a separate output maximum. The model configs also contain no separately named output cap.

| Alias | Configured output budget | Serialized generation length default | Publisher recommendations or examples (classification) | Primary sources |
| --- | ---: | --- | --- | --- |
| `eousphoros/kappa-20b-131k` | 32,768 | Present; length fields omitted | 4,096 request example | [config][kappa-config] · [generation][kappa-gen] · [card][kappa-card] |
| `gemma-4-12b-it-qat` | 32,768 | Present; length fields omitted | 512 / 1,024 examples | [config][gemma12-config] · [generation][gemma12-gen] · [card][gemma12-card] |
| `gemma-4-26b-a4b-it-qat` | 32,768 | Present; length fields omitted | 512 / 1,024 examples | [config][gemma26-config] · [generation][gemma26-gen] · [card][gemma26-card] |
| `gemma-4-31b-it-qat` | 32,768 | Present; length fields omitted | 512 / 1,024 examples | [config][gemma31-config] · [generation][gemma31-gen] · [card][gemma31-card] |
| `gemma-4-e2b-it-qat` | 32,768 | Present; length fields omitted | 512 / 1,024 examples | [config][gemmae2-config] · [generation][gemmae2-gen] · [card][gemmae2-card] |
| `gemma-4-e4b-it-qat` | 32,768 | Present; length fields omitted | 512 / 1,024 examples | [config][gemmae4-config] · [generation][gemmae4-gen] · [card][gemmae4-card] |
| `glm-4.7-flash` | 131,072 | Present; length fields omitted | 131,072 general recommendation; 16,384 benchmark budgets; 128 example | [config][glm-config] · [generation][glm-gen] · [card][glm-card] |
| `glm-4.7-flash-reap` | 32,768 | Absent (HTTP 404) | No separate budget found in REAP-23B card; do not transfer GLM hosted API limits | [config][reap-config] · [generation][reap-gen] · [card][reap-card] |
| `gpt-oss-120b` | 32,768 | Present; length fields omitted | 256 example | [config][oss120-config] · [generation][oss120-gen] · [card][oss120-card] |
| `gpt-oss-20b` | 32,768 | Present; length fields omitted | 256 example | [config][oss20-config] · [generation][oss20-gen] · [card][oss20-card] |
| `hermes-4.3-36b` | 32,768 | Absent (HTTP 404) | 400 example | [config][hermes-config] · [generation][hermes-gen] · [card][hermes-card] |
| `kappa-20b-131k` | 32,768 | Present; length fields omitted | 4,096 request example | [config][kappa-config] · [generation][kappa-gen] · [card][kappa-card] |
| `llmfan46/Qwen3.6-35B-A3B-uncensored-heretic-Native-MTP-Preserved-GGUF` | 32,768 | GGUF file absent; base present without length fields | 32,768 general recommendation; 81,920 complex benchmark recommendation | [config][heretic-config] · [generation][heretic-gen] · [card][heretic-card] |
| `muse-glimmer-30b` | 32,768 | `max_length: 131072` | Total sequence limit includes prompt; not an output-only cap | [config][muse-config] · [generation][muse-gen] · [card][muse-card] |
| `nemotron-3-nano-omni-30b-a3b-reasoning` | 20,480 | `max_new_tokens: 16384`; `reasoning_budget: 16384`; `reasoning_grace: 512` | 20,480 recommended minimum for reasoning; card grace 1,024; 210,000 complex-task recommendation | [config][omni-config] · [generation][omni-gen] · [card][omni-card] |
| `nemotron-3-super-120b-a12b` | 32,768 | Present; length fields omitted | 32,768 OpenCode configuration example; 16,000 / 50 request examples | [config][super-config] · [generation][super-gen] · [card][super-card] |
| `nemotron-3.5-lightning` | 32,768 | Present; length fields omitted | 16,000 request examples | [config][lightning-config] · [generation][lightning-gen] · [card][lightning-card] |
| `nouscoder-14b` | 32,768 | Present; length fields omitted | No separate output budget found in card | [config][nouscoder-config] · [generation][nouscoder-gen] · [card][nouscoder-card] |
| `nvidia-nemotron-3-nano-omni-30b-a3b-reasoning` | 20,480 | `max_new_tokens: 16384`; `reasoning_budget: 16384`; `reasoning_grace: 512` | 20,480 recommended minimum for reasoning; card grace 1,024; 210,000 complex-task recommendation | [config][omni-config] · [generation][omni-gen] · [card][omni-card] |
| `ornith-1.0-35b` | 32,768 | Present; length fields omitted | 131,072 evaluation budget; 512 / 1,024 / 2,048 examples | [config][ornith-config] · [generation][ornith-gen] · [card][ornith-card] |
| `qwen3-coder-next` | 65,536 | Present; length fields omitted | 65,536 request examples | [config][qwenNext-config] · [generation][qwenNext-gen] · [card][qwenNext-card] |
| `qwen3.5-122b-a10b` | 32,768 | Present; length fields omitted | 32,768 general recommendation; 81,920 complex benchmark recommendation | [config][qwen35-config] · [generation][qwen35-gen] · [card][qwen35-card] |
| `qwen3.6-27b` | 32,768 | Present; length fields omitted | 32,768 general recommendation; 81,920 complex benchmark recommendation | [config][qwen3627-config] · [generation][qwen3627-gen] · [card][qwen3627-card] |
| `qwen3.6-35b-a3b` | 32,768 | Present; length fields omitted | 32,768 general recommendation; 81,920 complex benchmark recommendation | [config][qwen3635-config] · [generation][qwen3635-gen] · [card][qwen3635-card] |
| `qwen3.8-27b` | 32,768 | Present; length fields omitted | Conditional recommendation: reasoning 262,144 + final 131,072 with separate caps and 1M context; 32,768 evaluation budget | [config][qwen38-config] · [generation][qwen38-gen] · [card][qwen38-card] |
| `unsloth/nvidia-nemotron-3-super-120b-a12b` | 32,768 | Present; length fields omitted | 32,768 OpenCode configuration example; 16,000 / 50 request examples | [config][unslothSuper-config] · [generation][unslothSuper-gen] · [card][unslothSuper-card] |

## Reasoning and output share the generation budget

Nano Omni's [generation config][omni-gen] says `max_new_tokens=16384`, `reasoning_budget=16384`, and `reasoning_grace=512`. The [card][omni-card] instead recommends at least **20,480 total output tokens**, **16,384 reasoning tokens**, and **1,024 grace tokens** for thinking mode. Its budget-controlled wrapper subtracts consumed reasoning tokens from `max_tokens` before requesting the final answer. Therefore, copying the serialized 16,384 generation default into a shared client limit can leave no room for the answer if the model consumes its full reasoning allowance. The different grace values are also explicit; do not silently treat the two recipes as identical. The card's 210,000 complex-task recommendation exceeds the current 131,072 context default and is unsuitable as an automatic replacement.

The [Super card][super-card] uses the same accounting: `remaining_tokens = max_tokens - reasoning_tokens_len`. Its 32,768-token OpenCode example is a useful application policy example, not a generation default or independently established hard model ceiling. Its `reasoning_budget` setting controls the trace and does not create a separate free pool for the final answer.

Qwen3.5/3.6 cards' normal API examples generate `<think>...</think>` and the answer within a single completion and split them afterward. Thus a single request `max_tokens` or `max_new_tokens` includes both. [Ornith's card][ornith-card] demonstrates this explicitly in its Transformers example. Qwen3-Coder-Next is non-thinking according to its [card][qwenNext-card].

[Qwen3.8's card][qwen38-card] differs: it recommends up to 262,144 reasoning tokens and 131,072 final-answer tokens **only for frameworks that expose separate limits, within a 1M context**. This is conditional guidance rather than a shared output maximum. Those allowances sum to 393,216, exceeding the configured 262,144 default context before any prompt; do not combine or copy them into the existing single output limit.

## Selected output budgets

| Family | Selected budget | Source and selection rationale |
| --- | ---: | --- |
| Qwen3.5 122B; Qwen3.6 27B/35B; heretic Qwen3.6 GGUF | 32,768 | Explicit general recommendation; generation files omit length default and no separate ceiling is established. Complex benchmarks recommend 81,920. |
| Nano Omni, both aliases | 20,480 | Recommended minimum for thinking, accounting for reasoning and answer. Serialized 16,384 differs and is unsuitable to copy blindly. |
| Nemotron Super, both aliases | 32,768 | Exact publisher OpenCode example uses `limit.output`; still an application budget, not a maximum. |
| GLM-4.7-Flash | 131,072 | Publisher general guidance, with 16,384 used for specified benchmarks; no serialized length default. The REAP card does not establish the same recommendation independently. |
| Qwen3-Coder-Next | 65,536 | Example request budget; no independent maximum or serialized default. |
| Qwen3.8 27B | 32,768 fallback | Separate reasoning/final recommendations assume 1M context and appropriate framework support. |
| Remaining aliases | 32,768 fallback | No standalone default or maximum appropriate for automatic replacement was established. |

Applied to both V2 and the separate V1 backport: 10 aliases use the selected publisher budgets above, and 16 use the 32,768 fallback. Super and Coder Next use selected application examples; their numbers are not general recommendations or hard maxima. Qwen3.8 retains the fallback because its separate-budget recommendation assumes a larger context and different framework support. Combined prompt and generated tokens must fit within the chosen context. No model weights were downloaded or long-output inference tests run.

## OpenCode runtime ceilings

The selected client budgets must also pass the client's own request preparation:

- [V2.0.20 request preparation](https://github.com/anomalyco/opencode/blob/v2.0.20/packages/core/src/session/model-request.ts) uses each model's positive `limit.output` for primary requests, capped at 256,000. Summaries are capped at 32,000. It reduces requested output when the measured and estimated input leave less context room. Every selected budget is below the primary ceiling and below its model's configured context.
- [V1.18.3 provider transformation](https://github.com/anomalyco/opencode/blob/v1.18.3/packages/opencode/src/provider/transform.ts) defaults to a 32,000-token request ceiling. Its [request preparation](https://github.com/anomalyco/opencode/blob/v1.18.3/packages/opencode/src/session/llm/request.ts) passes the runtime override to this calculation. Export `OPENCODE_EXPERIMENTAL_OUTPUT_TOKEN_MAX=131072` in the environment launching V1 to permit all the selected per-model budgets. The [runtime flag definition](https://github.com/anomalyco/opencode/blob/v1.18.3/packages/opencode/src/effect/runtime-flags.ts) accepts a positive integer. The V1 README documents the export; this does not require changing the V2 launcher.

These are version-specific client ceilings, independent of model architecture. The configured budgets cover generated reasoning plus final-answer tokens. They do not promise that every response uses the entire allowance.

For the exact heretic GGUF artifact, `generation_config.json` returned HTTP 404; its [repository files](https://huggingface.co/llmfan46/Qwen3.6-35B-A3B-uncensored-heretic-Native-MTP-Preserved-GGUF/tree/main) and card identify the base checkpoint inspected in the table. Recommendations copied into that derivative's card remain recommendations, not independently established GGUF output ceilings.

[kappa-config]: https://huggingface.co/eousphoros/kappa-20b-131k/resolve/main/config.json
[kappa-gen]: https://huggingface.co/eousphoros/kappa-20b-131k/resolve/main/generation_config.json
[kappa-card]: https://huggingface.co/eousphoros/kappa-20b-131k/blob/main/README.md
[gemma12-config]: https://huggingface.co/google/gemma-4-12B-it-qat-q4_0-unquantized/resolve/main/config.json
[gemma12-gen]: https://huggingface.co/google/gemma-4-12B-it-qat-q4_0-unquantized/resolve/main/generation_config.json
[gemma12-card]: https://huggingface.co/google/gemma-4-12B-it-qat-q4_0-unquantized/blob/main/README.md
[gemma26-config]: https://huggingface.co/google/gemma-4-26B-A4B-it-qat-q4_0-unquantized/resolve/main/config.json
[gemma26-gen]: https://huggingface.co/google/gemma-4-26B-A4B-it-qat-q4_0-unquantized/resolve/main/generation_config.json
[gemma26-card]: https://huggingface.co/google/gemma-4-26B-A4B-it-qat-q4_0-unquantized/blob/main/README.md
[gemma31-config]: https://huggingface.co/google/gemma-4-31B-it-qat-q4_0-unquantized/resolve/main/config.json
[gemma31-gen]: https://huggingface.co/google/gemma-4-31B-it-qat-q4_0-unquantized/resolve/main/generation_config.json
[gemma31-card]: https://huggingface.co/google/gemma-4-31B-it-qat-q4_0-unquantized/blob/main/README.md
[gemmae2-config]: https://huggingface.co/google/gemma-4-E2B-it-qat-q4_0-unquantized/resolve/main/config.json
[gemmae2-gen]: https://huggingface.co/google/gemma-4-E2B-it-qat-q4_0-unquantized/resolve/main/generation_config.json
[gemmae2-card]: https://huggingface.co/google/gemma-4-E2B-it-qat-q4_0-unquantized/blob/main/README.md
[gemmae4-config]: https://huggingface.co/google/gemma-4-E4B-it-qat-q4_0-unquantized/resolve/main/config.json
[gemmae4-gen]: https://huggingface.co/google/gemma-4-E4B-it-qat-q4_0-unquantized/resolve/main/generation_config.json
[gemmae4-card]: https://huggingface.co/google/gemma-4-E4B-it-qat-q4_0-unquantized/blob/main/README.md
[glm-config]: https://huggingface.co/zai-org/GLM-4.7-Flash/resolve/main/config.json
[glm-gen]: https://huggingface.co/zai-org/GLM-4.7-Flash/resolve/main/generation_config.json
[glm-card]: https://huggingface.co/zai-org/GLM-4.7-Flash/blob/main/README.md
[reap-config]: https://huggingface.co/cerebras/GLM-4.7-Flash-REAP-23B-A3B/resolve/main/config.json
[reap-gen]: https://huggingface.co/cerebras/GLM-4.7-Flash-REAP-23B-A3B/tree/main
[reap-card]: https://huggingface.co/cerebras/GLM-4.7-Flash-REAP-23B-A3B/blob/main/README.md
[oss120-config]: https://huggingface.co/openai/gpt-oss-120b/resolve/main/config.json
[oss120-gen]: https://huggingface.co/openai/gpt-oss-120b/resolve/main/generation_config.json
[oss120-card]: https://huggingface.co/openai/gpt-oss-120b/blob/main/README.md
[oss20-config]: https://huggingface.co/openai/gpt-oss-20b/resolve/main/config.json
[oss20-gen]: https://huggingface.co/openai/gpt-oss-20b/resolve/main/generation_config.json
[oss20-card]: https://huggingface.co/openai/gpt-oss-20b/blob/main/README.md
[hermes-config]: https://huggingface.co/NousResearch/Hermes-4.3-36B/resolve/main/config.json
[hermes-gen]: https://huggingface.co/NousResearch/Hermes-4.3-36B/tree/main
[hermes-card]: https://huggingface.co/NousResearch/Hermes-4.3-36B/blob/main/README.md
[heretic-config]: https://huggingface.co/llmfan46/Qwen3.6-35B-A3B-uncensored-heretic-Native-MTP-Preserved/resolve/main/config.json
[heretic-gen]: https://huggingface.co/llmfan46/Qwen3.6-35B-A3B-uncensored-heretic-Native-MTP-Preserved/resolve/main/generation_config.json
[heretic-card]: https://huggingface.co/llmfan46/Qwen3.6-35B-A3B-uncensored-heretic-Native-MTP-Preserved-GGUF/blob/main/README.md
[muse-config]: https://huggingface.co/meta-models/Muse-Glimmer-30B/resolve/main/config.json
[muse-gen]: https://huggingface.co/meta-models/Muse-Glimmer-30B/resolve/main/generation_config.json
[muse-card]: https://huggingface.co/meta-models/Muse-Glimmer-30B/blob/main/README.md
[omni-config]: https://huggingface.co/nvidia/Nemotron-3-Nano-Omni-30B-A3B-Reasoning-BF16/resolve/main/config.json
[omni-gen]: https://huggingface.co/nvidia/Nemotron-3-Nano-Omni-30B-A3B-Reasoning-BF16/resolve/main/generation_config.json
[omni-card]: https://huggingface.co/nvidia/Nemotron-3-Nano-Omni-30B-A3B-Reasoning-BF16/blob/main/README.md
[super-config]: https://huggingface.co/nvidia/NVIDIA-Nemotron-3-Super-120B-A12B-BF16/resolve/main/config.json
[super-gen]: https://huggingface.co/nvidia/NVIDIA-Nemotron-3-Super-120B-A12B-BF16/resolve/main/generation_config.json
[super-card]: https://huggingface.co/nvidia/NVIDIA-Nemotron-3-Super-120B-A12B-BF16/blob/main/README.md
[lightning-config]: https://huggingface.co/nvidia/NVIDIA-Nemotron-3.5-Lightning-30B-A3B-BF16/resolve/main/config.json
[lightning-gen]: https://huggingface.co/nvidia/NVIDIA-Nemotron-3.5-Lightning-30B-A3B-BF16/resolve/main/generation_config.json
[lightning-card]: https://huggingface.co/nvidia/NVIDIA-Nemotron-3.5-Lightning-30B-A3B-BF16/blob/main/README.md
[nouscoder-config]: https://huggingface.co/NousResearch/NousCoder-14B/resolve/main/config.json
[nouscoder-gen]: https://huggingface.co/NousResearch/NousCoder-14B/resolve/main/generation_config.json
[nouscoder-card]: https://huggingface.co/NousResearch/NousCoder-14B/blob/main/README.md
[ornith-config]: https://huggingface.co/ornith-ai/Ornith-1.0-35B/resolve/main/config.json
[ornith-gen]: https://huggingface.co/ornith-ai/Ornith-1.0-35B/resolve/main/generation_config.json
[ornith-card]: https://huggingface.co/ornith-ai/Ornith-1.0-35B/blob/main/README.md
[qwenNext-config]: https://huggingface.co/Qwen/Qwen3-Coder-Next/resolve/main/config.json
[qwenNext-gen]: https://huggingface.co/Qwen/Qwen3-Coder-Next/resolve/main/generation_config.json
[qwenNext-card]: https://huggingface.co/Qwen/Qwen3-Coder-Next/blob/main/README.md
[qwen35-config]: https://huggingface.co/Qwen/Qwen3.5-122B-A10B/resolve/main/config.json
[qwen35-gen]: https://huggingface.co/Qwen/Qwen3.5-122B-A10B/resolve/main/generation_config.json
[qwen35-card]: https://huggingface.co/Qwen/Qwen3.5-122B-A10B/blob/main/README.md
[qwen3627-config]: https://huggingface.co/Qwen/Qwen3.6-27B/resolve/main/config.json
[qwen3627-gen]: https://huggingface.co/Qwen/Qwen3.6-27B/resolve/main/generation_config.json
[qwen3627-card]: https://huggingface.co/Qwen/Qwen3.6-27B/blob/main/README.md
[qwen3635-config]: https://huggingface.co/Qwen/Qwen3.6-35B-A3B/resolve/main/config.json
[qwen3635-gen]: https://huggingface.co/Qwen/Qwen3.6-35B-A3B/resolve/main/generation_config.json
[qwen3635-card]: https://huggingface.co/Qwen/Qwen3.6-35B-A3B/blob/main/README.md
[qwen38-config]: https://huggingface.co/Qwen/Qwen3.8-27B/resolve/main/config.json
[qwen38-gen]: https://huggingface.co/Qwen/Qwen3.8-27B/resolve/main/generation_config.json
[qwen38-card]: https://huggingface.co/Qwen/Qwen3.8-27B/blob/main/README.md
[unslothSuper-config]: https://huggingface.co/unsloth/NVIDIA-Nemotron-3-Super-120B-A12B/resolve/main/config.json
[unslothSuper-gen]: https://huggingface.co/unsloth/NVIDIA-Nemotron-3-Super-120B-A12B/resolve/main/generation_config.json
[unslothSuper-card]: https://huggingface.co/unsloth/NVIDIA-Nemotron-3-Super-120B-A12B/blob/main/README.md
