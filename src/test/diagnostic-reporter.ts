/**
 * diagnostic-reporter.ts
 * Custom Vitest reporter that generates a structured JSON diagnostic report.
 * This report serves as the "registro completo" — a navigable audit of test results.
 */

import type { Reporter, FileResult } from 'vitest/reporter';
import * as fs from 'fs';
import * as path from 'path';

interface DiagnosticTest {
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  file: string;
  module: string;
  category: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  error?: {
    message: string;
    expected?: string;
    actual?: string;
    stack?: string;
  };
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

function categorize(filePath: string): { module: string; category: string; severity: 'critical' | 'high' | 'medium' | 'low' | 'info' } {
  const normalizedPath = filePath.replace(/\\/g, '/');

  if (normalizedPath.includes('/test/screens/')) {
    return { module: extractName(filePath, '/screens/'), category: 'screens', severity: 'medium' };
  }
  if (normalizedPath.includes('/test/integration/')) {
    return { module: extractName(filePath, '/integration/'), category: 'integration', severity: 'high' };
  }
  if (normalizedPath.includes('/test/components/')) {
    return { module: extractName(filePath, '/components/'), category: 'components', severity: 'medium' };
  }
  if (normalizedPath.includes('/test/hooks/')) {
    return { module: extractName(filePath, '/hooks/'), category: 'hooks', severity: 'medium' };
  }
  if (normalizedPath.includes('/test/unit/')) {
    return { module: extractName(filePath, '/unit/'), category: 'unit', severity: 'low' };
  }

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

export default class DiagnosticReporter implements Reporter {
  private tests: DiagnosticTest[] = [];
  private startTime = Date.now();

  onTestResult(result: FileResult) {
    for (const test of result.tests || []) {
      const { module, category, severity } = categorize(result.filepath);
      const error = test.result?.error;

      this.tests.push({
        name: test.name,
        status: test.result?.status === 'expected' ? 'passed' : test.result?.status === 'unexpected' ? 'failed' : 'skipped',
        duration: test.result?.duration || 0,
        file: result.filepath,
        module,
        category,
        severity,
        error: error ? {
          message: error.message || 'Unknown error',
          stack: error.stack,
        } : undefined,
      });
    }
  }

  onFinished() {
    const duration = Date.now() - this.startTime;
    const passed = this.tests.filter(t => t.status === 'passed').length;
    const failed = this.tests.filter(t => t.status === 'failed').length;
    const skipped = this.tests.filter(t => t.status === 'skipped').length;
    const total = this.tests.length;
    const passRate = total > 0 ? (passed / total) * 100 : 0;

    // Group by category
    const byCategory: Record<string, { total: number; passed: number; failed: number }> = {};
    for (const t of this.tests) {
      if (!byCategory[t.category]) byCategory[t.category] = { total: 0, passed: 0, failed: 0 };
      byCategory[t.category].total++;
      if (t.status === 'passed') byCategory[t.category].passed++;
      if (t.status === 'failed') byCategory[t.category].failed++;
    }

    // Group by module
    const byModule: Record<string, { total: number; passed: number; failed: number }> = {};
    for (const t of this.tests) {
      if (!byModule[t.module]) byModule[t.module] = { total: 0, passed: 0, failed: 0 };
      byModule[t.module].total++;
      if (t.status === 'passed') byModule[t.module].passed++;
      if (t.status === 'failed') byModule[t.module].failed++;
    }

    // Failed tests
    const failedTests = this.tests.filter(t => t.status === 'failed');
    // Slow tests (>2s)
    const slowTests = this.tests.filter(t => t.duration > 2000).sort((a, b) => b.duration - a.duration);

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
        failedTests,
        slowTests,
      },
      tests: this.tests,
    };

    // Write JSON report
    const reportDir = path.resolve(process.cwd(), 'test-reports');
    if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });

    const jsonPath = path.join(reportDir, 'diagnostic-summary.json');
    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), 'utf-8');
    console.log(`\n[Diagnostic Reporter] Report saved to: ${jsonPath}`);
    console.log(`[Diagnostic Reporter] Summary: ${passed}/${total} passed (${passRate.toFixed(1)}%), ${failed} failed, ${skipped} skipped`);
    if (failedTests.length > 0) {
      console.log(`[Diagnostic Reporter] FAILED: ${failedTests.map(t => `"${t.name}" (${t.module})`).join(', ')}`);
    }
  }
}
