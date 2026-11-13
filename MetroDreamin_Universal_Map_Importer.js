// ==UserScript==
// @name         MetroDreamin' — Universal Map Importer (GeoJSON / KML / GPX)
// @name:ru      MetroDreamin' — Универсальный импорт карт (GeoJSON / KML / GPX)
// @namespace    https://metrodreamin.com/
// @version      3.0.2
// @description  Import transit lines, stations, waypoints, and interchanges from GeoJSON, KML, or GPX files (Google My Maps, QGIS, uMap, OpenStreetMap, Yandex Maps, etc.) into MetroDreamin'.
// @description:ru Импорт линий, станций, путевых точек (Waypoints) и пересадок из GeoJSON, KML или GPX (Google My Maps, QGIS, uMap, OpenStreetMap, Яндекс Карты и др.) в MetroDreamin'.
// @author       Community Contributors
// @license      MIT
// @match        https://metrodreamin.com/*
// @run-at       document-idle
// @grant        unsafeWindow
// ==/UserScript==

(function () {
    'use strict';

    const pageWin = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
    const AUTO_IMPORT_KEY = '__MD_UNIVERSAL_AUTO_LIVE_IMPORT__';
    const LANG_STORAGE_KEY = '__MD_IMPORTER_LANG__';
    const SCRIPT_VERSION = '3.0.2';

    // =========================================================================
    // PART 0. LOCALIZATION (EN default + optional RU)
    // =========================================================================
    const I18N = {
        en: {
            headerBtn: '📥 Import Map',
            modalTitle: `📥 Import Map to MetroDreamin' (v${SCRIPT_VERSION})`,
            langToggleTitle: 'Switch language (EN / RU)',
            introDesc: 'Supports <b>.geojson / .json</b>, <b>.kml</b>, and <b>.gpx</b> from any GIS or map editor (Google My Maps, QGIS, uMap, OpenStreetMap, Yandex Maps, etc.).',
            fileLabel: 'Choose a file (.geojson, .json, .kml, .gpx):',
            modeLabel: 'Transit Mode:',
            modeAuto: 'Auto (detect from tags/name, default Rapid)',
            modeRapid: 'Metro / Subway (RAPID)',
            modeTram: 'Tram / Streetcar (TRAM)',
            modeLight: 'Light Rail (LIGHT)',
            modeBrt: 'Bus Rapid Transit (BRT)',
            modeBus: 'Bus (BUS)',
            modeCommuter: 'Commuter Rail (COMMUTER)',
            modeGondola: 'Gondola / Cable Car (GONDOLA)',
            modeFerry: 'Ferry (FERRY)',
            vertexModeLabel: 'LineString Vertices:',
            vertexAuto: 'Auto (Points = Stations, bends = Waypoints)',
            vertexWaypoints: 'All bends = Waypoints (endpoints = Stations)',
            vertexStations: 'All line vertices = Stations',
            snapLabel: 'Snap (m):',
            vreplaceLabel: 'Vertex (m):',
            mergeLabel: 'Merge (m):',
            interchangeLabel: 'Interchange (m):',
            orphansLabel: 'Points far from lines:',
            orphansRemove: 'Remove (recommended for saving)',
            orphansLine: 'Group into a separate line',
            slotLabel: 'Map slot (systemNumStr):',
            slotPlaceholder: 'Auto (0, 1, 2...)',
            slotBumpTitle: 'Increment map slot number by +1',
            slotBumpBtn: '+1 slot',
            mergeModeLabel: 'Import Behavior:',
            mergeReplace: 'Replace current lines and stations',
            mergeAppend: 'Append to existing map',
            btnDebug: '🐞 Debug Log',
            btnDebugTitle: 'Download internal diagnostics log (JSON)',
            btnJson: '💾 Export JSON',
            btnReload: '🔄 Reload & Import',
            btnReloadTitle: 'Reload page and auto-apply Live Import once editor & map finish loading',
            btnLive: '⚡ Live Import (React)',
            errNoFile: 'Please select a file (.geojson, .kml, or .gpx) first!',
            errInvalidXml: 'Failed to parse XML file. Make sure the KML/GPX file is valid.',
            errInvalidGeoJson: 'Failed to parse GeoJSON file. Make sure it is valid JSON.',
            errNoReactRoot: 'React root fiber not found. Please wait for the editor to finish loading.',
            errNoMetaHook: 'Meta state hook not found in React Fiber.',
            statusSlotBumped: (slot) => `✅ Map slot (systemNumStr) incremented to ${slot}. You can now click Save!`,
            statusParsed: (lines, stations, waypoints, interchanges, orphans) =>
                `File processed:\n` +
                `• Lines: ${lines}\n` +
                `• Stations on lines: ${stations}\n` +
                `• Waypoints: ${waypoints}\n` +
                `• Interchanges: ${interchanges}\n` +
                `• Filtered unattached points: ${orphans}`,
            statusLiveDone: (count, hooks, slot) =>
                `✅ Live Import complete (v${SCRIPT_VERSION})!\n` +
                `• React states updated: ${count} (${hooks.join(', ')})\n` +
                `• Map slot (systemNumStr): ${slot ?? 'auto'}\n` +
                `Close this dialog and click the Save icon (Save changes).`,
            statusLiveErr: (msg) => `❌ Live Import error: ${msg}`,
            statusReloading: '🔄 Reloading page and applying Live Import once the editor loads...',
            statusErr: (msg) => `❌ Error: ${msg}`,
            defaultStation: 'Station',
            defaultStationN: (id) => `Station ${id}`,
            defaultLineN: (n) => `Line ${n}`,
            defaultStartSuffix: 'Start',
            defaultEndSuffix: 'End',
            defaultStation1Suffix: 'Station 1',
            defaultStation2Suffix: 'Station 2',
            defaultImportedLine: 'Imported Stations',
            defaultOrphanLine: 'Unassigned Stations'
        },
        ru: {
            headerBtn: '📥 Импорт карты',
            modalTitle: `📥 Импорт карты в MetroDreamin' (v${SCRIPT_VERSION})`,
            langToggleTitle: 'Переключить язык (EN / RU)',
            introDesc: 'Поддерживаются <b>.geojson / .json</b>, <b>.kml</b> и <b>.gpx</b> из любых картографических редакторов (Google My Maps, QGIS, uMap, OpenStreetMap, Яндекс Карты и др.).',
            fileLabel: 'Выберите файл (.geojson, .json, .kml, .gpx):',
            modeLabel: 'Вид транспорта (Mode):',
            modeAuto: 'Авто (по тегам / названию, иначе Метро)',
            modeRapid: 'Метро (RAPID)',
            modeTram: 'Трамвай (TRAM)',
            modeLight: 'ЛРТ / Скоростной трамвай (LIGHT)',
            modeBrt: 'Скоростной автобус (BRT)',
            modeBus: 'Автобус (BUS)',
            modeCommuter: 'Городская электричка (COMMUTER)',
            modeGondola: 'Канатная дорога (GONDOLA)',
            modeFerry: 'Паром / Речной трамвай (FERRY)',
            vertexModeLabel: 'Вершины линий (LineString):',
            vertexAuto: 'Авто (Точки = станции, изгибы = Waypoints)',
            vertexWaypoints: 'Все изгибы = Waypoints (концы = Станции)',
            vertexStations: 'Все вершины линий = Станции',
            snapLabel: 'Привязка (м):',
            vreplaceLabel: 'Вершина (м):',
            mergeLabel: 'Слияние (м):',
            interchangeLabel: 'Пересадки (м):',
            orphansLabel: 'Точки вдали от линий:',
            orphansRemove: 'Удалить (рекомендуется для сохранения)',
            orphansLine: 'Собрать в отдельную линию',
            slotLabel: 'Слот карты (systemNumStr):',
            slotPlaceholder: 'Авто (0, 1, 2...)',
            slotBumpTitle: 'Увеличить номер слота на +1',
            slotBumpBtn: '+1 слот',
            mergeModeLabel: 'Режим добавления:',
            mergeReplace: 'Заменить текущие линии и станции',
            mergeAppend: 'Добавить к существующим на карте',
            btnDebug: '🐞 Лог отладки',
            btnDebugTitle: 'Скачать внутренний журнал отладки (JSON)',
            btnJson: '💾 JSON схемы',
            btnReload: '🔄 С перезагрузкой',
            btnReloadTitle: 'Перезагрузить страницу и автоматически выполнить Live-импорт после загрузки редактора',
            btnLive: '⚡ Live-импорт (React)',
            errNoFile: 'Сначала выберите файл (.geojson, .kml или .gpx)!',
            errInvalidXml: 'Не удалось прочитать XML. Убедитесь, что файл KML/GPX корректен.',
            errInvalidGeoJson: 'Не удалось прочитать GeoJSON. Убедитесь, что это корректный JSON.',
            errNoReactRoot: 'Не найден корневой React Fiber. Дождитесь полной загрузки редактора.',
            errNoMetaHook: 'Не найден хук meta в React Fiber.',
            statusSlotBumped: (slot) => `✅ Номер слота карты (systemNumStr) увеличен до ${slot}. Теперь можно нажимать Save!`,
            statusParsed: (lines, stations, waypoints, interchanges, orphans) =>
                `Файл обработан:\n` +
                `• Линий: ${lines}\n` +
                `• Станций на линиях: ${stations}\n` +
                `• Путевых точек (Waypoints): ${waypoints}\n` +
                `• Пешеходных пересадок (Interchanges): ${interchanges}\n` +
                `• Отсеяно непривязанных точек: ${orphans}`,
            statusLiveDone: (count, hooks, slot) =>
                `✅ Live-импорт выполнен (v${SCRIPT_VERSION})!\n` +
                `• Обновлено стейтов React: ${count} (${hooks.join(', ')})\n` +
                `• Слот карты (systemNumStr): ${slot ?? 'авто'}\n` +
                `Теперь закройте окно и нажмите иконку дискеты (Save changes).`,
            statusLiveErr: (msg) => `❌ Ошибка Live-импорта: ${msg}`,
            statusReloading: '🔄 Перезагружаем страницу и автоматически применяем Live-импорт после загрузки редактора...',
            statusErr: (msg) => `❌ Ошибка: ${msg}`,
            defaultStation: 'Станция',
            defaultStationN: (id) => `Станция ${id}`,
            defaultLineN: (n) => `Линия ${n}`,
            defaultStartSuffix: 'Начало',
            defaultEndSuffix: 'Конец',
            defaultStation1Suffix: 'Станция 1',
            defaultStation2Suffix: 'Станция 2',
            defaultImportedLine: 'Импортированные станции',
            defaultOrphanLine: 'Непривязанные станции'
        }
    };

    let currentLang = 'en';
    try {
        const savedLang = localStorage.getItem(LANG_STORAGE_KEY);
        if (savedLang === 'en' || savedLang === 'ru') {
            currentLang = savedLang;
        }
    } catch (e) {}

    function t(key, ...args) {
        const dict = I18N[currentLang] || I18N.en;
        const val = dict[key] !== undefined ? dict[key] : I18N.en[key];
        return typeof val === 'function' ? val(...args) : val;
    }

    // =========================================================================
    // PART 1. LIGHTWEIGHT IN-MEMORY DIAGNOSTICS LOGGER & BLOB HELPER
    // =========================================================================
    const debugHistory = [];

    function safeCloneForLog(data) {
        if (data === null || data === undefined) return null;
        try {
            const seen = new WeakSet();
            return JSON.parse(JSON.stringify(data, (k, v) => {
                if (typeof v === 'function') return `[Function: ${v.name || 'anonymous'}]`;
                if (typeof v === 'object' && v !== null) {
                    if (seen.has(v)) return '[Circular]';
                    seen.add(v);
                }
                return v;
            }));
        } catch (e) {
            return String(data);
        }
    }

    function mdLog(stage, message, data = null) {
        const entry = {
            time: new Date().toISOString(),
            readyState: document.readyState,
            stage,
            message,
            data: safeCloneForLog(data)
        };
        debugHistory.push(entry);
        if (debugHistory.length > 250) debugHistory.shift();
        console.debug(`[MD-Importer | ${stage}]`, message, data !== null ? data : '');
    }

    function downloadJsonBlob(dataObj, filename) {
        const blob = new Blob([JSON.stringify(dataObj, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        setTimeout(() => {
            try { URL.revokeObjectURL(url); } catch (e) {}
        }, 10000);
    }

    function downloadDebugLog() {
        downloadJsonBlob(debugHistory, `md-importer-log-${Date.now()}.json`);
    }

    // =========================================================================
    // PART 2. GEOMETRY, UNIVERSAL COLORS & PARSERS (GeoJSON, KML, GPX)
    // =========================================================================
    function haversineM(lat1, lng1, lat2, lng2) {
        const R = 6371000;
        const toRad = d => (d * Math.PI) / 180;
        const dLat = toRad(lat2 - lat1);
        const dLng = toRad(lng2 - lng1);
        const a =
            Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
        return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    // Fast latitude + high-latitude-aware longitude bounding box check before Haversine
    function isWithinDegBox(lat1, lng1, lat2, lng2, latDegMargin) {
        if (Math.abs(lat1 - lat2) > latDegMargin) return false;
        const cosLat = Math.max(0.05, Math.cos(((lat1 + lat2) * 0.5 * Math.PI) / 180));
        return Math.abs(lng1 - lng2) <= latDegMargin / cosLat;
    }

    function pointToSegmentProjection(plat, plng, alat, alng, blat, blng) {
        const cosLat = Math.max(0.05, Math.cos((plat * Math.PI) / 180));
        const px = plng * cosLat, py = plat;
        const ax = alng * cosLat, ay = alat;
        const bx = blng * cosLat, by = blat;
        const dx = bx - ax, dy = by - ay;
        const lenSq = dx * dx + dy * dy;
        if (lenSq === 0) {
            return { t: 0, lat: alat, lng: alng, dist: haversineM(plat, plng, alat, alng) };
        }
        let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
        t = Math.max(0, Math.min(1, t));
        const projLng = alng + t * (blng - alng);
        const projLat = alat + t * (blat - alat);
        return {
            t,
            lat: projLat,
            lng: projLng,
            dist: haversineM(plat, plng, projLat, projLng)
        };
    }

    function cleanText(str) {
        if (!str) return '';
        const s = String(str);
        // Fast path: skip DOMParser if string has no HTML tags or entities
        if (!/[&<>]/.test(s)) {
            return s.replace(/\s+/g, ' ').trim();
        }
        try {
            const doc = new DOMParser().parseFromString(s, 'text/html');
            return (doc.body.textContent || '').replace(/\s+/g, ' ').trim();
        } catch (e) {
            return s.replace(/\s+/g, ' ').trim();
        }
    }

    function isValidLatLng(lat, lng) {
        return Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
    }

    const NAMED_COLORS = {
        darkorange: '#e6761b',
        darkgreen: '#1bad03',
        lightblue: '#82cdff',
        lightgray: '#d3d3d3',
        lightgrey: '#d3d3d3',
        darkblue: '#177bc9',
        darkgray: '#666666',
        darkgrey: '#666666',
        darkred: '#8b0000',
        crimson: '#dc143c',
        magenta: '#ff00ff',
        indigo: '#4b0082',
        purple: '#800080',
        violet: '#b51eff',
        orange: '#ff931e',
        yellow: '#ffd21e',
        maroon: '#800000',
        coral: '#ff7f50',
        green: '#56db40',
        olive: '#97a100',
        brown: '#793d0e',
        night: '#0e4779',
        black: '#333333',
        white: '#ffffff',
        blue: '#1e98ff',
        pink: '#f371d1',
        cyan: '#00bcd4',
        teal: '#008080',
        lime: '#32cd32',
        navy: '#000080',
        gold: '#ffd700',
        gray: '#999999',
        grey: '#999999',
        red: '#ed4543'
    };

    // Pre-sorted longest-first so compound names ('darkblue', 'lightblue') match before root names ('blue')
    const SORTED_NAMED_COLOR_ENTRIES = Object.entries(NAMED_COLORS).sort((a, b) => b[0].length - a[0].length);

    const FALLBACK_PALETTE = [
        '#e6194b', '#3cb44b', '#ffe119', '#4363d8', '#f58231',
        '#911eb4', '#42d4f4', '#f032e6', '#bfef45', '#fabebe',
        '#469990', '#e6beff', '#9a6324', '#800000', '#000075'
    ];

    function normalizeGeoColor(c, fallbackIdx = 0) {
        if (!c) return FALLBACK_PALETTE[fallbackIdx % FALLBACK_PALETTE.length];
        const raw = String(c).trim();
        if (/^#[0-9a-fA-F]{6}$/.test(raw)) return raw.toLowerCase();
        if (/^#[0-9a-fA-F]{8}$/.test(raw)) return raw.slice(0, 7).toLowerCase();
        if (/^[0-9a-fA-F]{6}$/.test(raw)) return ('#' + raw).toLowerCase();
        if (/^#[0-9a-fA-F]{3}$/.test(raw)) {
            return ('#' + raw[1] + raw[1] + raw[2] + raw[2] + raw[3] + raw[3]).toLowerCase();
        }
        const rgbMatch = raw.match(/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/i);
        if (rgbMatch) {
            const toHex = n => Math.max(0, Math.min(255, parseInt(n, 10))).toString(16).padStart(2, '0');
            return `#${toHex(rgbMatch[1])}${toHex(rgbMatch[2])}${toHex(rgbMatch[3])}`;
        }
        const lower = raw.toLowerCase().replace(/[\s_-]+/g, '');
        if (NAMED_COLORS[lower]) return NAMED_COLORS[lower];

        // Match token or camelCase preset (e.g. "islands#darkBlueIcon" or "twirl#redIcon")
        for (const [key, hex] of SORTED_NAMED_COLOR_ENTRIES) {
            const tokenRegex = new RegExp(`(?:^|#|[^a-z])${key}(?:$|icon|circle|dot|line|marker|[^a-z])`, 'i');
            if (tokenRegex.test(raw)) return hex;
        }
        for (const [key, hex] of SORTED_NAMED_COLOR_ENTRIES) {
            if (lower.includes(key)) return hex;
        }
        return FALLBACK_PALETTE[fallbackIdx % FALLBACK_PALETTE.length];
    }

    function normalizeKmlColor(c, fallbackIdx = 0) {
        if (!c) return FALLBACK_PALETTE[fallbackIdx % FALLBACK_PALETTE.length];
        const clean = String(c).trim().replace(/^#/, '');
        if (/^[0-9a-fA-F]{8}$/.test(clean)) {
            const bb = clean.slice(2, 4);
            const gg = clean.slice(4, 6);
            const rr = clean.slice(6, 8);
            return `#${rr}${gg}${bb}`.toLowerCase();
        }
        return normalizeGeoColor(c, fallbackIdx);
    }

    function detectTransitMode(name, modeHint, defaultMode) {
        if (defaultMode !== 'AUTO') return defaultMode;
        const combined = `${modeHint || ''} ${name || ''}`.toLowerCase();

        // 1. Gondola / Cable Car / Funicular
        if (/\b(gondola|cable_car|cableway|aerialway|funicular)\b/.test(combined) || /(канат|фуникул)/.test(combined)) {
            return 'GONDOLA';
        }
        // 2. Ferry / Water Transit
        if (/\b(ferry|boat|water_bus|river_tram)\b/.test(combined) || /(паром|речн|аквабус)/.test(combined)) {
            return 'FERRY';
        }
        // 3. Light Rail / LRT / Premetro (checked before regular Tram)
        if (
            /\b(light_rail|lrt|stadtbahn|premetro)\b/.test(combined) ||
            combined.includes('light rail') ||
            /(?:^|[^а-яёa-z0-9])(лрт|скоростной\s+трам|метротрам)(?:$|[^а-яёa-z0-9])/.test(combined)
        ) {
            return 'LIGHT';
        }
        // 4. Bus Rapid Transit (BRT) specifically (checked before regular Bus)
        if (
            /\b(brt|busway|metrobus)\b/.test(combined) ||
            combined.includes('bus rapid') ||
            combined.includes('metrobús') ||
            /(?:^|[^а-яёa-z0-9])(ск[оа]ростной\s+автобус|метробус|брт)(?:$|[^а-яёa-z0-9])/.test(combined)
        ) {
            return 'BRT';
        }
        // 5. Regular Bus / Trolleybus (checked BEFORE Tram so 'trolleybus' is never misclassified as 'trolley')
        if (
            /\b(bus|trolleybus|coach|minibus|autobus|omnibus)\b/.test(combined) ||
            /(троллейб|автобус|электробус|маршрутк)/.test(combined)
        ) {
            return 'BUS';
        }
        // 6. Tram / Streetcar
        if (
            /\b(tram|tramway|streetcar|trolley|strassenbahn)\b/.test(combined) ||
            combined.includes('straßenbahn') ||
            /трамв/.test(combined)
        ) {
            return 'TRAM';
        }
        // 7. Commuter / Regional / Suburban Rail (word-bounded Cyrillic so 'жд' never matches inside 'Надежды' or 'Гражданский')
        if (
            /\b(commuter|suburban|rail|railway|train|regional|s-bahn|sbahn|rer|overground|intercity)\b/.test(combined) ||
            /(?:^|[^а-яёa-z0-9])(ж\/д|жд|мцд|мцк|электричк\w*|электропоезд\w*|диаметр\w*|пригородн\w*)(?:$|[^а-яёa-z0-9])/.test(combined)
        ) {
            return 'COMMUTER';
        }
        return 'RAPID';
    }

    // Greedily stitches MultiLineString segments whose endpoints meet within maxGapM
    function stitchLineSegments(segments, maxGapM = 120) {
        const remaining = segments
            .filter(s => Array.isArray(s) && s.length >= 2)
            .map(s => s.slice());
        if (remaining.length <= 1) return remaining;

        const chains = [];
        while (remaining.length > 0) {
            let chain = remaining.shift();
            let merged = true;
            while (merged && remaining.length > 0) {
                merged = false;
                const head = chain[0];
                const tail = chain[chain.length - 1];
                let bestIdx = -1;
                let bestDist = maxGapM;
                let mode = '';

                for (let i = 0; i < remaining.length; i++) {
                    const seg = remaining[i];
                    const sHead = seg[0];
                    const sTail = seg[seg.length - 1];

                    const dTailHead = haversineM(tail[0], tail[1], sHead[0], sHead[1]);
                    if (dTailHead <= bestDist) { bestDist = dTailHead; bestIdx = i; mode = 'append'; }

                    const dTailTail = haversineM(tail[0], tail[1], sTail[0], sTail[1]);
                    if (dTailTail <= bestDist) { bestDist = dTailTail; bestIdx = i; mode = 'append_rev'; }

                    const dHeadTail = haversineM(head[0], head[1], sTail[0], sTail[1]);
                    if (dHeadTail <= bestDist) { bestDist = dHeadTail; bestIdx = i; mode = 'prepend'; }

                    const dHeadHead = haversineM(head[0], head[1], sHead[0], sHead[1]);
                    if (dHeadHead <= bestDist) { bestDist = dHeadHead; bestIdx = i; mode = 'prepend_rev'; }
                }

                if (bestIdx !== -1) {
                    const chosen = remaining.splice(bestIdx, 1)[0];
                    if (mode === 'append') {
                        chain = chain.concat(bestDist < 1 ? chosen.slice(1) : chosen);
                    } else if (mode === 'append_rev') {
                        const rev = chosen.slice().reverse();
                        chain = chain.concat(bestDist < 1 ? rev.slice(1) : rev);
                    } else if (mode === 'prepend') {
                        chain = (bestDist < 1 ? chosen.slice(0, -1) : chosen).concat(chain);
                    } else if (mode === 'prepend_rev') {
                        const rev = chosen.slice().reverse();
                        chain = (bestDist < 1 ? rev.slice(0, -1) : rev).concat(chain);
                    }
                    merged = true;
                }
            }
            chains.push(chain);
        }

        // Drop tiny disconnected spurs (< 150m) if the MultiLineString already has a main line (> 500m)
        if (chains.length > 1) {
            const chainLen = (pts) => {
                let total = 0;
                for (let i = 1; i < pts.length; i++) {
                    total += haversineM(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]);
                }
                return total;
            };
            const lengths = chains.map(chainLen);
            const maxLen = Math.max(...lengths);
            if (maxLen > 500) {
                const filtered = chains.filter((_, i) => lengths[i] >= 150);
                if (filtered.length > 0) return filtered;
            }
        }
        return chains;
    }

    function parseGeoJSON(text) {
        let geo;
        try {
            geo = JSON.parse(text);
        } catch (e) {
            throw new Error(t('errInvalidGeoJson'));
        }
        const rawPoints = [];
        const rawLines = [];
        const mapTitle = cleanText(geo?.metadata?.name || geo?.name || geo?.title || '');

        // Detect OSM/Overpass exports that include both route relations and raw member ways/nodes
        const topFeatures = (geo.type === 'FeatureCollection' && Array.isArray(geo.features)) ? geo.features : [];
        const hasOsmRouteRelations = topFeatures.some(f => {
            const p = f?.properties || {};
            const osmId = String(p['@id'] || f?.id || '');
            return osmId.startsWith('relation/') || p.type === 'route';
        });

        function isIgnorableOsmFeature(feat, geomType) {
            const p = feat?.properties || {};
            const osmId = String(p['@id'] || feat?.id || '');
            if (!osmId && !p['@relations']) return false;

            // Skip raw member track ways when route relations are already present in the file
            if (hasOsmRouteRelations && (geomType === 'LineString' || geomType === 'MultiLineString')) {
                if (osmId.startsWith('way/') && !p.route) {
                    return true;
                }
                if (Array.isArray(p['@relations']) && p['@relations'].length > 0 && !osmId.startsWith('relation/') && !p.route) {
                    return true;
                }
            }

            // Skip non-station railway/road infrastructure nodes (switches, signals, crossings)
            if (geomType === 'Point' || geomType === 'MultiPoint') {
                const nonStopRail = ['switch', 'buffer_stop', 'crossing', 'level_crossing', 'signal', 'milestone', 'derail'];
                const nonStopHwy = ['crossing', 'traffic_signals', 'turning_circle', 'street_lamp'];
                if (nonStopRail.includes(p.railway) || nonStopHwy.includes(p.highway)) {
                    return true;
                }
                const hasStopTag =
                    ['station', 'halt', 'tram_stop', 'subway_entrance'].includes(p.railway) ||
                    ['station', 'stop_position', 'platform'].includes(p.public_transport) ||
                    p.highway === 'bus_stop' ||
                    Boolean(p.name);
                if (osmId.startsWith('node/') && !hasStopTag) {
                    return true;
                }
            }

            return false;
        }

        function extractGeometry(geom, props) {
            if (!geom || !geom.type) return;
            const name = cleanText(
                props.iconCaption ||
                props.name ||
                props.title ||
                props.label ||
                props.route_name ||
                props.line ||
                props.ref ||
                props.description ||
                ''
            );
            const rawColor =
                props.stroke ||
                props['marker-color'] ||
                props.color ||
                props.colour ||
                props.lineColor ||
                props.line_color ||
                props.strokeColor ||
                props.fill ||
                props._umap_options?.color ||
                props.preset ||
                '';
            const modeHint = [props.mode, props.route, props.railway, props.transit_mode, props.type]
                .filter(Boolean)
                .join(' ');

            if (geom.type === 'Point' && Array.isArray(geom.coordinates)) {
                const lng = Number(geom.coordinates[0]);
                const lat = Number(geom.coordinates[1]);
                if (isValidLatLng(lat, lng)) {
                    rawPoints.push({
                        name: name || t('defaultStation'),
                        lat,
                        lng,
                        color: normalizeGeoColor(rawColor, rawPoints.length)
                    });
                }
            } else if (geom.type === 'MultiPoint' && Array.isArray(geom.coordinates)) {
                geom.coordinates.forEach(c => {
                    if (Array.isArray(c) && c.length >= 2) {
                        const lng = Number(c[0]);
                        const lat = Number(c[1]);
                        if (isValidLatLng(lat, lng)) {
                            rawPoints.push({
                                name: name || t('defaultStation'),
                                lat,
                                lng,
                                color: normalizeGeoColor(rawColor, rawPoints.length)
                            });
                        }
                    }
                });
            } else if (geom.type === 'LineString' && Array.isArray(geom.coordinates)) {
                const coords = geom.coordinates
                    .filter(c => Array.isArray(c) && c.length >= 2)
                    .map(c => [Number(c[1]), Number(c[0])])
                    .filter(([lat, lng]) => isValidLatLng(lat, lng));
                if (coords.length >= 2) {
                    rawLines.push({
                        name: name || t('defaultLineN', rawLines.length + 1),
                        color: normalizeGeoColor(rawColor, rawLines.length),
                        modeHint,
                        coords
                    });
                }
            } else if (geom.type === 'MultiLineString' && Array.isArray(geom.coordinates)) {
                const rawSegments = geom.coordinates
                    .filter(lineCoords => Array.isArray(lineCoords))
                    .map(lineCoords =>
                        lineCoords
                            .filter(c => Array.isArray(c) && c.length >= 2)
                            .map(c => [Number(c[1]), Number(c[0])])
                            .filter(([lat, lng]) => isValidLatLng(lat, lng))
                    )
                    .filter(coords => coords.length >= 2);

                const stitchedChains = stitchLineSegments(rawSegments, 120);
                stitchedChains.forEach((coords, idx) => {
                    const suffix = stitchedChains.length > 1 ? ` (${idx + 1})` : '';
                    rawLines.push({
                        name: (name || t('defaultLineN', rawLines.length + 1)) + suffix,
                        color: normalizeGeoColor(rawColor, rawLines.length),
                        modeHint,
                        coords
                    });
                });
            } else if (geom.type === 'GeometryCollection' && Array.isArray(geom.geometries)) {
                geom.geometries.forEach(subGeom => extractGeometry(subGeom, props));
            }
        }

        function processFeature(feat) {
            if (!feat) return;
            if (feat.type === 'Feature') {
                if (feat.geometry && isIgnorableOsmFeature(feat, feat.geometry.type)) return;
                extractGeometry(feat.geometry, feat.properties || {});
            } else if (feat.type === 'FeatureCollection' && Array.isArray(feat.features)) {
                feat.features.forEach(processFeature);
            } else if (feat.type && (feat.coordinates || feat.geometries)) {
                extractGeometry(feat, {});
            }
        }

        processFeature(geo);
        return { title: mapTitle, rawPoints, rawLines };
    }

    function parseKML(text) {
        const xml = new DOMParser().parseFromString(text, 'text/xml');
        if (xml.querySelector('parsererror')) {
            throw new Error(t('errInvalidXml'));
        }

        const rawPoints = [];
        const rawLines = [];
        const styles = {};

        function registerStyleColor(id, rawColor) {
            if (!id || !rawColor) return;
            const cleanId = id.replace(/^#/, '');
            const normalized = normalizeKmlColor(rawColor);
            styles[cleanId] = normalized;
            styles['#' + cleanId] = normalized;
        }

        // Pass 1: Collect standalone <Style id="..."> definitions
        xml.querySelectorAll('Style').forEach(st => {
            const id = st.getAttribute('id');
            if (!id) return;
            const lineColor = st.querySelector('LineStyle > color')?.textContent;
            const polyColor = st.querySelector('PolyStyle > color')?.textContent;
            const iconColor = st.querySelector('IconStyle > color')?.textContent;
            registerStyleColor(id, lineColor || iconColor || polyColor);
        });

        // Pass 2: Resolve <StyleMap id="..."> (supports both referenced styleUrl and inline Style)
        xml.querySelectorAll('StyleMap').forEach(sm => {
            const id = sm.getAttribute('id');
            if (!id) return;
            const pairs = Array.from(sm.querySelectorAll('Pair'));
            const normalPair = pairs.find(p => p.querySelector('key')?.textContent?.trim() === 'normal') || pairs[0];
            if (!normalPair) return;

            const styleUrl = normalPair.querySelector('styleUrl')?.textContent?.trim();
            const cleanRef = styleUrl ? styleUrl.replace(/^#/, '') : '';
            if (cleanRef && styles[cleanRef]) {
                styles[id.replace(/^#/, '')] = styles[cleanRef];
                styles['#' + id.replace(/^#/, '')] = styles[cleanRef];
            } else {
                const inlineColor =
                    normalPair.querySelector('LineStyle > color')?.textContent ||
                    normalPair.querySelector('IconStyle > color')?.textContent ||
                    normalPair.querySelector('PolyStyle > color')?.textContent;
                if (inlineColor) registerStyleColor(id, inlineColor);
            }
        });

        const docTitle = cleanText(xml.querySelector('Document > name, Folder > name')?.textContent || '');

        xml.querySelectorAll('Placemark').forEach(pm => {
            let extName = '';
            let extColor = '';
            let extMode = '';
            pm.querySelectorAll('ExtendedData Data, ExtendedData SimpleData').forEach(node => {
                const attrName = (node.getAttribute('name') || '').toLowerCase();
                const val = (node.querySelector('value')?.textContent || node.textContent || '').trim();
                if (!val) return;
                if (!extName && (attrName === 'name' || attrName === 'title' || attrName === 'label')) extName = val;
                if (!extColor && (attrName === 'color' || attrName === 'colour' || attrName === 'stroke')) extColor = val;
                if (!extMode && (attrName === 'mode' || attrName === 'route' || attrName === 'type')) extMode = val;
            });

            const name = cleanText(
                pm.querySelector(':scope > name')?.textContent ||
                pm.querySelector('name')?.textContent ||
                extName ||
                pm.querySelector(':scope > description')?.textContent ||
                ''
            );
            const styleUrl = pm.querySelector('styleUrl')?.textContent?.trim();
            const inlineColor =
                pm.querySelector('LineStyle > color')?.textContent ||
                pm.querySelector('IconStyle > color')?.textContent ||
                extColor;
            const resolvedStyleColor = styleUrl ? (styles[styleUrl] || styles[styleUrl.replace(/^#/, '')]) : null;
            const color = inlineColor
                ? normalizeKmlColor(inlineColor, rawLines.length)
                : (resolvedStyleColor || FALLBACK_PALETTE[rawLines.length % FALLBACK_PALETTE.length]);

            pm.querySelectorAll('Point > coordinates').forEach(ptNode => {
                const parts = ptNode.textContent.trim().split(/[\s,]+/);
                const lng = parseFloat(parts[0]);
                const lat = parseFloat(parts[1]);
                if (isValidLatLng(lat, lng)) {
                    rawPoints.push({ name: name || t('defaultStation'), lat, lng, color });
                }
            });

            const lsNodes = Array.from(pm.querySelectorAll('LineString > coordinates'));
            lsNodes.forEach((lsNode, idx) => {
                const coordTuples = lsNode.textContent.trim().split(/\s+/);
                const coords = [];
                coordTuples.forEach(tuple => {
                    const p = tuple.split(',');
                    if (p.length >= 2) {
                        const lng = parseFloat(p[0]);
                        const lat = parseFloat(p[1]);
                        if (isValidLatLng(lat, lng)) coords.push([lat, lng]);
                    }
                });
                if (coords.length >= 2) {
                    const suffix = lsNodes.length > 1 ? ` (${idx + 1})` : '';
                    rawLines.push({
                        name: (name || t('defaultLineN', rawLines.length + 1)) + suffix,
                        color,
                        modeHint: extMode,
                        coords
                    });
                }
            });

            // Support Google Earth <gx:Track> elements
            const trackNodes = [
                ...Array.from(pm.getElementsByTagName('gx:Track')),
                ...Array.from(pm.getElementsByTagName('Track'))
            ];
            trackNodes.forEach((trackNode, idx) => {
                const coords = [];
                const coordNodes = [
                    ...Array.from(trackNode.getElementsByTagName('gx:coord')),
                    ...Array.from(trackNode.getElementsByTagName('coord'))
                ];
                coordNodes.forEach(cNode => {
                    const parts = cNode.textContent.trim().split(/\s+/);
                    if (parts.length >= 2) {
                        const lng = parseFloat(parts[0]);
                        const lat = parseFloat(parts[1]);
                        if (isValidLatLng(lat, lng)) coords.push([lat, lng]);
                    }
                });
                if (coords.length >= 2) {
                    const suffix = trackNodes.length > 1 ? ` (${idx + 1})` : '';
                    rawLines.push({
                        name: (name || t('defaultLineN', rawLines.length + 1)) + suffix,
                        color,
                        modeHint: extMode,
                        coords
                    });
                }
            });
        });

        return { title: docTitle, rawPoints, rawLines };
    }

    function parseGPX(text) {
        const xml = new DOMParser().parseFromString(text, 'text/xml');
        if (xml.querySelector('parsererror')) {
            throw new Error(t('errInvalidXml'));
        }

        const rawPoints = [];
        const rawLines = [];
        const title = cleanText(xml.querySelector('metadata > name, gpx > name')?.textContent || '');

        function extractGpxColor(node, fallbackIdx) {
            const colorNode =
                node.querySelector('extensions > color, extensions > DisplayColor, color') ||
                node.getElementsByTagName('gpxx:DisplayColor')[0] ||
                node.getElementsByTagName('DisplayColor')[0];
            const raw = colorNode?.textContent?.trim();
            return raw ? normalizeGeoColor(raw, fallbackIdx) : FALLBACK_PALETTE[fallbackIdx % FALLBACK_PALETTE.length];
        }

        xml.querySelectorAll('wpt').forEach(wpt => {
            const lat = parseFloat(wpt.getAttribute('lat'));
            const lng = parseFloat(wpt.getAttribute('lon'));
            const name = cleanText(wpt.querySelector('name')?.textContent || wpt.querySelector('desc')?.textContent || t('defaultStation'));
            if (isValidLatLng(lat, lng)) {
                rawPoints.push({ name, lat, lng, color: '' });
            }
        });

        xml.querySelectorAll('trk').forEach(trk => {
            const name = cleanText(trk.querySelector('name')?.textContent || t('defaultLineN', rawLines.length + 1));
            const color = extractGpxColor(trk, rawLines.length);
            const modeHint = cleanText(trk.querySelector('type')?.textContent || '');
            const segs = Array.from(trk.querySelectorAll('trkseg'));
            segs.forEach((seg, idx) => {
                const coords = [];
                seg.querySelectorAll('trkpt').forEach(pt => {
                    const lat = parseFloat(pt.getAttribute('lat'));
                    const lng = parseFloat(pt.getAttribute('lon'));
                    if (isValidLatLng(lat, lng)) coords.push([lat, lng]);
                });
                if (coords.length >= 2) {
                    const suffix = segs.length > 1 ? ` (${idx + 1})` : '';
                    rawLines.push({ name: name + suffix, color, modeHint, coords });
                }
            });
        });

        xml.querySelectorAll('rte').forEach(rte => {
            const name = cleanText(rte.querySelector('name')?.textContent || t('defaultLineN', rawLines.length + 1));
            const color = extractGpxColor(rte, rawLines.length);
            const modeHint = cleanText(rte.querySelector('type')?.textContent || '');
            const coords = [];
            rte.querySelectorAll('rtept').forEach(pt => {
                const lat = parseFloat(pt.getAttribute('lat'));
                const lng = parseFloat(pt.getAttribute('lon'));
                if (isValidLatLng(lat, lng)) coords.push([lat, lng]);
            });
            if (coords.length >= 2) {
                rawLines.push({ name, color, modeHint, coords });
            }
        });

        return { title, rawPoints, rawLines };
    }

    // =========================================================================
    // PART 3. SYSTEM BUILDER (STATIONS, LINES, WAYPOINTS, INTERCHANGES)
    // =========================================================================
    function cloneForPage(obj) {
        try {
            if (typeof cloneInto === 'function') {
                return cloneInto(obj, pageWin);
            }
            return pageWin.JSON.parse(JSON.stringify(obj));
        } catch (e) {
            return obj;
        }
    }

    function exportFnToPage(fn) {
        try {
            if (typeof exportFunction === 'function') {
                return exportFunction(fn, pageWin);
            }
        } catch (e) {}
        return fn;
    }

    function maxNumericKeyPlusOne(dict, fallbackNum) {
        let maxVal = fallbackNum - 1;
        if (dict && typeof dict === 'object') {
            for (const k of Object.keys(dict)) {
                const n = parseInt(k, 10);
                if (!isNaN(n) && n > maxVal) maxVal = n;
            }
        }
        return maxVal + 1;
    }

    function buildMetroDreaminSystem(parsed, options, baseMeta = null, existingMap = null) {
        const {
            snapRadiusM = 80,
            vertexReplaceM = 40,
            mergeStationM = 25,
            interchangeRadiusM = 100,
            waypointShareM = 15,
            tailTrimM = 220,
            vertexMode = 'auto',
            defaultMode = 'AUTO',
            orphanPolicy = 'remove'
        } = options;

        let nextStationId = maxNumericKeyPlusOne(
            existingMap?.stations,
            baseMeta ? parseInt(baseMeta.nextStationId || '0', 10) || 0 : 0
        );
        let nextLineId = maxNumericKeyPlusOne(
            existingMap?.lines,
            baseMeta ? parseInt(baseMeta.nextLineId || '0', 10) || 0 : 0
        );
        let nextInterchangeId = maxNumericKeyPlusOne(
            existingMap?.interchanges,
            baseMeta ? parseInt(baseMeta.nextInterchangeId || '0', 10) || 0 : 0
        );
        let nextLineGroupId = baseMeta ? parseInt(baseMeta.nextLineGroupId || '0', 10) || 0 : 0;

        const stations = {};
        const lines = {};
        const interchanges = {};
        const namedStationsList = [];
        let discardedLinesCount = 0;

        const mergeDegMargin = (mergeStationM / 111000) * 1.5;
        for (const pt of parsed.rawPoints) {
            let existing = null;
            if (mergeStationM > 0) {
                for (const st of namedStationsList) {
                    if (!isWithinDegBox(pt.lat, pt.lng, st.lat, st.lng, mergeDegMargin)) continue;
                    if (haversineM(pt.lat, pt.lng, st.lat, st.lng) <= mergeStationM) {
                        existing = st;
                        break;
                    }
                }
            }
            if (!existing) {
                const id = String(nextStationId++);
                const stObj = { id, name: pt.name || t('defaultStationN', id), lat: Number(pt.lat), lng: Number(pt.lng) };
                stations[id] = stObj;
                namedStationsList.push(stObj);
            }
        }

        const treatVerticesAsWaypoints =
            vertexMode === 'waypoints' ||
            (vertexMode === 'auto' && namedStationsList.length > 0);

        const shareDegMargin = (waypointShareM / 111000) * 1.5;
        const stationValuesCache = Object.values(stations);

        function getOrCreateVertexNode(lat, lng, forceStationName = null) {
            for (const s of stationValuesCache) {
                if (!isWithinDegBox(lat, lng, s.lat, s.lng, shareDegMargin)) continue;
                if (haversineM(lat, lng, s.lat, s.lng) <= waypointShareM) {
                    if (forceStationName && s.isWaypoint) {
                        delete s.isWaypoint;
                        s.name = forceStationName;
                    }
                    return s.id;
                }
            }
            const id = String(nextStationId++);
            let newNode;
            if (forceStationName || !treatVerticesAsWaypoints) {
                newNode = {
                    id,
                    name: forceStationName || t('defaultStationN', id),
                    lat: Number(lat),
                    lng: Number(lng)
                };
            } else {
                newNode = {
                    id,
                    lat: Number(lat),
                    lng: Number(lng),
                    isWaypoint: true
                };
            }
            stations[id] = newNode;
            stationValuesCache.push(newNode);
            return id;
        }

        const snapLatDegMargin = (snapRadiusM / 111000) * 1.5;

        parsed.rawLines.forEach((rawLine, idx) => {
            const coords = [];
            for (const c of rawLine.coords) {
                if (coords.length === 0 || haversineM(coords[coords.length - 1][0], coords[coords.length - 1][1], c[0], c[1]) >= 1.0) {
                    coords.push(c);
                }
            }
            const n = coords.length;
            if (n < 2) {
                discardedLinesCount++;
                return;
            }

            let lineMinLat = 90, lineMaxLat = -90, lineMinLng = 180, lineMaxLng = -180;
            for (const [lat, lng] of coords) {
                if (lat < lineMinLat) lineMinLat = lat;
                if (lat > lineMaxLat) lineMaxLat = lat;
                if (lng < lineMinLng) lineMinLng = lng;
                if (lng > lineMaxLng) lineMaxLng = lng;
            }

            // High-latitude-safe longitude margin (scales with 1 / cos(meanLat))
            const lineMeanLat = (lineMinLat + lineMaxLat) * 0.5;
            const cosLineLat = Math.max(0.05, Math.cos((lineMeanLat * Math.PI) / 180));
            const snapLngDegMargin = snapLatDegMargin / cosLineLat;

            const isLoop = n >= 3 && haversineM(coords[0][0], coords[0][1], coords[n - 1][0], coords[n - 1][1]) <= vertexReplaceM;

            const vertexStation = {};
            const segInsertions = {};
            for (let i = 0; i < n - 1; i++) segInsertions[i] = [];

            for (const st of namedStationsList) {
                if (st.lat < lineMinLat - snapLatDegMargin || st.lat > lineMaxLat + snapLatDegMargin) continue;
                if (st.lng < lineMinLng - snapLngDegMargin || st.lng > lineMaxLng + snapLngDegMargin) continue;

                let bestDist = Infinity;
                let bestSeg = -1;
                let bestT = 0;

                for (let i = 0; i < n - 1; i++) {
                    const proj = pointToSegmentProjection(
                        st.lat, st.lng,
                        coords[i][0], coords[i][1],
                        coords[i + 1][0], coords[i + 1][1]
                    );
                    if (proj.dist < bestDist) {
                        bestDist = proj.dist;
                        bestSeg = i;
                        bestT = proj.t;
                    }
                }

                if (bestDist <= snapRadiusM && bestSeg >= 0) {
                    const dStart = haversineM(st.lat, st.lng, coords[bestSeg][0], coords[bestSeg][1]);
                    const dEnd = haversineM(st.lat, st.lng, coords[bestSeg + 1][0], coords[bestSeg + 1][1]);

                    if (dStart <= vertexReplaceM && dStart <= dEnd) {
                        if (!vertexStation[bestSeg] || dStart < vertexStation[bestSeg].dist) {
                            vertexStation[bestSeg] = { dist: dStart, id: st.id };
                        }
                    } else if (dEnd <= vertexReplaceM) {
                        if (!vertexStation[bestSeg + 1] || dEnd < vertexStation[bestSeg + 1].dist) {
                            vertexStation[bestSeg + 1] = { dist: dEnd, id: st.id };
                        }
                    } else {
                        segInsertions[bestSeg].push({ t: bestT, id: st.id });
                    }
                }
            }

            let stationIds = [];
            const pushUnique = (id) => {
                if (!id || !stations[id]) return;
                if (stationIds.length === 0) {
                    stationIds.push(id);
                    return;
                }
                const prevId = stationIds[stationIds.length - 1];
                if (prevId === id) return;
                const sPrev = stations[prevId];
                const sCurr = stations[id];
                if (haversineM(sPrev.lat, sPrev.lng, sCurr.lat, sCurr.lng) < 0.5) return;
                stationIds.push(id);
            };

            for (let i = 0; i < n; i++) {
                if (isLoop && i === n - 1 && stationIds.length >= 2) {
                    if (stationIds[stationIds.length - 1] !== stationIds[0]) {
                        stationIds.push(stationIds[0]);
                    }
                    break;
                }

                if (vertexStation[i]) {
                    pushUnique(vertexStation[i].id);
                } else {
                    const vId = getOrCreateVertexNode(coords[i][0], coords[i][1], null);
                    pushUnique(vId);
                }

                if (i < n - 1 && segInsertions[i].length > 0) {
                    segInsertions[i]
                        .sort((a, b) => a.t - b.t)
                        .forEach(ins => pushUnique(ins.id));
                }
            }

            const allUniqueIds = Array.from(new Set(stationIds));
            if (stationIds.length < 2 || allUniqueIds.length < 2) {
                discardedLinesCount++;
                return;
            }

            const isClosedLoop = stationIds.length >= 3 && stationIds[0] === stationIds[stationIds.length - 1];

            if (!isClosedLoop) {
                const realStationIndices = stationIds
                    .map((id, i) => (!stations[id].isWaypoint ? i : -1))
                    .filter(i => i !== -1);

                if (realStationIndices.length >= 2) {
                    const firstRealIdx = realStationIndices[0];
                    const lastRealIdx = realStationIndices[realStationIndices.length - 1];

                    const stStart = stations[stationIds[0]];
                    const stFirstReal = stations[stationIds[firstRealIdx]];
                    const distStartTail = haversineM(stStart.lat, stStart.lng, stFirstReal.lat, stFirstReal.lng);

                    const stEnd = stations[stationIds[stationIds.length - 1]];
                    const stLastReal = stations[stationIds[lastRealIdx]];
                    const distEndTail = haversineM(stEnd.lat, stEnd.lng, stLastReal.lat, stLastReal.lng);

                    const sliceStart = (firstRealIdx > 0 && distStartTail <= tailTrimM) ? firstRealIdx : 0;
                    const sliceEnd = (lastRealIdx < stationIds.length - 1 && distEndTail <= tailTrimM) ? lastRealIdx + 1 : stationIds.length;
                    if (sliceEnd - sliceStart >= 2) {
                        stationIds = stationIds.slice(sliceStart, sliceEnd);
                    }
                }

                const firstId = stationIds[0];
                const lastId = stationIds[stationIds.length - 1];
                if (stations[firstId].isWaypoint) {
                    delete stations[firstId].isWaypoint;
                    stations[firstId].name = stations[firstId].name || `${rawLine.name} (${t('defaultStartSuffix')})`;
                }
                if (stations[lastId].isWaypoint) {
                    delete stations[lastId].isWaypoint;
                    stations[lastId].name = stations[lastId].name || `${rawLine.name} (${t('defaultEndSuffix')})`;
                }
            } else {
                const firstId = stationIds[0];
                if (stations[firstId].isWaypoint) {
                    delete stations[firstId].isWaypoint;
                    stations[firstId].name = stations[firstId].name || `${rawLine.name} (${t('defaultStation1Suffix')})`;
                }
            }

            const uniqueRealIds = new Set(stationIds.filter(id => !stations[id].isWaypoint));
            if (uniqueRealIds.size < 2) {
                const firstSt = stations[stationIds[0]];
                let bestCandidateId = null;
                let maxDist = -1;
                for (const uid of new Set(stationIds)) {
                    if (!uniqueRealIds.has(uid)) {
                        const d = haversineM(firstSt.lat, firstSt.lng, stations[uid].lat, stations[uid].lng);
                        if (d > maxDist) {
                            maxDist = d;
                            bestCandidateId = uid;
                        }
                    }
                }
                if (bestCandidateId) {
                    delete stations[bestCandidateId].isWaypoint;
                    stations[bestCandidateId].name = stations[bestCandidateId].name || `${rawLine.name} (${t('defaultStation2Suffix')})`;
                    uniqueRealIds.add(bestCandidateId);
                }
            }

            if (uniqueRealIds.size < 2) {
                discardedLinesCount++;
                return;
            }

            const lineId = String(nextLineId++);
            lines[lineId] = {
                id: lineId,
                name: rawLine.name || t('defaultLineN', idx + 1),
                color: rawLine.color || FALLBACK_PALETTE[idx % FALLBACK_PALETTE.length],
                mode: detectTransitMode(rawLine.name, rawLine.modeHint, defaultMode),
                icon: 'circle',
                stationIds
            };
        });

        if (Object.keys(lines).length === 0 && namedStationsList.length >= 2) {
            const lineId = String(nextLineId++);
            lines[lineId] = {
                id: lineId,
                name: parsed.title || t('defaultImportedLine'),
                color: FALLBACK_PALETTE[0],
                mode: detectTransitMode(parsed.title, '', defaultMode),
                icon: 'circle',
                stationIds: namedStationsList.map(s => s.id)
            };
        }

        const usedStationIds = new Set();
        const stationToLines = {};
        Object.values(lines).forEach(ln => {
            ln.stationIds.forEach(sid => {
                usedStationIds.add(sid);
                if (!stationToLines[sid]) stationToLines[sid] = new Set();
                stationToLines[sid].add(ln.id);
            });
        });

        const orphanStationIds = [];
        for (const sid of Object.keys(stations)) {
            if (!usedStationIds.has(sid)) {
                if (!stations[sid].isWaypoint && orphanPolicy === 'line') {
                    orphanStationIds.push(sid);
                } else {
                    delete stations[sid];
                }
            }
        }

        if (orphanPolicy === 'line' && orphanStationIds.length >= 2) {
            const lineId = String(nextLineId++);
            lines[lineId] = {
                id: lineId,
                name: t('defaultOrphanLine'),
                color: '#808080',
                mode: 'BUS',
                icon: 'circle',
                stationIds: orphanStationIds
            };
            orphanStationIds.forEach(sid => {
                stationToLines[sid] = new Set([lineId]);
            });
        } else if (orphanStationIds.length > 0) {
            orphanStationIds.forEach(sid => delete stations[sid]);
        }

        // Build Interchanges (supports linking new stations with existing map stations in append mode)
        if (interchangeRadiusM > 0) {
            const newRealStations = Object.values(stations).filter(s => !s.isWaypoint);
            const existingRealStations = [];
            const existingStationToIcId = {};

            if (existingMap?.stations && existingMap?.lines) {
                Object.values(existingMap.lines).forEach(ln => {
                    if (!ln || !Array.isArray(ln.stationIds)) return;
                    ln.stationIds.forEach(sid => {
                        if (!stationToLines[sid]) stationToLines[sid] = new Set();
                        stationToLines[sid].add(ln.id);
                    });
                });
                Object.values(existingMap.stations).forEach(s => {
                    if (s && !s.isWaypoint && typeof s.lat === 'number' && typeof s.lng === 'number' && !stations[s.id]) {
                        existingRealStations.push(s);
                    }
                });
                if (existingMap.interchanges) {
                    Object.values(existingMap.interchanges).forEach(ic => {
                        if (ic && Array.isArray(ic.stationIds)) {
                            ic.stationIds.forEach(sid => { existingStationToIcId[sid] = ic.id; });
                        }
                    });
                }
            }

            const allRealStations = [...existingRealStations, ...newRealStations];
            const parent = {};
            allRealStations.forEach(s => { parent[s.id] = s.id; });
            const find = (x) => (parent[x] === x ? x : (parent[x] = find(parent[x])));
            const union = (a, b) => {
                const ra = find(a), rb = find(b);
                if (ra !== rb) parent[ra] = rb;
            };

            // Pre-union existing interchanges so extending an existing transfer hub preserves its members
            if (existingMap?.interchanges) {
                Object.values(existingMap.interchanges).forEach(ic => {
                    if (ic && Array.isArray(ic.stationIds) && ic.stationIds.length >= 2) {
                        const validIds = ic.stationIds.filter(id => parent[id] !== undefined);
                        for (let k = 1; k < validIds.length; k++) {
                            union(validIds[0], validIds[k]);
                        }
                    }
                });
            }

            const icDegMargin = (interchangeRadiusM / 111000) * 1.5;

            for (let i = 0; i < allRealStations.length; i++) {
                const s1 = allRealStations[i];
                for (let j = i + 1; j < allRealStations.length; j++) {
                    const s2 = allRealStations[j];
                    // Skip comparing two already-existing stations against each other
                    if (!stations[s1.id] && !stations[s2.id]) continue;
                    if (!isWithinDegBox(s1.lat, s1.lng, s2.lat, s2.lng, icDegMargin)) continue;

                    const d = haversineM(s1.lat, s1.lng, s2.lat, s2.lng);
                    if (d <= interchangeRadiusM) {
                        const l1 = stationToLines[s1.id] || new Set();
                        const l2 = stationToLines[s2.id] || new Set();
                        let differentLine = false;
                        for (const lid of l1) {
                            if (!l2.has(lid)) { differentLine = true; break; }
                        }
                        if (!differentLine) {
                            for (const lid of l2) {
                                if (!l1.has(lid)) { differentLine = true; break; }
                            }
                        }
                        if (differentLine) {
                            union(s1.id, s2.id);
                        }
                    }
                }
            }

            const groups = {};
            allRealStations.forEach(s => {
                const r = find(s.id);
                if (!groups[r]) groups[r] = [];
                groups[r].push(s.id);
            });

            Object.values(groups).forEach(memberIds => {
                if (memberIds.length >= 2 && memberIds.some(id => Boolean(stations[id]))) {
                    const existingIcId = memberIds.map(id => existingStationToIcId[id]).find(Boolean);
                    const icId = existingIcId !== undefined ? String(existingIcId) : String(nextInterchangeId++);
                    interchanges[icId] = {
                        id: icId,
                        stationIds: memberIds
                    };
                }
            });
        }

        let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
        const allStations = Object.values(stations);
        allStations.forEach(s => {
            if (s.lat < minLat) minLat = s.lat;
            if (s.lat > maxLat) maxLat = s.lat;
            if (s.lng < minLng) minLng = s.lng;
            if (s.lng > maxLng) maxLng = s.lng;
        });

        const bounds = allStations.length > 0 ? [[minLng, minLat], [maxLng, maxLat]] : null;
        const center = allStations.length > 0 ? { lat: (minLat + maxLat) / 2, lng: (minLng + maxLng) / 2 } : null;

        mdLog('BUILD', 'System built', {
            totalLines: Object.keys(lines).length,
            discardedLinesCount,
            totalStations: allStations.filter(s => !s.isWaypoint).length,
            totalWaypoints: allStations.filter(s => s.isWaypoint).length,
            totalInterchanges: Object.keys(interchanges).length
        });

        return {
            map: {
                stations,
                lines,
                interchanges,
                lineGroups: {},
                title: parsed.title || '',
                caption: ''
            },
            hasCustomTitle: Boolean(parsed.title),
            meta: {
                nextStationId: String(nextStationId),
                nextLineId: String(nextLineId),
                nextInterchangeId: String(nextInterchangeId),
                nextLineGroupId: String(nextLineGroupId)
            },
            bounds,
            center,
            removedOrphansCount: Math.max(0, parsed.rawPoints.length - allStations.filter(s => !s.isWaypoint).length)
        };
    }

    // =========================================================================
    // PART 4. REACT FIBER SCANNER & LIVE STATE INJECTOR
    // =========================================================================
    function getReactRootFiber() {
        const candidates = [
            document.querySelector('.System'),
            document.querySelector('main.Edit'),
            document.getElementById('__next')
        ].filter(Boolean);

        for (const el of candidates) {
            const key = Object.keys(el).find(k => k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$'));
            if (key && el[key]) {
                let f = el[key];
                while (f.return) f = f.return;
                return f;
            }
        }
        return null;
    }

    function getUrlSystemNumStr() {
        const m = pageWin.location.pathname.match(/\/(?:edit|view)\/([^/?#]+)/);
        if (m && m[1] && m[1] !== 'new') {
            try {
                const decoded = atob(decodeURIComponent(m[1]));
                const parts = decoded.split('|');
                if (parts.length === 2 && parts[1] !== undefined) return parts[1];
            } catch (e) {}
        }
        return null;
    }

    function isSafeUseStateHook(hook) {
        if (!hook || !hook.queue || typeof hook.queue.dispatch !== 'function') return false;
        const reducer = hook.queue.lastRenderedReducer;
        if (typeof reducer !== 'function') return true;
        if (reducer.name === 'basicStateReducer') return true;
        try {
            // Only probe short built-in state reducers to avoid triggering complex custom useReducer logic
            const src = Function.prototype.toString.call(reducer);
            if (src.length > 160) return false;
            const sentinel = { __test: 1 };
            return reducer({ __old: 0 }, sentinel) === sentinel;
        } catch (e) {
            return false;
        }
    }

    function isLinesDictionary(obj) {
        if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false;
        const vals = Object.values(obj);
        return vals.length > 0 && vals.every(v => v && typeof v === 'object' && Array.isArray(v.stationIds) && typeof v.color === 'string' && 'id' in v);
    }

    function isNonEmptyStationsDictionary(obj) {
        if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false;
        if ('centroid' in obj || 'zoom' in obj || 'bearing' in obj || 'pitch' in obj || 'lat' in obj) return false;
        const keys = Object.keys(obj);
        if (keys.length === 0) return false;
        return keys.every(k => {
            const v = obj[k];
            return v && typeof v === 'object' && 'id' in v && typeof v.lat === 'number' && typeof v.lng === 'number';
        });
    }

    function collectNamedRefsFromBag(bag, propRefs, propSetters) {
        if (!bag || typeof bag !== 'object' || Array.isArray(bag)) return;

        if (bag.lines && typeof bag.lines === 'object' && !Array.isArray(bag.lines)) {
            if (isLinesDictionary(bag.lines) || Object.keys(bag.lines).length === 0) {
                propRefs.lines = bag.lines;
            }
        }
        if (bag.stations && typeof bag.stations === 'object' && !Array.isArray(bag.stations) && !('centroid' in bag.stations) && !('lat' in bag.stations)) {
            propRefs.stations = bag.stations;
        }
        if (bag.interchanges && typeof bag.interchanges === 'object' && !Array.isArray(bag.interchanges)) {
            propRefs.interchanges = bag.interchanges;
        }
        if (bag.lineGroups && typeof bag.lineGroups === 'object' && !Array.isArray(bag.lineGroups)) {
            propRefs.lineGroups = bag.lineGroups;
        }
        if (bag.meta && typeof bag.meta === 'object' && 'nextStationId' in bag.meta) {
            propRefs.meta = bag.meta;
        }

        ['map', 'system', 'fullSystem'].forEach(containerKey => {
            const sub = bag[containerKey];
            if (sub && typeof sub === 'object') {
                const mapObj = sub.map && typeof sub.map === 'object' ? sub.map : sub;
                if (mapObj.stations && typeof mapObj.stations === 'object' && !propRefs.stations) {
                    propRefs.stations = mapObj.stations;
                }
                if (mapObj.lines && typeof mapObj.lines === 'object' && !propRefs.lines) {
                    propRefs.lines = mapObj.lines;
                }
                if (mapObj.interchanges && typeof mapObj.interchanges === 'object' && !propRefs.interchanges) {
                    propRefs.interchanges = mapObj.interchanges;
                }
                if (mapObj.lineGroups && typeof mapObj.lineGroups === 'object' && !propRefs.lineGroups) {
                    propRefs.lineGroups = mapObj.lineGroups;
                }
                if (sub.meta && typeof sub.meta === 'object' && 'nextStationId' in sub.meta && !propRefs.meta) {
                    propRefs.meta = sub.meta;
                }
            }
        });

        ['setStations', 'setLines', 'setInterchanges', 'setLineGroups', 'setMeta', 'setTitle', 'setSelectedLineId', 'setActiveLineId'].forEach(k => {
            if (typeof bag[k] === 'function') propSetters[k] = bag[k];
        });
    }

    function inspectMetroDreaminFiber() {
        const rootFiber = getReactRootFiber();
        if (!rootFiber) return null;

        const visited = new Set();
        const propRefs = {};
        const propSetters = {};
        const allFibers = [];
        let mapboxInstance = null;
        let userDoc = null;

        function walk(fiber) {
            if (!fiber || visited.has(fiber)) return;
            visited.add(fiber);
            allFibers.push(fiber);

            const props = fiber.memoizedProps;
            if (props && typeof props === 'object') {
                collectNamedRefsFromBag(props, propRefs, propSetters);
                if (props.value && typeof props.value === 'object') {
                    collectNamedRefsFromBag(props.value, propRefs, propSetters);
                }
                if (props.ownerDocData && typeof props.ownerDocData.systemsCreated === 'number') {
                    userDoc = props.ownerDocData;
                }
                if (props.userDocData && typeof props.userDocData.systemsCreated === 'number') {
                    userDoc = props.userDocData;
                }
            }

            let hook = fiber.memoizedState;
            let guard = 0;
            while (hook && guard++ < 150) {
                const ms = hook.memoizedState;
                const val = (ms && typeof ms === 'object' && 'current' in ms) ? ms.current : ms;
                if (val && typeof val === 'object') {
                    if (typeof val.flyTo === 'function' && typeof val.getSource === 'function') {
                        mapboxInstance = val;
                    }
                    if (typeof val.systemsCreated === 'number' && typeof val.userId === 'string') {
                        userDoc = val;
                    }
                }
                hook = hook.next;
            }

            if (fiber.child) walk(fiber.child);
            if (fiber.sibling) walk(fiber.sibling);
        }

        walk(rootFiber);

        let editorFiber = null;
        let metaHook = null;

        for (const fiber of allFibers) {
            let hook = fiber.memoizedState;
            let guard = 0;
            while (hook && guard++ < 150) {
                if (isSafeUseStateHook(hook)) {
                    const st = hook.memoizedState;
                    if (st && typeof st === 'object' && !Array.isArray(st) && 'nextStationId' in st && 'nextLineId' in st) {
                        editorFiber = fiber;
                        metaHook = hook;
                        if (!propRefs.meta) propRefs.meta = st;
                    }
                }
                hook = hook.next;
            }
        }

        const editorHooksDump = [];
        const editorStateHooks = [];

        if (editorFiber) {
            let h = editorFiber.memoizedState;
            let idx = 0;
            while (h && idx < 150) {
                if (isSafeUseStateHook(h)) {
                    const st = h.memoizedState;
                    let kind = typeof st;
                    let keysPreview = null;
                    if (st === null) {
                        kind = 'null';
                    } else if (Array.isArray(st)) {
                        kind = `Array(${st.length})`;
                    } else if (typeof st === 'object') {
                        const keys = Object.keys(st);
                        kind = `Object(${keys.length})`;
                        keysPreview = keys.slice(0, 6);

                        if (!propRefs.lines && isLinesDictionary(st)) {
                            propRefs.lines = st;
                        }
                        if (!propRefs.stations && isNonEmptyStationsDictionary(st)) {
                            propRefs.stations = st;
                        }
                        if (st.stations && st.lines && typeof st.stations === 'object' && typeof st.lines === 'object') {
                            if (!propRefs.stations) propRefs.stations = st.stations;
                            if (!propRefs.lines) propRefs.lines = st.lines;
                            if (st.interchanges && !propRefs.interchanges) propRefs.interchanges = st.interchanges;
                        }
                    }

                    editorHooksDump.push({
                        hookIdx: idx,
                        kind,
                        keysPreview,
                        matchesPropRef: Object.keys(propRefs).find(k => propRefs[k] === st) || null,
                        sampleValue: (typeof st === 'string' || typeof st === 'number' || typeof st === 'boolean') ? st : undefined
                    });
                    editorStateHooks.push({ hookIdx: idx, hook: h, state: st });
                }
                h = h.next;
                idx++;
            }

            // When the map is empty (stations === {}), only match an empty {} hook immediately adjacent (distance <= 2) to lines
            if (!propRefs.stations) {
                const linesEntry = editorStateHooks.find(e => e.state === propRefs.lines);
                const emptyObjCandidates = editorStateHooks.filter(e => {
                    const s = e.state;
                    if (!s || typeof s !== 'object' || Array.isArray(s)) return false;
                    if (s === propRefs.lines || s === propRefs.meta || s === propRefs.interchanges || s === propRefs.lineGroups) return false;
                    return Object.keys(s).length === 0;
                });

                if (linesEntry && emptyObjCandidates.length > 0) {
                    const adjacent = emptyObjCandidates
                        .filter(c => Math.abs(c.hookIdx - linesEntry.hookIdx) <= 2)
                        .sort((a, b) => Math.abs(a.hookIdx - linesEntry.hookIdx) - Math.abs(b.hookIdx - linesEntry.hookIdx));
                    if (adjacent.length > 0) {
                        propRefs.stations = adjacent[0].state;
                    }
                }
            }
        }

        const existingLines = propRefs.lines || {};
        const hasNonEmptyExistingLines = Object.values(existingLines).some(
            l => l && Array.isArray(l.stationIds) && l.stationIds.length >= 2
        );

        return {
            allFibers,
            editorFiber,
            editorHooksDump,
            editorStateHooks,
            propRefs,
            propSetters,
            mapboxInstance,
            userDoc,
            metaHook,
            hasNonEmptyExistingLines
        };
    }

    function syncEditorSelectionAndUnsavedFlag(payload) {
        setTimeout(() => {
            try {
                const lineBtns = Array.from(document.querySelectorAll('.LineButtons-button:not(.LineButtons-button--new)'));
                const targetBtn = lineBtns[0] || null;
                if (targetBtn) {
                    targetBtn.click();
                }

                const titleInput = document.querySelector('.Title-input');
                let targetTitle = null;
                if (titleInput) {
                    targetTitle = (payload.mergeMode !== 'append' && payload.hasCustomTitle && payload.map.title)
                        ? payload.map.title
                        : titleInput.value;
                    const proto = pageWin.HTMLInputElement?.prototype || window.HTMLInputElement.prototype;
                    const nativeSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
                    if (nativeSetter && targetTitle) {
                        nativeSetter.call(titleInput, targetTitle);
                        titleInput.dispatchEvent(new Event('input', { bubbles: true }));
                        titleInput.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                }

                mdLog('SYNC_UI', 'Synchronized active line selection and title', {
                    lineButtonsCount: lineBtns.length,
                    hasTitle: Boolean(targetTitle)
                });
            } catch (e) {
                mdLog('SYNC_UI_ERR', 'UI sync error', { error: e.message });
            }
        }, 180);
    }

    function injectIntoReactLive(payload, customSystemNumStr = null) {
        const info = inspectMetroDreaminFiber();
        if (!info) {
            throw new Error(t('errNoReactRoot'));
        }

        const { allFibers, editorFiber, editorHooksDump, propRefs, propSetters, mapboxInstance, userDoc } = info;

        mdLog('FIBER_INSPECT', 'React Fiber snapshot before injection', {
            editorComponentName: editorFiber?.type?.displayName || editorFiber?.type?.name || 'AnonymousEditorComponent',
            propRefsFound: Object.keys(propRefs),
            propSettersFound: Object.keys(propSetters),
            existingLinesCount: Object.keys(propRefs.lines || {}).length,
            existingStationsCount: Object.keys(propRefs.stations || {}).length,
            existingMeta: propRefs.meta || null,
            userSystemsCreated: userDoc?.systemsCreated ?? null,
            editorHooksDump
        });

        let updatedCount = 0;
        const matchedHooks = [];

        const urlNumStr = getUrlSystemNumStr();
        const existingNumStr = propRefs.meta?.systemNumStr;
        let targetSystemNumStr = customSystemNumStr ?? urlNumStr ?? existingNumStr;

        if (!customSystemNumStr && urlNumStr === null && userDoc && typeof userDoc.systemsCreated === 'number') {
            const parsedExisting = parseInt(targetSystemNumStr, 10);
            if (isNaN(parsedExisting) || parsedExisting < userDoc.systemsCreated) {
                targetSystemNumStr = String(userDoc.systemsCreated);
            }
        }

        const cleanLines = (linesDict) => {
            const res = {};
            for (const [k, v] of Object.entries(linesDict)) {
                if (v && Array.isArray(v.stationIds) && v.stationIds.length >= 2) {
                    res[k] = v;
                }
            }
            return res;
        };

        const isAppend = payload.mergeMode === 'append';
        const rawStations = payload.map.stations;
        const rawLines = cleanLines(payload.map.lines);
        const rawInterchanges = payload.map.interchanges || {};

        // Pass pre-merged plain objects (instead of updater functions) into propSetters for Firefox Xray safety
        if (propSetters.setStations && propSetters.setLines) {
            const finalStations = isAppend ? Object.assign({}, propRefs.stations || {}, rawStations) : rawStations;
            propSetters.setStations(cloneForPage(finalStations));
            matchedHooks.push('setter:setStations');
            updatedCount++;

            const finalLines = cleanLines(isAppend ? Object.assign({}, propRefs.lines || {}, rawLines) : rawLines);
            propSetters.setLines(cloneForPage(finalLines));
            matchedHooks.push('setter:setLines');
            updatedCount++;

            if (propSetters.setInterchanges) {
                const finalIc = isAppend ? Object.assign({}, propRefs.interchanges || {}, rawInterchanges) : rawInterchanges;
                propSetters.setInterchanges(cloneForPage(finalIc));
                matchedHooks.push('setter:setInterchanges');
                updatedCount++;
            }
            if (propSetters.setLineGroups && !isAppend) {
                propSetters.setLineGroups(cloneForPage({}));
                matchedHooks.push('setter:setLineGroups');
                updatedCount++;
            }
            if (propSetters.setMeta) {
                const nextMeta = Object.assign({}, propRefs.meta || {}, payload.meta);
                if (targetSystemNumStr !== undefined && targetSystemNumStr !== null) {
                    nextMeta.systemNumStr = String(targetSystemNumStr);
                }
                propSetters.setMeta(cloneForPage(nextMeta));
                matchedHooks.push('setter:setMeta');
                updatedCount++;
            }
        } else {
            const nextStationsPayload = cloneForPage(rawStations);
            const nextLinesPayload = cloneForPage(rawLines);
            const nextInterchangesPayload = cloneForPage(rawInterchanges);

            const targetFibers = editorFiber ? [editorFiber, ...allFibers.filter(f => f !== editorFiber)] : allFibers;
            const dispatchedQueues = new Set();

            for (const fiber of targetFibers) {
                let hook = fiber.memoizedState;
                let guard = 0;
                while (hook && guard++ < 150) {
                    if (isSafeUseStateHook(hook) && !dispatchedQueues.has(hook.queue)) {
                        const state = hook.memoizedState;
                        if (state && typeof state === 'object' && !Array.isArray(state)) {
                            if (state.map && typeof state.map === 'object' && state.map.lines && state.meta) {
                                const mergedStations = isAppend
                                    ? Object.assign({}, state.map.stations, nextStationsPayload)
                                    : nextStationsPayload;
                                const mergedLines = cleanLines(
                                    isAppend
                                        ? Object.assign({}, state.map.lines, nextLinesPayload)
                                        : nextLinesPayload
                                );
                                const nextMeta = Object.assign({}, state.meta, payload.meta);
                                if (targetSystemNumStr !== undefined && targetSystemNumStr !== null) {
                                    nextMeta.systemNumStr = String(targetSystemNumStr);
                                }
                                hook.queue.dispatch(cloneForPage(Object.assign({}, state, {
                                    map: Object.assign({}, state.map, {
                                        stations: mergedStations,
                                        lines: mergedLines,
                                        interchanges: isAppend
                                            ? Object.assign({}, state.map.interchanges, nextInterchangesPayload)
                                            : nextInterchangesPayload,
                                        lineGroups: isAppend ? (state.map.lineGroups || {}) : {}
                                    }),
                                    meta: nextMeta
                                })));
                                dispatchedQueues.add(hook.queue);
                                updatedCount++;
                                matchedHooks.push('composite_fullSystem');
                            } else if ('stations' in state && 'lines' in state && isLinesDictionary(state.lines)) {
                                const mergedStations = isAppend
                                    ? Object.assign({}, state.stations, nextStationsPayload)
                                    : nextStationsPayload;
                                const mergedLines = cleanLines(
                                    isAppend
                                        ? Object.assign({}, state.lines, nextLinesPayload)
                                        : nextLinesPayload
                                );
                                hook.queue.dispatch(cloneForPage(Object.assign({}, state, {
                                    stations: mergedStations,
                                    lines: mergedLines,
                                    interchanges: isAppend
                                        ? Object.assign({}, state.interchanges, nextInterchangesPayload)
                                        : nextInterchangesPayload,
                                    lineGroups: isAppend ? (state.lineGroups || {}) : {}
                                })));
                                dispatchedQueues.add(hook.queue);
                                updatedCount++;
                                matchedHooks.push('composite_map');
                            } else if ((propRefs.lines && state === propRefs.lines) || isLinesDictionary(state)) {
                                hook.queue.dispatch(cloneForPage(
                                    cleanLines(
                                        isAppend
                                            ? Object.assign({}, state, nextLinesPayload)
                                            : nextLinesPayload
                                    )
                                ));
                                dispatchedQueues.add(hook.queue);
                                updatedCount++;
                                matchedHooks.push('lines');
                            } else if ((propRefs.stations && state === propRefs.stations) || isNonEmptyStationsDictionary(state)) {
                                hook.queue.dispatch(cloneForPage(
                                    isAppend
                                        ? Object.assign({}, state, nextStationsPayload)
                                        : nextStationsPayload
                                ));
                                dispatchedQueues.add(hook.queue);
                                updatedCount++;
                                matchedHooks.push('stations');
                            } else if (propRefs.interchanges && state === propRefs.interchanges) {
                                hook.queue.dispatch(cloneForPage(
                                    isAppend
                                        ? Object.assign({}, state, nextInterchangesPayload)
                                        : nextInterchangesPayload
                                ));
                                dispatchedQueues.add(hook.queue);
                                updatedCount++;
                                matchedHooks.push('interchanges');
                            } else if (propRefs.lineGroups && state === propRefs.lineGroups && !isAppend) {
                                hook.queue.dispatch(cloneForPage({}));
                                dispatchedQueues.add(hook.queue);
                                updatedCount++;
                                matchedHooks.push('lineGroups');
                            } else if ((propRefs.meta && state === propRefs.meta) || ('nextStationId' in state && 'nextLineId' in state)) {
                                const nextMeta = Object.assign({}, state, payload.meta);
                                if (targetSystemNumStr !== undefined && targetSystemNumStr !== null) {
                                    nextMeta.systemNumStr = String(targetSystemNumStr);
                                }
                                hook.queue.dispatch(cloneForPage(nextMeta));
                                dispatchedQueues.add(hook.queue);
                                updatedCount++;
                                matchedHooks.push('meta');
                            }
                        }
                    }
                    hook = hook.next;
                }
            }
        }

        if (mapboxInstance && payload.bounds) {
            try {
                mapboxInstance.fitBounds(cloneForPage(payload.bounds), cloneForPage({ padding: 60, maxZoom: 15, duration: 1000 }));
            } catch (e) {}
        }

        mdLog('LIVE_INJECT', 'React injection finished', {
            updatedCount,
            matchedHooks,
            targetSystemNumStr,
            mergeMode: payload.mergeMode
        });

        syncEditorSelectionAndUnsavedFlag(payload);

        return { updatedCount, matchedHooks, systemNumStr: targetSystemNumStr, systemsCreated: userDoc?.systemsCreated };
    }

    function bumpSystemNumStr(delta = 1) {
        const info = inspectMetroDreaminFiber();
        if (!info || !info.metaHook) {
            throw new Error(t('errNoMetaHook'));
        }
        const currMeta = info.metaHook.memoizedState || {};
        const currNum = parseInt(currMeta.systemNumStr ?? info.userDoc?.systemsCreated ?? '0', 10);
        const nextNumStr = String((isNaN(currNum) ? 0 : currNum) + delta);
        info.metaHook.queue.dispatch(cloneForPage(Object.assign({}, currMeta, { systemNumStr: nextNumStr })));
        mdLog('SLOT_BUMP', `Slot systemNumStr changed: ${currMeta.systemNumStr} -> ${nextNumStr}`);
        return nextNumStr;
    }

    // Auto-bump slot if saving a brand-new map hits an existing Firestore slot collision (Firefox Xray-safe)
    let lastBumpTimestamp = 0;
    try {
        const origConsoleError = pageWin.console.error;
        if (typeof origConsoleError === 'function') {
            pageWin.console.error = exportFnToPage(function (...args) {
                origConsoleError.apply(this, args);
                try {
                    const msg = args.map(a => String(a)).join(' ');
                    const now = Date.now();
                    if (now - lastBumpTimestamp < 3000) return;
                    if (msg.includes('isNew and systemSnap.exists() must not be the same') && pageWin.location.pathname.includes('/edit/new')) {
                        lastBumpTimestamp = now;
                        const newSlot = bumpSystemNumStr(1);
                        const slotInput = document.getElementById('md-imp-slot');
                        if (slotInput) slotInput.value = newSlot;
                    }
                } catch (e) {}
            });
        }
    } catch (e) {}

    function checkPendingAutoLiveImport() {
        const raw = sessionStorage.getItem(AUTO_IMPORT_KEY);
        if (!raw) return;
        let attempts = 0;
        const timer = setInterval(() => {
            attempts++;
            const info = inspectMetroDreaminFiber();
            if (info && info.editorFiber && info.mapboxInstance) {
                clearInterval(timer);
                sessionStorage.removeItem(AUTO_IMPORT_KEY);
                try {
                    const payload = JSON.parse(raw);
                    mdLog('AUTO_IMPORT_RUN', 'Editor & Mapbox ready after reload — running Live Import');
                    injectIntoReactLive(payload, payload.customSlot || null);
                } catch (e) {
                    mdLog('AUTO_IMPORT_ERR', e.message);
                }
            } else if (attempts > 40) {
                clearInterval(timer);
                sessionStorage.removeItem(AUTO_IMPORT_KEY);
            }
        }, 300);
    }

    // =========================================================================
    // PART 5. USER INTERFACE (EDITOR-ONLY + EN / RU LANGUAGE SWITCHER)
    // =========================================================================
    function isEditorPage() {
        return pageWin.location.pathname.startsWith('/edit') || Boolean(document.querySelector('main.Edit'));
    }

    function readNonNegativeNumber(inputEl, fallbackVal) {
        if (!inputEl) return fallbackVal;
        const raw = String(inputEl.value).trim();
        if (raw === '') return fallbackVal;
        const num = Number(raw);
        return Number.isFinite(num) ? Math.max(0, num) : fallbackVal;
    }

    function syncUIVisibility() {
        const btn = document.getElementById('md-universal-import-btn');
        const backdrop = document.getElementById('md-universal-modal-backdrop');
        const onEditor = isEditorPage();

        if (!onEditor) {
            if (btn) btn.style.display = 'none';
            if (backdrop) backdrop.style.display = 'none';
            return;
        }
        if (btn) {
            btn.style.display = 'inline-flex';
        } else {
            createUI();
        }
    }

    function createUI() {
        if (!isEditorPage()) return;
        if (document.getElementById('md-universal-import-btn')) return;

        const headerRight = document.querySelector('.Header-right') || document.querySelector('.Header');
        if (!headerRight) return;

        const btn = document.createElement('button');
        btn.id = 'md-universal-import-btn';
        btn.type = 'button';
        btn.textContent = t('headerBtn');
        btn.style.cssText = `
            background: linear-gradient(135deg, #3182ce, #2b6cb0);
            color: #fff;
            border: none;
            border-radius: 6px;
            padding: 7px 13px;
            margin-right: 10px;
            font-size: 13px;
            font-weight: 700;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 6px;
            box-shadow: 0 2px 8px rgba(49,130,206,0.35);
        `;
        btn.onclick = () => {
            const backdrop = document.getElementById('md-universal-modal-backdrop');
            if (!backdrop) return;
            backdrop.style.display = 'flex';
            try {
                const info = inspectMetroDreaminFiber();
                const urlSlot = getUrlSystemNumStr();
                const currentSlot = urlSlot ?? info?.propRefs?.meta?.systemNumStr ?? '';
                const slotInput = document.getElementById('md-imp-slot');
                if (slotInput && currentSlot !== '') slotInput.value = currentSlot;
            } catch (e) {}
        };
        headerRight.prepend(btn);

        let backdrop = document.getElementById('md-universal-modal-backdrop');
        if (backdrop) return;

        backdrop = document.createElement('div');
        backdrop.id = 'md-universal-modal-backdrop';
        backdrop.style.cssText = `
            display: none;
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.75);
            z-index: 999999;
            align-items: center;
            justify-content: center;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        `;

        backdrop.innerHTML = `
            <div style="background: #1e1f24; color: #f1f1f1; width: 600px; max-width: 95vw; border-radius: 12px; padding: 22px; box-shadow: 0 12px 40px rgba(0,0,0,0.65); border: 1px solid #343640;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; gap:10px;">
                    <h3 id="md-ui-title" style="margin:0; font-size:17px;"></h3>
                    <div style="display:flex; align-items:center; gap:8px;">
                        <button id="md-imp-lang-toggle" type="button" style="background:#2d3748; color:#e2e8f0; border:1px solid #4a5568; border-radius:6px; padding:4px 9px; font-size:12px; font-weight:700; cursor:pointer;"></button>
                        <button id="md-imp-close" type="button" style="background:none; border:none; color:#aaa; font-size:22px; cursor:pointer; line-height:1;">&times;</button>
                    </div>
                </div>

                <div id="md-ui-intro" style="font-size:12.5px; color:#bbb; margin-bottom:12px; line-height:1.45;"></div>

                <div style="margin-bottom:12px;">
                    <label id="md-ui-file-label" style="display:block; font-size:12px; color:#999; margin-bottom:5px;"></label>
                    <input type="file" id="md-imp-file" accept=".geojson,.json,.kml,.gpx" style="width:100%; box-sizing:border-box; background:#2a2c33; color:#fff; padding:8px; border-radius:6px; border:1px solid #444;" />
                </div>

                <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom:12px;">
                    <div>
                        <label id="md-ui-mode-label" style="display:block; font-size:12px; color:#999; margin-bottom:4px;"></label>
                        <select id="md-imp-mode" style="width:100%; background:#2a2c33; color:#fff; padding:7px; border-radius:6px; border:1px solid #444;">
                            <option value="AUTO" data-i18n="modeAuto"></option>
                            <option value="RAPID" data-i18n="modeRapid"></option>
                            <option value="TRAM" data-i18n="modeTram"></option>
                            <option value="LIGHT" data-i18n="modeLight"></option>
                            <option value="BRT" data-i18n="modeBrt"></option>
                            <option value="BUS" data-i18n="modeBus"></option>
                            <option value="COMMUTER" data-i18n="modeCommuter"></option>
                            <option value="GONDOLA" data-i18n="modeGondola"></option>
                            <option value="FERRY" data-i18n="modeFerry"></option>
                        </select>
                    </div>
                    <div>
                        <label id="md-ui-vertex-label" style="display:block; font-size:12px; color:#999; margin-bottom:4px;"></label>
                        <select id="md-imp-vertex-mode" style="width:100%; background:#2a2c33; color:#fff; padding:7px; border-radius:6px; border:1px solid #444;">
                            <option value="auto" data-i18n="vertexAuto"></option>
                            <option value="waypoints" data-i18n="vertexWaypoints"></option>
                            <option value="stations" data-i18n="vertexStations"></option>
                        </select>
                    </div>
                </div>

                <div style="display:grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 8px; margin-bottom:12px;">
                    <div>
                        <label id="md-ui-snap-label" style="display:block; font-size:11px; color:#999; margin-bottom:4px;"></label>
                        <input type="number" id="md-imp-snap" value="80" min="0" max="2000" style="width:100%; box-sizing:border-box; background:#2a2c33; color:#fff; padding:6px; border-radius:6px; border:1px solid #444;" />
                    </div>
                    <div>
                        <label id="md-ui-vreplace-label" style="display:block; font-size:11px; color:#999; margin-bottom:4px;"></label>
                        <input type="number" id="md-imp-vreplace" value="40" min="0" max="500" style="width:100%; box-sizing:border-box; background:#2a2c33; color:#fff; padding:6px; border-radius:6px; border:1px solid #444;" />
                    </div>
                    <div>
                        <label id="md-ui-merge-label" style="display:block; font-size:11px; color:#999; margin-bottom:4px;"></label>
                        <input type="number" id="md-imp-merge" value="25" min="0" max="300" style="width:100%; box-sizing:border-box; background:#2a2c33; color:#fff; padding:6px; border-radius:6px; border:1px solid #444;" />
                    </div>
                    <div>
                        <label id="md-ui-interchange-label" style="display:block; font-size:11px; color:#999; margin-bottom:4px;"></label>
                        <input type="number" id="md-imp-interchange" value="100" min="0" max="500" style="width:100%; box-sizing:border-box; background:#2a2c33; color:#fff; padding:6px; border-radius:6px; border:1px solid #444;" />
                    </div>
                </div>

                <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom:14px;">
                    <div>
                        <label id="md-ui-orphans-label" style="display:block; font-size:11px; color:#999; margin-bottom:4px;"></label>
                        <select id="md-imp-orphans" style="width:100%; background:#2a2c33; color:#fff; padding:6px; border-radius:6px; border:1px solid #444;">
                            <option value="remove" data-i18n="orphansRemove"></option>
                            <option value="line" data-i18n="orphansLine"></option>
                        </select>
                    </div>
                    <div>
                        <label id="md-ui-slot-label" style="display:block; font-size:11px; color:#999; margin-bottom:4px;"></label>
                        <div style="display:flex; gap:6px;">
                            <input type="text" id="md-imp-slot" style="width:100%; box-sizing:border-box; background:#2a2c33; color:#fff; padding:6px; border-radius:6px; border:1px solid #444;" />
                            <button id="md-imp-bump-slot" type="button" style="background:#4a5568; color:#fff; border:none; border-radius:6px; padding:0 10px; cursor:pointer; font-weight:700; white-space:nowrap;"></button>
                        </div>
                    </div>
                </div>

                <div style="margin-bottom:14px;">
                    <label id="md-ui-mergemode-label" style="display:block; font-size:12px; color:#999; margin-bottom:4px;"></label>
                    <select id="md-imp-mergemode" style="width:100%; background:#2a2c33; color:#fff; padding:7px; border-radius:6px; border:1px solid #444;">
                        <option value="replace" data-i18n="mergeReplace"></option>
                        <option value="append" data-i18n="mergeAppend"></option>
                    </select>
                </div>

                <div id="md-imp-status" style="background:#141519; color:#8dc572; padding:10px; border-radius:6px; font-size:12px; margin-bottom:14px; display:none; white-space:pre-wrap; max-height:135px; overflow-y:auto;"></div>

                <div style="display:flex; flex-wrap:wrap; gap:8px; justify-content:space-between; align-items:center;">
                    <div style="display:flex; gap:6px;">
                        <button id="md-imp-btn-debug" type="button" style="background:#805ad5; color:#fff; border:none; padding:8px 11px; border-radius:6px; font-size:12px; font-weight:600; cursor:pointer;"></button>
                        <button id="md-imp-btn-json" type="button" style="background:#3a3d48; color:#fff; border:none; padding:8px 11px; border-radius:6px; font-size:12px; cursor:pointer;"></button>
                    </div>
                    <div style="display:flex; gap:8px;">
                        <button id="md-imp-btn-reload" type="button" style="background:#2b6cb0; color:#fff; border:none; padding:9px 13px; border-radius:6px; font-size:12px; font-weight:600; cursor:pointer;"></button>
                        <button id="md-imp-btn-live" type="button" style="background:#2f855a; color:#fff; border:none; padding:9px 15px; border-radius:6px; font-size:13px; font-weight:700; cursor:pointer;"></button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(backdrop);

        const statusBox = backdrop.querySelector('#md-imp-status');
        const debugBtn = backdrop.querySelector('#md-imp-btn-debug');

        function applyTranslations() {
            const currentBtn = document.getElementById('md-universal-import-btn');
            if (currentBtn) currentBtn.textContent = t('headerBtn');
            backdrop.querySelector('#md-ui-title').textContent = t('modalTitle');
            const langBtn = backdrop.querySelector('#md-imp-lang-toggle');
            langBtn.textContent = currentLang === 'en' ? '🌐 EN → RU' : '🌐 RU → EN';
            langBtn.title = t('langToggleTitle');
            backdrop.querySelector('#md-ui-intro').innerHTML = t('introDesc');
            backdrop.querySelector('#md-ui-file-label').textContent = t('fileLabel');
            backdrop.querySelector('#md-ui-mode-label').textContent = t('modeLabel');
            backdrop.querySelector('#md-ui-vertex-label').textContent = t('vertexModeLabel');
            backdrop.querySelector('#md-ui-snap-label').textContent = t('snapLabel');
            backdrop.querySelector('#md-ui-vreplace-label').textContent = t('vreplaceLabel');
            backdrop.querySelector('#md-ui-merge-label').textContent = t('mergeLabel');
            backdrop.querySelector('#md-ui-interchange-label').textContent = t('interchangeLabel');
            backdrop.querySelector('#md-ui-orphans-label').textContent = t('orphansLabel');
            backdrop.querySelector('#md-ui-slot-label').textContent = t('slotLabel');
            backdrop.querySelector('#md-imp-slot').placeholder = t('slotPlaceholder');
            const bumpBtn = backdrop.querySelector('#md-imp-bump-slot');
            bumpBtn.textContent = t('slotBumpBtn');
            bumpBtn.title = t('slotBumpTitle');
            backdrop.querySelector('#md-ui-mergemode-label').textContent = t('mergeModeLabel');

            backdrop.querySelectorAll('[data-i18n]').forEach(el => {
                el.textContent = t(el.getAttribute('data-i18n'));
            });

            debugBtn.textContent = `${t('btnDebug')} (${debugHistory.length})`;
            debugBtn.title = t('btnDebugTitle');
            backdrop.querySelector('#md-imp-btn-json').textContent = t('btnJson');
            const reloadBtn = backdrop.querySelector('#md-imp-btn-reload');
            reloadBtn.textContent = t('btnReload');
            reloadBtn.title = t('btnReloadTitle');
            backdrop.querySelector('#md-imp-btn-live').textContent = t('btnLive');
        }

        applyTranslations();

        backdrop.querySelector('#md-imp-lang-toggle').onclick = () => {
            currentLang = currentLang === 'en' ? 'ru' : 'en';
            try { localStorage.setItem(LANG_STORAGE_KEY, currentLang); } catch (e) {}
            applyTranslations();
            const fileInput = backdrop.querySelector('#md-imp-file');
            if (fileInput.files && fileInput.files[0]) {
                parseSelectedFile().catch(err => showStatus(err.message, true));
            }
        };

        const showStatus = (msg, isError = false) => {
            statusBox.style.display = 'block';
            statusBox.style.color = isError ? '#ff7b7b' : '#8dc572';
            statusBox.textContent = msg;
            debugBtn.textContent = `${t('btnDebug')} (${debugHistory.length})`;
        };

        backdrop.querySelector('#md-imp-close').onclick = () => {
            backdrop.style.display = 'none';
        };

        debugBtn.onclick = () => {
            downloadDebugLog();
        };

        backdrop.querySelector('#md-imp-bump-slot').onclick = () => {
            try {
                const newSlot = bumpSystemNumStr(1);
                backdrop.querySelector('#md-imp-slot').value = newSlot;
                showStatus(t('statusSlotBumped', newSlot));
            } catch (err) {
                showStatus(t('statusErr', err.message), true);
            }
        };

        async function parseSelectedFile() {
            const fileInput = backdrop.querySelector('#md-imp-file');
            if (!fileInput.files || !fileInput.files[0]) {
                throw new Error(t('errNoFile'));
            }
            const file = fileInput.files[0];
            const text = await file.text();
            const ext = file.name.toLowerCase();

            let parsed;
            if (ext.endsWith('.kml') || (text.trim().startsWith('<?xml') && text.includes('<kml')) || text.includes('<kml')) {
                parsed = parseKML(text);
            } else if (ext.endsWith('.gpx') || text.includes('<gpx')) {
                parsed = parseGPX(text);
            } else {
                parsed = parseGeoJSON(text);
            }

            mdLog('PARSE', 'File parsed', {
                fileSize: file.size,
                hasTitle: Boolean(parsed.title),
                rawPointsCount: parsed.rawPoints.length,
                rawLinesCount: parsed.rawLines.length
            });

            let mergeMode = backdrop.querySelector('#md-imp-mergemode').value;
            const info = inspectMetroDreaminFiber();

            if (mergeMode === 'append' && info && !info.hasNonEmptyExistingLines) {
                mdLog('APPEND_FALLBACK', 'Current map is empty — falling back to replace mode (0-based IDs)');
                mergeMode = 'replace';
            }

            const currentMeta = info?.propRefs?.meta || pageWin.__NEXT_DATA__?.props?.pageProps?.fullSystem?.meta || null;
            const existingMap = info ? {
                stations: info.propRefs?.stations,
                lines: info.propRefs?.lines,
                interchanges: info.propRefs?.interchanges
            } : null;

            const systemPayload = buildMetroDreaminSystem(
                parsed,
                {
                    snapRadiusM: readNonNegativeNumber(backdrop.querySelector('#md-imp-snap'), 80),
                    vertexReplaceM: readNonNegativeNumber(backdrop.querySelector('#md-imp-vreplace'), 40),
                    mergeStationM: readNonNegativeNumber(backdrop.querySelector('#md-imp-merge'), 25),
                    interchangeRadiusM: readNonNegativeNumber(backdrop.querySelector('#md-imp-interchange'), 100),
                    vertexMode: backdrop.querySelector('#md-imp-vertex-mode').value,
                    defaultMode: backdrop.querySelector('#md-imp-mode').value,
                    orphanPolicy: backdrop.querySelector('#md-imp-orphans').value
                },
                mergeMode === 'append' ? currentMeta : null,
                mergeMode === 'append' ? existingMap : null
            );

            systemPayload.mergeMode = mergeMode;
            systemPayload.customSlot = backdrop.querySelector('#md-imp-slot').value.trim() || null;

            const stValues = Object.values(systemPayload.map.stations);
            const realStations = stValues.filter(s => !s.isWaypoint).length;
            const waypoints = stValues.filter(s => s.isWaypoint).length;
            const numLines = Object.keys(systemPayload.map.lines).length;
            const numInterchanges = Object.keys(systemPayload.map.interchanges || {}).length;

            showStatus(t('statusParsed', numLines, realStations, waypoints, numInterchanges, systemPayload.removedOrphansCount));

            return systemPayload;
        }

        // Refresh preview automatically when file or any builder parameter changes
        const refreshPreviewIds = [
            '#md-imp-file', '#md-imp-mode', '#md-imp-vertex-mode',
            '#md-imp-snap', '#md-imp-vreplace', '#md-imp-merge',
            '#md-imp-interchange', '#md-imp-orphans', '#md-imp-mergemode'
        ];
        refreshPreviewIds.forEach(sel => {
            const el = backdrop.querySelector(sel);
            if (!el) return;
            el.addEventListener('change', () => {
                const fileInput = backdrop.querySelector('#md-imp-file');
                if (fileInput.files && fileInput.files[0]) {
                    parseSelectedFile().catch(err => showStatus(err.message, true));
                }
            });
        });

        backdrop.querySelector('#md-imp-btn-live').onclick = async () => {
            try {
                const payload = await parseSelectedFile();
                const res = injectIntoReactLive(payload, payload.customSlot);
                if (res.systemNumStr !== undefined && res.systemNumStr !== null) {
                    backdrop.querySelector('#md-imp-slot').value = res.systemNumStr;
                }
                showStatus(t('statusLiveDone', res.updatedCount, res.matchedHooks, res.systemNumStr));
            } catch (err) {
                mdLog('LIVE_IMPORT_ERR', err.message, { stack: err.stack });
                showStatus(t('statusLiveErr', err.message), true);
            }
        };

        backdrop.querySelector('#md-imp-btn-reload').onclick = async () => {
            try {
                const payload = await parseSelectedFile();
                sessionStorage.setItem(AUTO_IMPORT_KEY, JSON.stringify(payload));
                mdLog('AUTO_IMPORT_QUEUED', 'Payload queued for auto-injection after reload', {
                    customSlot: payload.customSlot
                });
                showStatus(t('statusReloading'));
                setTimeout(() => pageWin.location.reload(), 200);
            } catch (err) {
                showStatus(t('statusErr', err.message), true);
            }
        };

        backdrop.querySelector('#md-imp-btn-json').onclick = async () => {
            try {
                const payload = await parseSelectedFile();
                downloadJsonBlob(payload, `metrodreamin-import-${Date.now()}.json`);
            } catch (err) {
                showStatus(t('statusErr', err.message), true);
            }
        };
    }

    function initUIObserver() {
        syncUIVisibility();
        checkPendingAutoLiveImport();
        const obs = new MutationObserver(() => {
            syncUIVisibility();
        });
        if (document.documentElement) {
            obs.observe(document.documentElement, { childList: true, subtree: true });
        }
    }

    if (document.readyState === 'loading') {
        window.addEventListener('DOMContentLoaded', initUIObserver);
    } else {
        initUIObserver();
    }
})();
