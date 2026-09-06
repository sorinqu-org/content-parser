import { test, describe } from 'node:test';
import assert from 'node:assert';
import { TOOLS } from '../mcp/tools.js';
import { parseUrl } from '../engine/index.js';
import { addMcpToTarget } from '../cli/integrators/index.js';

describe('Content Parser Test Suite', () => {
  test('TOOLS exposes all required MCP tools', () => {
    const names = TOOLS.map((t) => t.name);
    assert.ok(names.includes('parse_website'));
    assert.ok(names.includes('extract_assets'));
    assert.ok(names.includes('extract_ui_components'));
    assert.ok(names.includes('extract_site_structure'));
    assert.ok(names.includes('extract_page_content'));
    assert.ok(names.includes('capture_screenshots'));
    assert.ok(names.includes('inspect_element'));
  });

  test('Integrators orchestrator handles target normalization', async () => {
    const res = await addMcpToTarget('antigravity');
    assert.strictEqual(res.length, 1);
    assert.strictEqual(res[0].success, true);

    const hermesRes = await addMcpToTarget('hermes');
    assert.strictEqual(hermesRes.length, 1);
    assert.strictEqual(hermesRes[0].success, true);

    const unknown = await addMcpToTarget('nonexistent');
    assert.strictEqual(unknown[0].success, false);
  });

  test('Parser extracts structure and content from inline HTML fixture', async () => {
    const fixtureHtml = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <title>Test Platform</title>
          <meta name="description" content="Test Platform for Unit Testing">
        </head>
        <body>
          <header class="navbar">
            <a href="/about">About</a>
            <a href="/pricing">Pricing</a>
          </header>
          <main>
            <section class="hero">
              <h1>Hero Header Title</h1>
              <p>Welcome to our modern testing platform.</p>
              <button class="btn btn-primary">Get Started</button>
            </section>
            <div class="card">
              <h2>Feature Card</h2>
              <p>Card content explanation.</p>
            </div>
          </main>
          <footer class="footer">
            <p>Copyright 2026</p>
          </footer>
        </body>
      </html>
    `;

    const dataUrl = `data:text/html;base64,${Buffer.from(fixtureHtml).toString('base64')}`;

    const result = await parseUrl({
      url: dataUrl,
      targets: ['text', 'ui_components', 'structure']
    });

    assert.ok(result.content);
    assert.strictEqual(result.content.title, 'Test Platform');
    assert.strictEqual(result.content.metaDescription, 'Test Platform for Unit Testing');
    assert.ok(result.content.headings.some((h) => h.text === 'Hero Header Title'));
    assert.ok(result.uiComponents && result.uiComponents.length > 0);
  });

  test('MCP handler dispatches parse_website call correctly', async () => {
    const fixtureHtml = `
      <!DOCTYPE html>
      <html>
        <head><title>Dispatch Test</title></head>
        <body>
          <h1>MCP Title</h1>
          <img src="https://example.com/logo.png" alt="Logo">
        </body>
      </html>
    `;
    const dataUrl = `data:text/html;base64,${Buffer.from(fixtureHtml).toString('base64')}`;

    const { handleToolCall } = await import('../mcp/handlers.js');
    const response = await handleToolCall('parse_website', {
      url: dataUrl,
      targets: ['text', 'images']
    });

    assert.ok(response);
    assert.strictEqual(response.content.title, 'Dispatch Test');
    assert.ok(response.assets.images.length >= 1);
  });
});
