/**
 * generate-report.ts
 * Reads vitest JSON output and generates a navigable HTML diagnostic dashboard.
 * Also creates a structured diagnostic-summary.json for programmatic access.
 *
 * Usage: bun run test:run --reporter=json --outputFile=test-reports/vitest.json && bun run src/test/generate-report.ts
 * Or: bun run test:diagnostic (runs both)
 */

import * as fs from 'fs';
import * as path from 'path';

// Vitest JSON output format types
interface VitestAssertionResult {
  fullName?: string;
  title?: string;
  status?: string;
  duration?: number;
  failureMessages?: string[];
  ancestorTitles?: string[];
}

interface VitestFileResult {
  name: string;
  assertionResults?: VitestAssertionResult[];
  status?: string;
  startTime?: number;
  endTime?: number;
}

interface VitestOutput {
  testResults?: VitestFileResult[];
  success?: boolean;
  numTotalTestSuites?: number;
  numPassedTestSuites?: number;
  numFailedTestSuites?: number;
  numTotalTests?: number;
  numPassedTests?: number;
  numFailedTests?: number;
  numPendingTests?: number;
  startTime?: number;
  successTime?: number;
}

interface DiagnosticTest {
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  file: string;
  module: string;
  category: string;
  severity: string;
  error?: { message: string; stack?: string };
}

interface DiagnosticSummary {
  timestamp: string;
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  passRate: number;
  byCategory: Record<string, { total: number; passed: number; failed: number }>;
  byModule: Record<string, { total: number; passed: number; failed: number }>;
  failedTests: DiagnosticTest[];
  slowTests: DiagnosticTest[];
}

interface DiagnosticReport {
  version: string;
  projectName: string;
  summary: DiagnosticSummary;
  tests: DiagnosticTest[];
}

function categorize(filePath: string): { module: string; category: string; severity: string } {
  const normalizedPath = filePath.replace(/\\/g, '/');
  if (normalizedPath.includes('/test/screens/')) return { module: extractName(filePath, '/screens/'), category: 'screens', severity: 'medium' };
  if (normalizedPath.includes('/test/integration/')) return { module: extractName(filePath, '/integration/'), category: 'integration', severity: 'high' };
  if (normalizedPath.includes('/test/components/')) return { module: extractName(filePath, '/components/'), category: 'components', severity: 'medium' };
  if (normalizedPath.includes('/test/hooks/')) return { module: extractName(filePath, '/hooks/'), category: 'hooks', severity: 'medium' };
  if (normalizedPath.includes('/test/unit/')) return { module: extractName(filePath, '/unit/'), category: 'unit', severity: 'low' };
  return { module: 'unknown', category: 'unknown', severity: 'info' };
}

function extractName(filePath: string, dir: string): string {
  const parts = filePath.split(dir);
  if (parts.length > 1) {
    const fileName = parts[1].split('/').pop() || '';
    return fileName.replace('.test.ts', '').replace('.test.tsx', '');
  }
  return 'unknown';
}

function flattenTests(files: VitestFileResult[]): DiagnosticTest[] {
  const tests: DiagnosticTest[] = [];
  for (const file of files) {
    const filePath = file.name || '';
    const { module, category, severity } = categorize(filePath);

    const results = file.assertionResults || [];
    for (const r of results) {
      const status = r.status === 'passed' ? 'passed'
        : r.status === 'failed' ? 'failed'
        : 'skipped';

      tests.push({
        name: r.title || r.fullName || 'unknown',
        status: status as DiagnosticTest['status'],
        duration: r.duration || 0,
        file: filePath,
        module,
        category,
        severity,
        error: r.status === 'failed' && r.failureMessages?.length ? {
          message: r.failureMessages[0] || 'Unknown error',
        } : undefined,
      });
    }
  }
  return tests;
}

