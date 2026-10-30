// Interim vector pictograms for the remote surfaces (desktop app, editor, mobile):
// one <svg> per scene with the object's name and detail written in. Pure.
import { label, sceneHex, verb } from './pictograms.mjs'

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
const cut = (s, n) => ([...String(s ?? '')].length > n ? [...String(s)].slice(0, n - 1).join('') + '…' : String(s ?? ''))
const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace'
const G = '#9a9a9a'

function shape(scene, c, running) {
  const pulse = running ? `<animate attributeName="opacity" values="1;0.45;1" dur="1.4s" repeatCount="indefinite"/>` : ''
  switch (scene) {
    case 'database': return `<g><ellipse cx="70" cy="48" rx="44" ry="12" fill="${c}" fill-opacity=".35" stroke="${c}" stroke-width="3"/><path d="M26 48v62c0 7 20 12 44 12s44-5 44-12V48" fill="${c}" fill-opacity=".15" stroke="${c}" stroke-width="3"/><path d="M26 79c0 7 20 12 44 12s44-5 44-12" fill="none" stroke="${c}" stroke-width="2" stroke-opacity=".6"/>${pulse}</g>`
    case 'api': return `<g><rect x="24" y="40" width="92" height="80" rx="10" fill="${c}" fill-opacity=".15" stroke="${c}" stroke-width="3"/><circle cx="40" cy="58" r="4" fill="${c}"/><circle cx="54" cy="58" r="4" fill="${c}" fill-opacity=".5"/><circle cx="40" cy="80" r="4" fill="${c}" fill-opacity=".5"/><circle cx="54" cy="80" r="4" fill="${c}"/><path d="M116 70h40" stroke="${c}" stroke-width="4" stroke-linecap="round"/><path d="M150 62l10 8-10 8" fill="none" stroke="${c}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>${pulse}</g>`
    case 'frontend': return `<g><rect x="20" y="36" width="110" height="84" rx="10" fill="${c}" fill-opacity=".12" stroke="${c}" stroke-width="3"/><path d="M20 56h110" stroke="${c}" stroke-width="2"/><circle cx="34" cy="46" r="3.5" fill="${c}"/><circle cx="46" cy="46" r="3.5" fill="${c}" fill-opacity=".6"/><circle cx="58" cy="46" r="3.5" fill="${c}" fill-opacity=".3"/><rect x="34" y="68" width="60" height="22" rx="6" fill="${c}" fill-opacity=".5"/><rect x="34" y="98" width="82" height="8" rx="4" fill="${G}" fill-opacity=".5"/>${pulse}</g>`
    case 'tests': return `<g><path d="M58 36h28v34l24 44c3 6-1 12-8 12H42c-7 0-11-6-8-12l24-44z" fill="${c}" fill-opacity=".2" stroke="${c}" stroke-width="3" stroke-linejoin="round"/><path d="M50 98h44" stroke="${c}" stroke-width="2" stroke-opacity=".6"/><circle cx="64" cy="108" r="4" fill="${c}"><animate attributeName="cy" values="112;92;112" dur="1.6s" repeatCount="indefinite"/></circle><circle cx="80" cy="104" r="3" fill="${c}"><animate attributeName="cy" values="110;96;110" dur="1.2s" repeatCount="indefinite"/></circle></g>`
    case 'git': return `<g stroke="${c}" stroke-width="3" fill="none"><path d="M30 60h90"/><path d="M60 60c0 20 10 30 30 40h20"/><circle cx="30" cy="60" r="7" fill="${c}"/><circle cx="60" cy="60" r="7" fill="${c}"/><circle cx="90" cy="60" r="7" fill="${c}"/><circle cx="120" cy="60" r="8" fill="${c}">${pulse}</circle><circle cx="110" cy="100" r="7" fill="${c}" fill-opacity=".6"/></g>`
    case 'deps': return `<g><path d="M30 60l40-18 40 18v48l-40 18-40-18z" fill="${c}" fill-opacity=".2" stroke="${c}" stroke-width="3" stroke-linejoin="round"/><path d="M30 60l40 18 40-18M70 78v48" fill="none" stroke="${c}" stroke-width="3"/>${pulse}</g>`
    case 'infra': return `<g>${[0, 1, 2].map(i => `<rect x="${28 + i * 34}" y="44" width="28" height="28" rx="4" fill="${c}" fill-opacity=".3" stroke="${c}" stroke-width="3"/>`).join('')}<path d="M20 86c0 18 16 30 50 30s50-12 50-30z" fill="${c}" fill-opacity=".2" stroke="${c}" stroke-width="3"/><path d="M14 124q12-8 24 0t24 0 24 0 24 0 24 0" fill="none" stroke="${c}" stroke-width="2"><animate attributeName="d" values="M14 124q12-8 24 0t24 0 24 0 24 0 24 0;M14 124q12 8 24 0t24 0 24 0 24 0 24 0;M14 124q12-8 24 0t24 0 24 0 24 0 24 0" dur="2s" repeatCount="indefinite"/></path></g>`
    case 'config': return `<g><rect x="22" y="40" width="108" height="76" rx="10" fill="${c}" fill-opacity=".12" stroke="${c}" stroke-width="3"/>${[0, 1, 2].map(i => `<path d="M38 ${58 + i * 20}h76" stroke="${G}" stroke-width="3" stroke-linecap="round"/><circle cx="${60 + i * 22}" cy="${58 + i * 20}" r="6" fill="${c}"/>`).join('')}${pulse}</g>`
    case 'docs': return `<g><path d="M40 36h50l24 24v62H40z" fill="${c}" fill-opacity=".15" stroke="${c}" stroke-width="3" stroke-linejoin="round"/><path d="M90 36v24h24" fill="none" stroke="${c}" stroke-width="3"/>${[0, 1, 2, 3].map(i => `<path d="M52 ${74 + i * 11}h${i === 3 ? 24 : 48}" stroke="${G}" stroke-width="3" stroke-linecap="round"/>`).join('')}${pulse}</g>`
    case 'auth': return `<g><path d="M50 72V58a22 22 0 0 1 44 0v14" fill="none" stroke="${c}" stroke-width="4"/><rect x="36" y="72" width="72" height="52" rx="10" fill="${c}" fill-opacity=".25" stroke="${c}" stroke-width="3"/><circle cx="72" cy="94" r="6" fill="${c}"/><path d="M72 100v12" stroke="${c}" stroke-width="4" stroke-linecap="round"/>${pulse}</g>`
    case 'build': return `<g><rect x="60" y="56" width="52" height="44" rx="8" fill="${c}" fill-opacity=".2" stroke="${c}" stroke-width="3"/><path d="M20 78h28M122 78h28" stroke="${c}" stroke-width="4" stroke-linecap="round"/><path d="M140 70l10 8-10 8" fill="none" stroke="${c}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><g fill="${c}"><circle cx="26" cy="78" r="5"><animate attributeName="cx" values="22;46;22" dur="1.6s" repeatCount="indefinite"/></circle></g></g>`
    case 'agents': return `<g>${[0, 1, 2].map(i => `<rect x="${24 + i * 40}" y="52" width="30" height="34" rx="8" fill="${c}" fill-opacity=".25" stroke="${c}" stroke-width="3"/><circle cx="${33 + i * 40}" cy="66" r="3.5" fill="${c}"/><circle cx="${45 + i * 40}" cy="66" r="3.5" fill="${c}"/><path d="M${33 + i * 40} 76h12" stroke="${c}" stroke-width="2.5" stroke-linecap="round"/><path d="M${39 + i * 40} 52v-10" stroke="${c}" stroke-width="3"/>`).join('')}${pulse}</g>`
    case 'explore': return `<g><circle cx="64" cy="70" r="28" fill="${c}" fill-opacity=".12" stroke="${c}" stroke-width="4"/><path d="M84 90l30 30" stroke="${c}" stroke-width="7" stroke-linecap="round"/>${pulse}</g>`
    case 'shell': return `<g><rect x="22" y="44" width="110" height="72" rx="10" fill="${c}" fill-opacity=".15" stroke="${c}" stroke-width="3"/><path d="M38 66l14 10-14 10" fill="none" stroke="${c}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><rect x="60" y="84" width="22" height="4" fill="${c}"><animate attributeName="opacity" values="1;0;1" dur="1s" repeatCount="indefinite"/></rect></g>`
    case 'think': return `<g><path d="M72 32a30 30 0 0 0-18 54v10h36V86a30 30 0 0 0-18-54z" fill="${c}" fill-opacity=".3" stroke="${c}" stroke-width="3"/><rect x="58" y="100" width="28" height="8" rx="3" fill="${c}"/><rect x="62" y="112" width="20" height="6" rx="3" fill="${c}" fill-opacity=".6"/><path d="M60 52l-6-6M84 52l6-6M72 42v-8" stroke="${c}" stroke-width="3" stroke-linecap="round">${pulse}</path></g>`
    case 'code': return `<g><rect x="30" y="40" width="88" height="80" rx="10" fill="${c}" fill-opacity=".12" stroke="${c}" stroke-width="3"/><text x="74" y="92" text-anchor="middle" font-family="${MONO}" font-size="34" font-weight="700" fill="${c}">{ }</text>${pulse}</g>`
    default: return `<g><circle cx="72" cy="80" r="10" fill="none" stroke="${c}" stroke-width="3" stroke-dasharray="6 6"><animateTransform attributeName="transform" type="rotate" from="0 72 80" to="360 72 80" dur="6s" repeatCount="indefinite"/></circle><text x="100" y="56" font-family="${MONO}" font-size="16" fill="${c}">z</text><text x="110" y="46" font-family="${MONO}" font-size="20" fill="${c}">Z</text></g>`
  }
}

