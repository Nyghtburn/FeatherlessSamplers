# Featherless Samplers

A SillyTavern third-party extension that exposes vLLM sampler sliders
(min_p, repetition_penalty, guided decoding, etc.) for the Featherless.ai
Chat Completions API, which SillyTavern's built-in "Custom (OpenAI-compatible)"
source does not surface as UI controls.

## How it works

The sliders write their values into `oai_settings.custom_include_body` (YAML)
and the exclude list into `oai_settings.custom_exclude_body`. SillyTavern merges
the include body into every Chat Completion request after its fixed parameters,
and removes excluded keys last.

## Install

Copy this folder into:

    public/scripts/extensions/third-party/FeatherlessSamplers/

Then hard-refresh SillyTavern and enable the extension in the Extensions panel.

## Usage

1. API: Chat Completion → Source: Custom (OpenAI-compatible)
2. Endpoint: `https://api.featherless.ai/v1`
3. Move sliders in the wand-menu panel → Apply to Connection → generate.
