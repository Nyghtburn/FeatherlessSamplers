// Featherless Samplers — vLLM sampler sliders for Featherless.ai Chat Completions.
// Copyright (C) 2026 Ravenholme Technologies Inc.

// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.
import { saveSettingsDebounced } from '../../../../script.js';
import { oai_settings } from '../../../openai.js';
import { extension_settings } from '../../../extensions.js';

const SAMPLERS = [
    // numbers (always sent; defaults are neutral)
    { key: 'min_p', label: 'Min P', kind: 'number', min: 0, max: 1, step: 0.01, def: 0, hint: '0 disables' },
    { key: 'repetition_penalty', label: 'Repetition Penalty', kind: 'number', min: 0, max: 3, step: 0.01, def: 1, hint: '1 disables' },
    { key: 'length_penalty', label: 'Length Penalty', kind: 'number', min: 0, max: 4, step: 0.01, def: 1 },
    { key: 'typical_p', label: 'Typical P', kind: 'number', min: 0, max: 1, step: 0.01, def: 1, hint: 'remove row if unsupported' },
    { key: 'top_a', label: 'Top A', kind: 'number', min: 0, max: 1, step: 0.01, def: 0, hint: 'remove row if unsupported' },
    { key: 'min_tokens', label: 'Min Tokens', kind: 'number', min: 0, max: 500, step: 1, def: 0 },
    { key: 'best_of', label: 'Best Of (beam only)', kind: 'number', min: 1, max: 32, step: 1, def: 1 },

    // booleans (always sent)
    { key: 'use_beam_search', label: 'Use Beam Search', kind: 'boolean', def: false },
    { key: 'early_stopping', label: 'Early Stopping (beam only)', kind: 'boolean', def: false },
    { key: 'ignore_eos', label: 'Ignore EOS', kind: 'boolean', def: false },
    { key: 'skip_special_tokens', label: 'Skip Special Tokens', kind: 'boolean', def: true },
    { key: 'spaces_between_special_tokens', label: 'Spaces Between Special Tokens', kind: 'boolean', def: true },
    { key: 'include_stop_str_in_output', label: 'Include Stop String In Output', kind: 'boolean', def: false },

    // integer lists (sent only when non-empty)
    { key: 'stop_token_ids', label: 'Stop Token IDs (comma list)', kind: 'list', def: '' },
    { key: 'truncate_prompt_tokens', label: 'Truncate Prompt Tokens (comma list)', kind: 'list', def: '' },

    // guided decoding (sent only when non-empty)
    { key: 'guided_decoding_backend', label: 'Guided Decoding Backend', kind: 'text', def: '' },
    { key: 'guided_json', label: 'Guided JSON', kind: 'text', def: '' },
    { key: 'guided_regex', label: 'Guided Regex', kind: 'text', def: '' },
    { key: 'guided_choice', label: 'Guided Choice (comma list)', kind: 'choice', def: '' },
    { key: 'guided_grammar', label: 'Guided Grammar', kind: 'text', def: '' },
    { key: 'guided_whitespace_pattern', label: 'Guided Whitespace Pattern', kind: 'text', def: '' },
];

function managedKeys() {
    return new Set(SAMPLERS.map(s => s.key));
}

function guessKey(line) {
    const m = /^\s*([A-Za-z0-9_-]+)\s*:/.exec(line);
    return m ? m[1] : '';
}

function serialize(s, raw) {
    if (s.kind === 'number') return String(raw);
    if (s.kind === 'boolean') return raw ? 'true' : 'false';
    if (s.kind === 'list') {
        const items = String(raw).split(',')
            .map(x => x.trim()).filter(Boolean)
            .map(Number).filter(n => !Number.isNaN(n));
        return `[${items.join(', ')}]`;
    }
    if (s.kind === 'choice') {
        const items = String(raw).split(',')
            .map(x => x.trim()).filter(Boolean);
        return `[${items.map(x => JSON.stringify(x)).join(', ')}]`;
    }
    return JSON.stringify(String(raw));
}

function getCfg() {
    extension_settings.featherlessSamplers ??= {};
    const c = extension_settings.featherlessSamplers;
    c.values ??= {};
    for (const s of SAMPLERS) {
        if (c.values[s.key] === undefined) c.values[s.key] = s.def;
    }
    c.exclude ??= 'max_completion_tokens';
    return c;
}

function regenerateYaml() {
    const cfg = getCfg();
    const out = [];
    const owned = managedKeys();

    for (const line of String(oai_settings.custom_include_body ?? '').split('\n')) {
        if (line.trim() && !owned.has(guessKey(line))) {
            out.push(line);
        }
    }

    for (const s of SAMPLERS) {
        const raw = cfg.values[s.key];
        if (s.kind === 'text' || s.kind === 'list' || s.kind === 'choice') {
            if (!String(raw ?? '').trim()) continue;
        }
        out.push(`${s.key}: ${serialize(s, raw)}`);
    }

    oai_settings.custom_include_body = out.join('\n');
}

