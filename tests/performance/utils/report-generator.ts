/**
 * Performance Report Generator
 *
 * Generates comprehensive performance reports with metrics and visualizations
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

export interface TestResult {
  testName: string;
  suite: string;
  duration: number;
  passed: boolean;
  metrics?: {
    throughput?: number;
    memoryUsedMB?: number;
    memoryPeakMB?: number;
    memoryGrowthPercent?: number;
    latencyAvg?: number;
    latencyP95?: number;
    latencyP99?: number;
    errorRate?: number;
  };
  benchmark?: {
    maxDuration?: number;
    maxMemoryMB?: number;
    minThroughput?: number;
    maxLatencyP95?: number;
  };
}

export interface PerformanceReport {
  timestamp: string;
  summary: {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    totalDuration: number;
    overallMemoryPeakMB: number;
  };
  results: TestResult[];
}

export class ReportGenerator {
  private results: TestResult[] = [];
  private startTime: number;

  constructor() {
    this.startTime = Date.now();
  }

  /**
   * Add a test result to the report
   */
  addResult(result: TestResult): void {
    this.results.push(result);
  }

  /**
   * Generate the performance report
   */
  generateReport(): PerformanceReport {
    const totalDuration = Date.now() - this.startTime;
    const passedTests = this.results.filter(r => r.passed).length;
    const failedTests = this.results.filter(r => !r.passed).length;
    const overallMemoryPeakMB = Math.max(
      ...this.results.map(r => r.metrics?.memoryPeakMB || 0)
    );

    return {
      timestamp: new Date().toISOString(),
      summary: {
        totalTests: this.results.length,
        passedTests,
        failedTests,
        totalDuration,
        overallMemoryPeakMB,
      },
      results: this.results,
    };
  }

  /**
   * Generate Markdown report
   */
  generateMarkdownReport(report: PerformanceReport): string {
    let md = '# Performance Test Report\n\n';
    md += `**Generated:** ${new Date(report.timestamp).toLocaleString()}\n\n`;

    // Summary
    md += '## Summary\n\n';
    md += `- **Total Tests:** ${report.summary.totalTests}\n`;
    md += `- **Passed:** ${report.summary.passedTests} ✅\n`;
    md += `- **Failed:** ${report.summary.failedTests} ${report.summary.failedTests > 0 ? '❌' : '✅'}\n`;
    md += `- **Total Duration:** ${(report.summary.totalDuration / 1000 / 60).toFixed(2)} minutes\n`;
    md += `- **Peak Memory:** ${report.summary.overallMemoryPeakMB.toFixed(2)} MB\n\n`;

    // Group results by suite
    const suites = [...new Set(report.results.map(r => r.suite))];

    for (const suite of suites) {
      const suiteResults = report.results.filter(r => r.suite === suite);

      md += `## ${suite}\n\n`;
      md += '| Test | Duration | Memory Peak | Throughput | P95 Latency | Status |\n';
      md += '|------|----------|-------------|------------|-------------|--------|\n';

      for (const result of suiteResults) {
        const status = result.passed ? '✅' : '❌';
        const duration = `${(result.duration / 1000).toFixed(2)}s`;
        const memoryPeak = result.metrics?.memoryPeakMB
          ? `${result.metrics.memoryPeakMB.toFixed(2)} MB`
          : 'N/A';
        const throughput = result.metrics?.throughput
          ? `${result.metrics.throughput.toFixed(2)}/s`
          : 'N/A';
        const latencyP95 = result.metrics?.latencyP95
          ? `${result.metrics.latencyP95.toFixed(2)}ms`
          : 'N/A';

        md += `| ${result.testName} | ${duration} | ${memoryPeak} | ${throughput} | ${latencyP95} | ${status} |\n`;
      }

      md += '\n';
    }

    // Benchmarks
    md += '## Benchmark Compliance\n\n';
    const benchmarkedTests = report.results.filter(r => r.benchmark);

    if (benchmarkedTests.length > 0) {
      md += '| Test | Metric | Actual | Benchmark | Status |\n';
      md += '|------|--------|--------|-----------|--------|\n';

      for (const result of benchmarkedTests) {
        if (result.benchmark?.maxDuration) {
          const status = result.duration <= result.benchmark.maxDuration ? '✅' : '❌';
          md += `| ${result.testName} | Duration | ${(result.duration / 1000).toFixed(2)}s | <${(result.benchmark.maxDuration / 1000).toFixed(2)}s | ${status} |\n`;
        }

        if (result.benchmark?.maxMemoryMB && result.metrics?.memoryPeakMB) {
          const status = result.metrics.memoryPeakMB <= result.benchmark.maxMemoryMB ? '✅' : '❌';
          md += `| ${result.testName} | Memory | ${result.metrics.memoryPeakMB.toFixed(2)} MB | <${result.benchmark.maxMemoryMB} MB | ${status} |\n`;
        }

        if (result.benchmark?.minThroughput && result.metrics?.throughput) {
          const status = result.metrics.throughput >= result.benchmark.minThroughput ? '✅' : '❌';
          md += `| ${result.testName} | Throughput | ${result.metrics.throughput.toFixed(2)}/s | >${result.benchmark.minThroughput}/s | ${status} |\n`;
        }

        if (result.benchmark?.maxLatencyP95 && result.metrics?.latencyP95) {
          const status = result.metrics.latencyP95 <= result.benchmark.maxLatencyP95 ? '✅' : '❌';
          md += `| ${result.testName} | P95 Latency | ${result.metrics.latencyP95.toFixed(2)}ms | <${result.benchmark.maxLatencyP95}ms | ${status} |\n`;
        }
      }

      md += '\n';
    }

    // Recommendations
    md += '## Recommendations\n\n';

    const slowTests = report.results.filter(r => r.duration > 60000); // > 1 minute
    if (slowTests.length > 0) {
      md += '### Slow Tests\n\n';
      md += 'The following tests took longer than expected:\n\n';
      for (const test of slowTests) {
        md += `- **${test.testName}**: ${(test.duration / 1000).toFixed(2)}s\n`;
      }
      md += '\n';
    }

    const memoryIntensiveTests = report.results.filter(r => (r.metrics?.memoryPeakMB || 0) > 1000);
    if (memoryIntensiveTests.length > 0) {
      md += '### Memory Intensive Tests\n\n';
      md += 'The following tests used significant memory (>1GB):\n\n';
      for (const test of memoryIntensiveTests) {
        md += `- **${test.testName}**: ${test.metrics?.memoryPeakMB?.toFixed(2)} MB\n`;
      }
      md += '\n';
    }

    const failedBenchmarks = report.results.filter(r => !r.passed && r.benchmark);
    if (failedBenchmarks.length > 0) {
      md += '### Failed Benchmarks\n\n';
      md += 'The following tests failed to meet performance benchmarks:\n\n';
      for (const test of failedBenchmarks) {
        md += `- **${test.testName}**\n`;
      }
      md += '\n';
    }

    return md;
  }

  /**
   * Generate JSON report
   */
  generateJSONReport(report: PerformanceReport): string {
    return JSON.stringify(report, null, 2);
  }

  /**
   * Generate HTML report with charts
   */
  generateHTMLReport(report: PerformanceReport): string {
    let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Performance Test Report</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      background: #f5f5f5;
    }
    h1, h2, h3 { color: #333; }
    .summary {
      background: white;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 20px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-top: 15px;
    }
    .metric {
      text-align: center;
      padding: 15px;
      background: #f9f9f9;
      border-radius: 4px;
    }
    .metric-value {
      font-size: 32px;
      font-weight: bold;
      color: #2563eb;
    }
    .metric-label {
      font-size: 14px;
      color: #666;
      margin-top: 5px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      background: white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      border-radius: 8px;
      overflow: hidden;
      margin-bottom: 20px;
    }
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #eee;
    }
    th {
      background: #2563eb;
      color: white;
      font-weight: 600;
    }
    tr:hover { background: #f9f9f9; }
    .status-pass { color: #10b981; font-weight: bold; }
    .status-fail { color: #ef4444; font-weight: bold; }
    .chart {
      background: white;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 20px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .bar {
      height: 30px;
      background: #2563eb;
      margin: 5px 0;
      border-radius: 4px;
      position: relative;
    }
    .bar-label {
      position: absolute;
      left: 10px;
      line-height: 30px;
      color: white;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <h1>Performance Test Report</h1>
  <p><strong>Generated:</strong> ${new Date(report.timestamp).toLocaleString()}</p>

  <div class="summary">
    <h2>Summary</h2>
    <div class="summary-grid">
      <div class="metric">
        <div class="metric-value">${report.summary.totalTests}</div>
        <div class="metric-label">Total Tests</div>
      </div>
      <div class="metric">
        <div class="metric-value" style="color: #10b981">${report.summary.passedTests}</div>
        <div class="metric-label">Passed</div>
      </div>
      <div class="metric">
        <div class="metric-value" style="color: ${report.summary.failedTests > 0 ? '#ef4444' : '#10b981'}">${report.summary.failedTests}</div>
        <div class="metric-label">Failed</div>
      </div>
      <div class="metric">
        <div class="metric-value">${(report.summary.totalDuration / 1000 / 60).toFixed(2)}</div>
        <div class="metric-label">Minutes</div>
      </div>
      <div class="metric">
        <div class="metric-value">${report.summary.overallMemoryPeakMB.toFixed(0)}</div>
        <div class="metric-label">Peak Memory (MB)</div>
      </div>
    </div>
  </div>`;

    // Group results by suite
    const suites = [...new Set(report.results.map(r => r.suite))];

    for (const suite of suites) {
      const suiteResults = report.results.filter(r => r.suite === suite);

      html += `
  <h2>${suite}</h2>
  <table>
    <thead>
      <tr>
        <th>Test</th>
        <th>Duration</th>
        <th>Memory Peak</th>
        <th>Throughput</th>
        <th>P95 Latency</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>`;

      for (const result of suiteResults) {
        const status = result.passed ? '<span class="status-pass">✅ PASS</span>' : '<span class="status-fail">❌ FAIL</span>';
        const duration = `${(result.duration / 1000).toFixed(2)}s`;
        const memoryPeak = result.metrics?.memoryPeakMB
          ? `${result.metrics.memoryPeakMB.toFixed(2)} MB`
          : 'N/A';
        const throughput = result.metrics?.throughput
          ? `${result.metrics.throughput.toFixed(2)}/s`
          : 'N/A';
        const latencyP95 = result.metrics?.latencyP95
          ? `${result.metrics.latencyP95.toFixed(2)}ms`
          : 'N/A';

        html += `
      <tr>
        <td>${result.testName}</td>
        <td>${duration}</td>
        <td>${memoryPeak}</td>
        <td>${throughput}</td>
        <td>${latencyP95}</td>
        <td>${status}</td>
      </tr>`;
      }

      html += `
    </tbody>
  </table>`;
    }

    // Duration chart
    html += `
  <div class="chart">
    <h2>Test Duration (seconds)</h2>`;

    const maxDuration = Math.max(...report.results.map(r => r.duration));
    for (const result of report.results) {
      const width = (result.duration / maxDuration) * 100;
      html += `
    <div class="bar" style="width: ${width}%">
      <span class="bar-label">${result.testName}: ${(result.duration / 1000).toFixed(2)}s</span>
    </div>`;
    }

    html += `
  </div>`;

    html += `
</body>
</html>`;

    return html;
  }

  /**
   * Save reports to disk
   */
  saveReports(outputDir: string = './performance-reports'): void {
    const report = this.generateReport();

    // Create output directory
    try {
      mkdirSync(outputDir, { recursive: true });
    } catch (error) {
      // Directory already exists
    }

    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];

    // Save JSON
    const jsonPath = join(outputDir, `performance-report-${timestamp}.json`);
    writeFileSync(jsonPath, this.generateJSONReport(report));

    // Save Markdown
    const mdPath = join(outputDir, `performance-report-${timestamp}.md`);
    writeFileSync(mdPath, this.generateMarkdownReport(report));

    // Save HTML
    const htmlPath = join(outputDir, `performance-report-${timestamp}.html`);
    writeFileSync(htmlPath, this.generateHTMLReport(report));

    console.log(`\n[REPORT] Performance reports saved:`);
    console.log(`[REPORT]   JSON: ${jsonPath}`);
    console.log(`[REPORT]   Markdown: ${mdPath}`);
    console.log(`[REPORT]   HTML: ${htmlPath}`);
  }
}
