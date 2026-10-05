# Model limits audit

Audited 2026-10-04 against model publishers' Hugging Face configs and model cards. General web discovery used the configured self-hosted Firecrawl MCP; no crawl was started. The capacities below describe upstream artifacts, not the context actually configured on the proxy's serving backend. The user requested upstream defaults, so this audit uses the matching publisher artifact rather than deployment settings. Short proxy aliases are matched by model family; exact quantization/build identity was not independently established.

## Meaning of the limits

The model's context covers both prompt and generated tokens. Upstream `max_position_embeddings`, `text_config.max_position_embeddings`, or `max_sequence_length` supplies a default architecture/config value. A model card can document a larger supported window requiring explicit serving options. This configuration update uses upstream defaults, not optional extended windows. It does not certify the actual serving backend's window.

At the start of the context audit, every catalog entry set `limit.output` to 8,192. The subsequent [output limits audit](model-output-limits-audit.md) records the selected per-model generation budgets. Treat these as client generation budgets, not verified model maxima. Self-hosted checkpoints often have no separate documented output ceiling beyond the remaining context and server settings. Examples or evaluation generation budgets are not hard maxima. For example, [GLM's card](https://huggingface.co/zai-org/GLM-4.7-Flash/blob/main/README.md) recommends 131,072 new tokens, and the [Qwen derivative's card](https://huggingface.co/llmfan46/Qwen3.6-35B-A3B-uncensored-heretic-Native-MTP-Preserved-GGUF/blob/main/README.md) includes an 81,920-token request example. Neither establishes 8,192 as an upstream maximum.

The separate [output limits audit](model-output-limits-audit.md) covers publisher generation defaults and recommended budgets for all 26 aliases.

## Catalog comparison

Each source link points to the publisher's config unless noted. The third column records values before this audit; the fourth column gives the upstream default requested for both V1 and V2. The fifth column records the exact JSON field read.

| Proxy model ID | Matching upstream artifact | Previous context | Upstream default | Config field | Notes |
| --- | --- | ---: | ---: | --- | --- |
| `eousphoros/kappa-20b-131k` | [eousphoros/kappa-20b-131k][kappa] | 131,072 | 131,072 | `max_position_embeddings` | Exact repository identifier; matches upstream. |
| `gemma-4-12b-it-qat` | [google/gemma-4-12B-it-qat-q4_0-unquantized][gemma12] | 56,000 | 262,144 | `text_config.max_position_embeddings` | Previous value was below the upstream default. |
| `gemma-4-26b-a4b-it-qat` | [google/gemma-4-26B-A4B-it-qat-q4_0-unquantized][gemma26] | 56,000 | 262,144 | `text_config.max_position_embeddings` | Previous value was below the upstream default. |
| `gemma-4-31b-it-qat` | [google/gemma-4-31B-it-qat-q4_0-unquantized][gemma31] | 56,000 | 262,144 | `text_config.max_position_embeddings` | Previous value was below the upstream default. |
| `gemma-4-e2b-it-qat` | [google/gemma-4-E2B-it-qat-q4_0-unquantized][gemmae2] | 49,152 | 131,072 | `text_config.max_position_embeddings` | Previous value was below the upstream default. |
| `gemma-4-e4b-it-qat` | [google/gemma-4-E4B-it-qat-q4_0-unquantized][gemmae4] | 49,152 | 131,072 | `text_config.max_position_embeddings` | Previous value was below the upstream default. |
| `glm-4.7-flash` | [zai-org/GLM-4.7-Flash][glm] | 56,000 | 202,752 | `max_position_embeddings` | Previous value was below the upstream default. |
| `glm-4.7-flash-reap` | [cerebras/GLM-4.7-Flash-REAP-23B-A3B][reap] | 56,000 | 202,752 | `max_position_embeddings` | REAP-23B default; short alias does not identify the pruning variant. |
| `gpt-oss-120b` | [openai/gpt-oss-120b][oss120] | 262,144 | 131,072 | `max_position_embeddings` | Existing value exceeds upstream default; does not match the default. |
| `gpt-oss-20b` | [openai/gpt-oss-20b][oss20] | 131,072 | 131,072 | `max_position_embeddings` | Matches upstream default. |
| `hermes-4.3-36b` | [NousResearch/Hermes-4.3-36B][hermes] | 131,072 | 524,288 | `max_position_embeddings` | Previous value was below the upstream default. |
| `kappa-20b-131k` | [eousphoros/kappa-20b-131k][kappa] | 131,072 | 131,072 | `max_position_embeddings` | Alias mapping inferred; displayed `123K` name is inconsistent. |
| `llmfan46/Qwen3.6-35B-A3B-uncensored-heretic-Native-MTP-Preserved-GGUF` | [Exact GGUF model card][hereticcard] and [its declared base checkpoint][heretic] | 262,144 | 262,144 | `text_config.max_position_embeddings` | GGUF card declares this base checkpoint; optional extension is separate. |
| `muse-glimmer-30b` | [meta-models/Muse-Glimmer-30B][muse] | 131,072 | 131,072 | `text_config.max_position_embeddings` | Matches upstream default. |
| `nemotron-3-nano-omni-30b-a3b-reasoning` | [nvidia/Nemotron-3-Nano-Omni-30B-A3B-Reasoning-BF16 config][omni] and [card][omnicard] | 1,000,000 | 131,072 | `max_sequence_length` | Card advertises 256K; default is 131,072. Previous 1M exceeded both. |
| `nemotron-3-super-120b-a12b` | [nvidia/NVIDIA-Nemotron-3-Super-120B-A12B-BF16 config][super] and [card][supercard] | 1,000,000 | 262,144 | `max_position_embeddings` | 1,048,576 is an explicitly enabled extension, not this default. |
| `nemotron-3.5-lightning` | [nvidia/NVIDIA-Nemotron-3.5-Lightning-30B-A3B-BF16 config][lightning] and [card][lightningcard] | 1,000,000 | 262,144 | `max_position_embeddings` | 1,048,576 is an explicitly enabled extension, not this default. |
| `nouscoder-14b` | [NousResearch/NousCoder-14B][nouscoder] | 81,920 | 81,920 | `max_position_embeddings` | Unusual value is confirmed by this model's config. |
| `nvidia-nemotron-3-nano-omni-30b-a3b-reasoning` | [Same Nano Omni config][omni] and [card][omnicard] | 1,000,000 | 131,072 | `max_sequence_length` | Card advertises 256K; default is 131,072. Previous 1M exceeded both. |
| `ornith-1.0-35b` | [ornith-ai/Ornith-1.0-35B][ornith] | 131,072 | 262,144 | `text_config.max_position_embeddings` | Previous value was below the upstream default. |
| `qwen3-coder-next` | [Qwen/Qwen3-Coder-Next][qwenNext] | 262,144 | 262,144 | `max_position_embeddings` | Matches upstream default. |
| `qwen3.5-122b-a10b` | [Qwen/Qwen3.5-122B-A10B][qwen35] | 262,144 | 262,144 | `text_config.max_position_embeddings` | Matches upstream default. |
| `qwen3.6-27b` | [Qwen/Qwen3.6-27B][qwen3627] | 262,144 | 262,144 | `text_config.max_position_embeddings` | Matches upstream default. |
| `qwen3.6-35b-a3b` | [Qwen/Qwen3.6-35B-A3B][qwen3635] | 262,144 | 262,144 | `text_config.max_position_embeddings` | Matches upstream default. |
| `qwen3.8-27b` | [Qwen/Qwen3.8-27B][qwen38] | 262,144 | 262,144 | `text_config.max_position_embeddings` | Matches upstream default. |
| `unsloth/nvidia-nemotron-3-super-120b-a12b` | [unsloth/NVIDIA-Nemotron-3-Super-120B-A12B config][unslothSuper] and [NVIDIA source card][supercard] | 1,000,000 | 262,144 | `max_position_embeddings` | 1,048,576 is an explicitly enabled extension, not this default. |

## Defaults versus optional extensions

- GPT-OSS 120B defaults to 131,072, matching GPT-OSS 20B. Its previous 262,144 value was not the upstream default.
- Nano Omni's [NVFP4 config](https://huggingface.co/nvidia/Nemotron-3-Nano-Omni-30B-A3B-Reasoning-NVFP4/resolve/main/config.json) and [FP8 config](https://huggingface.co/nvidia/Nemotron-3-Nano-Omni-30B-A3B-Reasoning-FP8/resolve/main/config.json) also use `max_sequence_length: 131072`. Its card advertises up to 256K but uses 131,072 in serving examples; neither is one million.
- Super and Lightning default to 262,144. Their linked NVIDIA cards document optional 1,048,576-token serving configurations with explicit overrides; those advertised maxima are not the requested defaults.
- The Qwen derivative's card documents 262,144 natively and optional 1,010,000-token YaRN extension. Its GGUF repository has no `config.json`; the table uses its declared base checkpoint's config.
- Output budgets now follow the selection recorded in the output audit, with a 32,768 fallback where no applicable guidance was established. These values are client budgets; no independently documented hard output maximum was established for these self-hosted checkpoints. Context includes both input and output.

No model weights were downloaded and no long-context inference load was performed. This audit checks upstream defaults rather than deployment limits.

[kappa]: https://huggingface.co/eousphoros/kappa-20b-131k/resolve/main/config.json
[gemma12]: https://huggingface.co/google/gemma-4-12B-it-qat-q4_0-unquantized/resolve/main/config.json
[gemma26]: https://huggingface.co/google/gemma-4-26B-A4B-it-qat-q4_0-unquantized/resolve/main/config.json
[gemma31]: https://huggingface.co/google/gemma-4-31B-it-qat-q4_0-unquantized/resolve/main/config.json
[gemmae2]: https://huggingface.co/google/gemma-4-E2B-it-qat-q4_0-unquantized/resolve/main/config.json
[gemmae4]: https://huggingface.co/google/gemma-4-E4B-it-qat-q4_0-unquantized/resolve/main/config.json
[glm]: https://huggingface.co/zai-org/GLM-4.7-Flash/resolve/main/config.json
[reap]: https://huggingface.co/cerebras/GLM-4.7-Flash-REAP-23B-A3B/resolve/main/config.json
[oss120]: https://huggingface.co/openai/gpt-oss-120b/resolve/main/config.json
[oss20]: https://huggingface.co/openai/gpt-oss-20b/resolve/main/config.json
[hermes]: https://huggingface.co/NousResearch/Hermes-4.3-36B/resolve/main/config.json
[heretic]: https://huggingface.co/llmfan46/Qwen3.6-35B-A3B-uncensored-heretic-Native-MTP-Preserved/resolve/main/config.json
[hereticcard]: https://huggingface.co/llmfan46/Qwen3.6-35B-A3B-uncensored-heretic-Native-MTP-Preserved-GGUF/blob/main/README.md
[muse]: https://huggingface.co/meta-models/Muse-Glimmer-30B/resolve/main/config.json
[omni]: https://huggingface.co/nvidia/Nemotron-3-Nano-Omni-30B-A3B-Reasoning-BF16/resolve/main/config.json
[omnicard]: https://huggingface.co/nvidia/Nemotron-3-Nano-Omni-30B-A3B-Reasoning-BF16/blob/main/README.md
[super]: https://huggingface.co/nvidia/NVIDIA-Nemotron-3-Super-120B-A12B-BF16/resolve/main/config.json
[supercard]: https://huggingface.co/nvidia/NVIDIA-Nemotron-3-Super-120B-A12B-BF16/blob/main/README.md
[lightning]: https://huggingface.co/nvidia/NVIDIA-Nemotron-3.5-Lightning-30B-A3B-BF16/resolve/main/config.json
[lightningcard]: https://huggingface.co/nvidia/NVIDIA-Nemotron-3.5-Lightning-30B-A3B-BF16/blob/main/README.md
[nouscoder]: https://huggingface.co/NousResearch/NousCoder-14B/resolve/main/config.json
[ornith]: https://huggingface.co/ornith-ai/Ornith-1.0-35B/resolve/main/config.json
[qwenNext]: https://huggingface.co/Qwen/Qwen3-Coder-Next/resolve/main/config.json
[qwen35]: https://huggingface.co/Qwen/Qwen3.5-122B-A10B/resolve/main/config.json
[qwen3627]: https://huggingface.co/Qwen/Qwen3.6-27B/resolve/main/config.json
[qwen3635]: https://huggingface.co/Qwen/Qwen3.6-35B-A3B/resolve/main/config.json
[qwen38]: https://huggingface.co/Qwen/Qwen3.8-27B/resolve/main/config.json
[unslothSuper]: https://huggingface.co/unsloth/NVIDIA-Nemotron-3-Super-120B-A12B/resolve/main/config.json
