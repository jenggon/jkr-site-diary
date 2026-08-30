import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

async function main() {
  const browser = await chromium.launch();
  
  const capture = async (isMobile: boolean, routeTab: string, filename: string) => {
    const context = await browser.newContext({
      viewport: isMobile ? { width: 375, height: 812 } : { width: 1280, height: 720 },
      deviceScaleFactor: isMobile ? 2 : 1,
      isMobile: isMobile,
      hasTouch: isMobile,
    });
    
    const page = await context.newPage();

    // Mock API requests
    await page.route('**/api/programme?status=Active', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            { id: 'prog-1', code: 'PROJ-XYZ-001', name: 'Pembinaan Jambatan ABC', contractorName: 'Bina Sdn Bhd' },
            { id: 'prog-2', code: 'PROJ-XYZ-002', name: 'Naik Taraf Jalan DEF' }
          ]
        })
      });
    });

    await page.route('**/api/project-summary?programmeId=prog-1', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          revision_id: 'rev-001',
          task_name: 'Pembinaan Jambatan ABC'
        })
      });
    });

    await page.route('**/api/programme/prog-1', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: { programmeCode: 'PROJ-XYZ-001', programmeName: 'Pembinaan Jambatan ABC' }
        })
      });
    });

    await page.route('**/api/programme/prog-1/approval-queue', async route => {
      if (routeTab === 'APPROVALS') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: [
              {
                approval_id: 'app-1',
                site_diary_id: 'sd-1',
                programme_id: 'prog-1',
                activity_name: 'Kerja Tanah Peringkat 1',
                activity_date: '2026-08-30',
                approval_status: 'Pending',
                requested_at: '2026-08-30T09:00:00Z',
                requester_name: 'Ahmad'
              }
            ]
          })
        });
      } else {
        await route.fulfill({ status: 200, body: JSON.stringify({ data: [] }) });
      }
    });

    await page.route('**/api/site-diary/prog-1/history', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [] })
      });
    });
    
    // We also need to mock Supabase Auth session if we are intercepting requests, but since it's Next.js and AuthContext uses supabase.auth.getSession, we need to mock it on the page itself or mock the supabase API calls!
    await page.route('**/auth/v1/session', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'fake-token',
          token_type: 'bearer',
          expires_in: 3600,
          user: { id: 'u-1', email: 'test@jkr.gov.my', app_metadata: {}, user_metadata: {} }
        })
      });
    });
    
    // Fallback for any other API calls
    await page.route('**/api/**', async route => {
      // Don't override the specific routes mocked above
      if (!route.request().url().includes('/api/programme') && 
          !route.request().url().includes('/api/project-summary') &&
          !route.request().url().includes('/api/site-diary')) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) });
      } else {
        await route.fallback();
      }
    });

    console.log(`Navigating to http://localhost:3000/site-diary for ${filename}...`);
    try {
      await page.goto('http://localhost:3000/site-diary', { waitUntil: 'domcontentloaded', timeout: 3000 });
    } catch (e) {
      console.log('Goto timeout, continuing...');
    }
      
    try {
      // Select programme if needed
      await page.waitForTimeout(1000);
      if (await page.isVisible('text="Pilih Projek / Program Tapak"')) {
        await page.click('text="Pilih Projek / Program Tapak"', { timeout: 2000 });
      }
      if (await page.isVisible('text="PROJ-XYZ-001"')) {
        await page.click('text="PROJ-XYZ-001"', { timeout: 2000 });
      }

      // Wait for layout to settle
      await page.waitForTimeout(1000);

      // Select tab
      if (routeTab === 'RECORDS') {
        if (await page.isVisible('role=tab[name="Rekod / Sejarah"]')) await page.click('role=tab[name="Rekod / Sejarah"]', { timeout: 2000 });
      } else if (routeTab === 'NEW') {
        if (await page.isVisible('role=tab[name="Laporan Baharu"]')) await page.click('role=tab[name="Laporan Baharu"]', { timeout: 2000 });
      } else if (routeTab === 'APPROVALS') {
        if (await page.isVisible('role=tab[name="Kelulusan"]')) await page.click('role=tab[name="Kelulusan"]', { timeout: 2000 });
      }
      
      await page.waitForTimeout(1000); // let UI settle
    } catch (e) {
      console.error(`Interaction error for ${filename}:`, e);
    }
    
    try {
      const outPath = path.join(process.cwd(), 'docs', 'evidence', 'f4.5-b01b', filename);
      await page.screenshot({ path: outPath });
      console.log(`Saved ${outPath}`);
    } catch (e) {
      console.error(`Failed to capture ${filename}:`, e);
    }
    
    await context.close();
  };

  // Capture all required shots
  await capture(true, 'RECORDS', 'mobile-shell-records-375x812.png');
  await capture(true, 'NEW', 'mobile-shell-new-entry-375x812.png');
  await capture(true, 'NEW', 'mobile-shell-selected-nav-375x812.png'); // optional
  await capture(false, 'RECORDS', 'desktop-shell-records-1280x720.png');
  await capture(false, 'APPROVALS', 'desktop-shell-approval-1280x720.png');
  await capture(false, 'RECORDS', 'desktop-shell-history-1280x720.png'); // optional

  await browser.close();
}

main().catch(console.error);