function regenerateExclude() {
    const keys = String(getCfg().exclude ?? '')
        .split(',').map(x => x.trim()).filter(Boolean);
    oai_settings.custom_exclude_body = keys.map(k => `- ${k}`).join('\n');
}

function regenerateAll() {
    regenerateYaml();
    regenerateExclude();
    saveSettingsDebounced();
    updatePreview();
}

function buildPanel() {
    const panel = $(`
    <div id="featherless_samplers_panel" style="position:fixed;top:8%;right:2%;z-index:9000;width:380px;max-height:82%;overflow:auto;background:#1b1b24;border:1px solid #4a4a5a;border-radius:12px;padding:16px;display:none;box-shadow:0 10px 40px #000a;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
            <h3 style="margin:0;">Featherless Samplers</h3>
            <button id="fsamplers_close" class="fa-solid fa-xmark menu_button" title="Close"></button>
        </div>
        <div id="fsamplers_controls"></div>
        <h4>Exclude body parameters (comma list)</h4>
        <input id="fsamplers_exclude" type="text" style="width:100%;">
        <pre id="fsamplers_preview" style="white-space:pre-wrap;background:#101018;padding:8px;border-radius:6px;font-size:11px;margin-top:10px;"></pre>
        <button id="fsamplers_apply" class="menu_button" style="width:100%;margin-top:8px;">Apply to Connection</button>
    </div>`);
    $('body').append(panel);

    $('#featherless_samplers_close').on('click', () => panel.hide());

    $('#featherless_samplers_exclude').on('input', function () {
        getCfg().exclude = String($(this).val() ?? '');
        regenerateAll();
    });

    $('#featherless_samplers_apply').on('click', () => {
        regenerateAll();
        toastr.info('Samplers applied; sent on the next generation.');
    });

    $('#featherless_samplers_button').on('click', () => {
        const cfg = getCfg();
        $('#featherless_samplers_exclude').val(cfg.exclude);
        renderControls(cfg);
        updatePreview();
        panel.toggle();
    });
}

function renderControls(cfg) {
    const container = $('#featherless_samplers_controls').empty();

    for (const s of SAMPLERS) {
        const row = $('<div style="margin-bottom:10px;"></div>');
        row.append($(`<small style="display:block;opacity:.75;">${s.label}${s.hint ? ` — ${s.hint}` : ''}</small>`));

        const current = cfg.values[s.key];

        if (s.kind === 'number') {
            const display = $('<span style="float:right;"></span>').text(current);
            const slider = $('<input type="range" style="width:100%;">')
                .attr({ min: s.min, max: s.max, step: s.step })
                .val(current);
            slider.on('input', () => {
                cfg.values[s.key] = Number(slider.val());
                display.text(slider.val());
                regenerateAll();
            });
            row.append(slider, display);
        } else if (s.kind === 'boolean') {
            const box = $('<input type="checkbox">').prop('checked', !!current);
            box.on('input', () => {
                cfg.values[s.key] = box.prop('checked');
                regenerateAll();
            });
            row.append(box);
        } else if (s.kind === 'text') {
            const input = $('<textarea rows="2" style="width:100%;">').val(current || '');
            input.on('input', () => {
                cfg.values[s.key] = String(input.val() ?? '').trim();
                regenerateAll();
            });
            row.append(input);
        } else {
            const input = $('<input type="text" style="width:100%;">').val(current || '');
            input.on('input', () => {
                cfg.values[s.key] = String(input.val() ?? '').trim();
                regenerateAll();
            });
            row.append(input);
        }

        container.append(row);
    }
}

function updatePreview() {
    $('#featherless_samplers_preview').text(
        `# include body\n${oai_settings.custom_include_body || '(empty)'}\n\n# exclude body\n${oai_settings.custom_exclude_body || '(empty)'}`,
    );
}

function addMenuButton() {
    const button = $(`
        <div id="featherless_samplers_button" class="list-group-item flex-container flexGap5" style="cursor:pointer;">
            <div class="fa-solid fa-sliders extensionsMenuExtensionButton"></div>
            <span>Featherless Samplers</span>
        </div>`);
    $('#extensionsMenu').append(button);
}

function waitForMenu(retries = 10) {
    if ($('#extensionsMenu').length) {
        addMenuButton();
        buildPanel();
    } else if (retries > 0) {
        setTimeout(() => waitForMenu(retries - 1), 500);
    } else {
        console.warn('[FeatherlessSamplers] Could not find #extensionsMenu');
    }
}

export function init() {
    // Warm settings, but do NOT rewrite custom_include_body here:
    // loadOpenAISettings() may still run after extension activation.
    getCfg();
    waitForMenu();
}