export function illustrate({ scene = 'idle', object = '', name = '', detail = '', status = '', running = false } = {}, { width = 320, height = 180 } = {}) {
  const c = sceneHex(scene)
  const badge = status === 'fail'
    ? `<g transform="translate(286 30)"><circle r="14" fill="#ff6b6b"/><path d="M-6-6l12 12M6-6l-12 12" stroke="#fff" stroke-width="3" stroke-linecap="round"/></g>`
    : status === 'done' && object
      ? `<g transform="translate(286 30)"><circle r="14" fill="#6fcf6f"/><path d="M-7 0l5 5 9-10" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></g>`
      : ''
  const doing = object || scene !== 'idle' ? verb(object, scene, running ? 'start' : status) : 'waiting for the agent'
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180" width="${width}" height="${height}" role="img">` +
    `<text x="166" y="48" font-family="${MONO}" font-size="12" fill="${G}">${esc(cut(label(scene), 22))}</text>` +
    `<text x="166" y="72" font-family="${MONO}" font-size="14" fill="${c}" font-weight="700">${esc(cut(doing, 20))}</text>` +
    `<text x="166" y="96" font-family="${MONO}" font-size="16" fill="${G}" font-weight="700">${esc(cut(name, 16))}</text>` +
    `<text x="166" y="118" font-family="${MONO}" font-size="11" fill="${G}" fill-opacity=".8">${esc(cut(detail, 24))}</text>` +
    shape(scene, c, running) + badge + `</svg>`
}
