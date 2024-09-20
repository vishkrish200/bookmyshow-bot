import puppeteer from "puppeteer";

async function checkColdplayPage() {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  try {
    // Navigate to the BookMyShow Coldplay event page
    await page.goto(
      "https://in.bookmyshow.com/events/coldplay-music-of-the-spheres-world-tour/ET00412466",
      { waitUntil: "networkidle0" }
    );

    // Check for potential anti-bot measures
    const pageContent = await page.content();
    const potentialAntiBot = {
      captcha:
        pageContent.includes("captcha") || pageContent.includes("recaptcha"),
      cloudflare: pageContent.includes("cloudflare"),
      javascript: await page.evaluate(() => {
        return {
          cookiesEnabled: navigator.cookieEnabled,
          userAgent: navigator.userAgent,
        };
      }),
    };

    // Scrape basic page info
    const pageTitle = await page.title();
    const eventName = await page.$eval("h1", (el) => el.textContent.trim());
    const eventDate = await page.$eval(
      'div[class*="styles__EventDateContainer"]',
      (el) => el.textContent.trim()
    );

    console.log("Page Title:", pageTitle);
    console.log("Event Name:", eventName);
    console.log("Event Date:", eventDate);
    console.log("Potential Anti-Bot Measures:", potentialAntiBot);
  } catch (error) {
    console.error("An error occurred:", error);
  } finally {
    await browser.close();
  }
}

checkColdplayPage();