function severityColor(s: string): string {
  const map: Record<string, string> = { critical: '#ef4444', high: '#f97316', medium: '#f59e0b', low: '#10b981', info: '#6b7280' };
  return map[s] || '#6b7280';
}

function statusBadge(status: string): string {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    passed: { bg: '#dcfce7', text: '#166534', label: 'PASS' },
    failed: { bg: '#fef2f2', text: '#991b1b', label: 'FAIL' },
    skipped: { bg: '#f3f4f6', text: '#374151', label: 'SKIP' },
  };
  const s = map[status] || map.skipped;
  return `<span style="background:${s.bg};color:${s.text};padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600">${s.label}</span>`;
}

function generateHTML(report: DiagnosticReport): string {
  const s = report.summary;
  const passRateColor = s.passRate >= 90 ? '#10b981' : s.passRate >= 70 ? '#f59e0b' : '#ef4444';

  const catRows = Object.entries(s.byCategory).map(([cat, data]) => {
    const pct = data.total > 0 ? ((data.passed / data.total) * 100).toFixed(1) : '0.0';
    const barColor = parseFloat(pct) >= 90 ? '#10b981' : parseFloat(pct) >= 70 ? '#f59e0b' : '#ef4444';
    return `<tr><td style="padding:8px 12px;font-weight:600;text-transform:capitalize">${cat}</td><td style="padding:8px 12px">${data.total}</td><td style="padding:8px 12px;color:#166534">${data.passed}</td><td style="padding:8px 12px;color:#991b1b">${data.failed}</td><td style="padding:8px 12px"><div style="display:flex;align-items:center;gap:8px"><div style="flex:1;height:8px;background:#e5e7eb;border-radius:4px;overflow:hidden"><div style="width:${pct}%;height:100%;background:${barColor};border-radius:4px"></div></div><span style="font-size:12px;font-weight:600">${pct}%</span></div></td></tr>`;
  }).join('');

  const modRows = Object.entries(s.byModule).map(([mod, data]) => {
    const pct = data.total > 0 ? ((data.passed / data.total) * 100).toFixed(1) : '0.0';
    const barColor = parseFloat(pct) >= 90 ? '#10b981' : parseFloat(pct) >= 70 ? '#f59e0b' : '#ef4444';
    return `<tr><td style="padding:8px 12px;font-weight:500;font-family:monospace;font-size:13px">${mod}</td><td style="padding:8px 12px">${data.total}</td><td style="padding:8px 12px;color:#166534">${data.passed}</td><td style="padding:8px 12px;color:#991b1b">${data.failed}</td><td style="padding:8px 12px"><div style="display:flex;align-items:center;gap:8px"><div style="flex:1;height:8px;background:#e5e7eb;border-radius:4px;overflow:hidden"><div style="width:${pct}%;height:100%;background:${barColor};border-radius:4px"></div></div><span style="font-size:12px;font-weight:600">${pct}%</span></div></td></tr>`;
  }).join('');

  const failedRows = s.failedTests.length > 0
    ? s.failedTests.map(t => `<tr><td style="padding:8px 12px;font-weight:500">${t.name}</td><td style="padding:8px 12px"><code style="font-size:12px;background:#f3f4f6;padding:2px 6px;border-radius:3px">${t.module}</code></td><td style="padding:8px 12px"><span style="font-size:11px;padding:2px 6px;border-radius:3px;background:${severityColor(t.severity)}20;color:${severityColor(t.severity)}">${t.severity}</span></td><td style="padding:8px 12px;color:#991b1b;font-size:12px;max-width:400px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${(t.error?.message || '').replace(/"/g, '&quot;')}">${t.error?.message || '-'}</td></tr>`).join('')
    : `<tr><td colspan="4" style="padding:16px;text-align:center;color:#10b981;font-weight:600">No hay tests fallando</td></tr>`;

  const slowRows = s.slowTests.length > 0
    ? s.slowTests.map(t => `<tr><td style="padding:8px 12px;font-weight:500">${t.name}</td><td style="padding:8px 12px"><code style="font-size:12px;background:#f3f4f6;padding:2px 6px;border-radius:3px">${t.module}</code></td><td style="padding:8px 12px;font-weight:600;color:#f59e0b">${(t.duration / 1000).toFixed(2)}s</td></tr>`).join('')
    : `<tr><td colspan="3" style="padding:16px;text-align:center;color:#6b7280">No hay tests lentos</td></tr>`;

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ArchiFlow — Registro Diagnostico de Tests</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; color: #1e293b; }
    .container { max-width: 1100px; margin: 0 auto; padding: 24px; }
    header { background: linear-gradient(135deg, #1e293b, #334155); color: white; padding: 24px; border-radius: 12px; margin-bottom: 24px; }
    header h1 { font-size: 24px; margin-bottom: 4px; }
    header p { opacity: 0.7; font-size: 14px; }
    .kpi-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; margin-bottom: 24px; }
    .kpi { background: white; border-radius: 10px; padding: 16px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
    .kpi .value { font-size: 28px; font-weight: 700; }
    .kpi .label { font-size: 12px; color: #64748b; margin-top: 2px; }
    .section { background: white; border-radius: 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); margin-bottom: 16px; overflow: hidden; }
    .section-header { padding: 12px 16px; font-weight: 600; font-size: 15px; border-bottom: 1px solid #e2e8f0; background: #f8fafc; }
    table { width: 100%; border-collapse: collapse; }
    th { padding: 8px 12px; text-align: left; font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #e2e8f0; }
    tr:hover { background: #f8fafc; }
    .nav { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
    .nav a { padding: 6px 12px; border-radius: 6px; background: white; color: #475569; text-decoration: none; font-size: 13px; font-weight: 500; box-shadow: 0 1px 2px rgba(0,0,0,0.06); }
    .nav a:hover { background: #e2e8f0; }
    @media (max-width: 768px) { .kpi-grid { grid-template-columns: repeat(3, 1fr); } .container { padding: 12px; } }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>ArchiFlow — Registro Diagnostico de Tests</h1>
      <p>Generado: ${new Date(s.timestamp).toLocaleString('es-CO')} | Duracion total: ${(s.duration / 1000).toFixed(1)}s</p>
    </header>
    <div class="nav">
      <a href="#resumen">Resumen</a>
      <a href="#categorias">Categorias</a>
      <a href="#modulos">Modulos</a>
      <a href="#fallidos">Fallidos</a>
      <a href="#lentos">Lentos</a>
    </div>
    <div class="kpi-grid" id="resumen">
      <div class="kpi"><div class="value">${s.totalTests}</div><div class="label">Total Tests</div></div>
      <div class="kpi"><div class="value" style="color:#166534">${s.passed}</div><div class="label">Pasados</div></div>
      <div class="kpi"><div class="value" style="color:#991b1b">${s.failed}</div><div class="label">Fallidos</div></div>
      <div class="kpi"><div class="value" style="color:#6b7280">${s.skipped}</div><div class="label">Saltados</div></div>
      <div class="kpi"><div class="value" style="color:${passRateColor}">${s.passRate.toFixed(1)}%</div><div class="label">Tasa de Paso</div></div>
    </div>
    <div class="section">
      <div class="section-header" id="categorias">Resumen por Categoria</div>
      <table><thead><tr><th>Categoria</th><th>Total</th><th>Pasados</th><th>Fallidos</th><th>Tasa</th></tr></thead><tbody>${catRows}</tbody></table>
    </div>
    <div class="section">
      <div class="section-header" id="modulos">Resumen por Modulo</div>
      <table><thead><tr><th>Modulo</th><th>Total</th><th>Pasados</th><th>Fallidos</th><th>Tasa</th></tr></thead><tbody>${modRows}</tbody></table>
    </div>
    <div class="section">
      <div class="section-header" id="fallidos" style="color:#991b1b">Tests Fallidos (${s.failedTests.length})</div>
      <table><thead><tr><th>Test</th><th>Modulo</th><th>Severidad</th><th>Error</th></tr></thead><tbody>${failedRows}</tbody></table>
    </div>
    <div class="section">
      <div class="section-header" id="lentos" style="color:#f59e0b">Tests Lentos (&gt;2s) (${s.slowTests.length})</div>
      <table><thead><tr><th>Test</th><th>Modulo</th><th>Duracion</th></tr></thead><tbody>${slowRows}</tbody></table>
    </div>
    <div style="text-align:center;padding:24px;color:#94a3b8;font-size:12px">
      ArchiFlow v2.0 — Diagnostic Test Report v1.0
    </div>
  </div>
</body>
</html>`;
}

// Main
const reportDir = path.resolve(process.cwd(), 'test-reports');
if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });

const jsonPath = path.join(reportDir, 'vitest.json');
if (!fs.existsSync(jsonPath)) {
  // Run vitest with json reporter if file doesn't exist
  console.log('[Report Generator] Running vitest with JSON reporter...');
  const { execSync } = require('child_process');
  execSync('npx vitest run --reporter=json --outputFile=test-reports/vitest.json', { stdio: 'inherit', cwd: process.cwd() });
}

const vitestData: VitestOutput = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
const tests = flattenTests(vitestData.testResults || []);

const duration = ((vitestData.successTime || Date.now()) - (vitestData.startTime || Date.now()));
const passed = tests.filter(t => t.status === 'passed').length;
const failed = tests.filter(t => t.status === 'failed').length;
const skipped = tests.filter(t => t.status === 'skipped').length || (vitestData.numPendingTests || 0);
const total = tests.length;
const passRate = total > 0 ? (passed / total) * 100 : 0;

const byCategory: Record<string, { total: number; passed: number; failed: number }> = {};
const byModule: Record<string, { total: number; passed: number; failed: number }> = {};
for (const t of tests) {
  if (!byCategory[t.category]) byCategory[t.category] = { total: 0, passed: 0, failed: 0 };
  byCategory[t.category].total++;
  if (t.status === 'passed') byCategory[t.category].passed++;
  if (t.status === 'failed') byCategory[t.category].failed++;

  if (!byModule[t.module]) byModule[t.module] = { total: 0, passed: 0, failed: 0 };
  byModule[t.module].total++;
  if (t.status === 'passed') byModule[t.module].passed++;
  if (t.status === 'failed') byModule[t.module].failed++;
}

const report: DiagnosticReport = {
  version: '1.0.0',
  projectName: 'ArchiFlow v2.0',
  summary: {
    timestamp: new Date().toISOString(),
    totalTests: total,
    passed,
    failed,
    skipped,
    duration,
    passRate: Math.round(passRate * 100) / 100,
    byCategory,
    byModule,
    failedTests: tests.filter(t => t.status === 'failed'),
    slowTests: tests.filter(t => t.duration > 2000).sort((a, b) => b.duration - a.duration),
  },
  tests,
};

// Save diagnostic summary JSON
const summaryPath = path.join(reportDir, 'diagnostic-summary.json');
fs.writeFileSync(summaryPath, JSON.stringify(report, null, 2), 'utf-8');

// Save HTML report
const html = generateHTML(report);
const htmlPath = path.join(reportDir, 'test-report.html');
fs.writeFileSync(htmlPath, html, 'utf-8');

console.log(`\n[Diagnostic Report Generator]`);
console.log(`  JSON: ${summaryPath}`);
console.log(`  HTML: ${htmlPath}`);
console.log(`  Summary: ${passed}/${total} passed (${passRate.toFixed(1)}%), ${failed} failed, ${skipped} skipped`);
if (failed > 0) {
  console.log(`  FAILED TESTS: ${report.summary.failedTests.map(t => `"${t.name}" [${t.module}]`).join(', ')}`);
}
