import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import AdblockerPlugin from "puppeteer-extra-plugin-adblocker";
import RecaptchaPlugin from "puppeteer-extra-plugin-recaptcha";
import path from "path";
import readline from "readline";
import fs from "fs/promises";

puppeteer.use(StealthPlugin());
puppeteer.use(AdblockerPlugin({ blockTrackers: true }));
puppeteer.use(
  RecaptchaPlugin({
    provider: {
      id: "2captcha",
      token: "2276582296beebd15379cd705bedb343", // REPLACE THIS WITH YOUR OWN 2CAPTCHA API KEY ⚡
    },
    visualFeedback: true, // colorize reCAPTCHAs (violet = detected, green = solved)
  })
);

const USER_DATA_DIR = path.join(process.cwd(), "user_data");
const LOCAL_STATE_FILE = path.join(USER_DATA_DIR, "Local State");
const COOKIES_FILE = path.join(USER_DATA_DIR, "cookies.json");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function saveCookies(page) {
  const cookies = await page.cookies();
  await fs.promises.writeFile(COOKIES_FILE, JSON.stringify(cookies, null, 2));
  console.log("Cookies saved successfully");
}

async function isLoggedIn() {
  try {
    // Check if the Local State file exists
    await fs.access(LOCAL_STATE_FILE);

    // Read the Local State file
    const localStateData = await fs.readFile(LOCAL_STATE_FILE, "utf8");
    const localState = JSON.parse(localStateData);

    // Check for login information in the Local State
    // This is a simplified check and may need adjustment based on BookMyShow's specific storage method
    return !!localState.profile && !!localState.profile.info_cache;
  } catch (error) {
    console.error("Error checking login state:", error.message);
    return false;
  }
}

async function initialLogin(page) {
  console.log("Not logged in. Proceeding with login process...");
  // Click on the image
  try {
    await page.waitForSelector(
      '#modal-root > div > div > div > div:nth-child(3) > ul > li:nth-child(1) > div > div > img[alt="MUMBAI"]',
      { visible: true, timeout: 10000 }
    );
    await page.click(
      '#modal-root > div > div > div > div:nth-child(3) > ul > li:nth-child(1) > div > div > img[alt="MUMBAI"]'
    );
    console.log("MUMBAI image clicked successfully");
  } catch (error) {
    console.log(
      "Could not find or click the MUMBAI image. Error:",
      error.message
    );
    console.log("Attempting to proceed anyway.");
  }

  // Wait for the book button to be visible and click it
  await page.waitForSelector("#synopsis-book-button", {
    visible: true,
    timeout: 10000,
  });
  await page.click("#synopsis-book-button");

  // Wait for the phone number input field and enter the provided number
  await page.waitForSelector("#mobileNo");
  const phoneNumber = "9108299678"; // Use the provided phone number
  await page.type("#mobileNo", phoneNumber);
  console.log("Phone number entered:", phoneNumber);

  // Wait for the submit button to be visible and clickable using XPath
  const submitButtonXPath =
    "/html/body/div[3]/div/div/div/div/div[2]/form/div[2]/button";
  await page.waitForSelector(`::-p-xpath(${submitButtonXPath})`, {
    visible: true,
    timeout: 10000,
  });

  // Click the submit button
  await page.click(`::-p-xpath(${submitButtonXPath})`);
  console.log("Continue button clicked successfully");

  // Wait for OTP input to be visible
  // await page.waitForSelector('input[autocomplete="one-time-code"]', {
  //   visible: true,
  //   timeout: 60000,
  // });
  // console.log("OTP input field is visible. Waiting for OTP to be entered...");

  // Wait for OTP to be entered (all input fields filled)
  // await page.waitForFunction(
  //   () => {
  //     const inputs = document.querySelectorAll(
  //       'input[autocomplete="one-time-code"]'
  //     );
  //     return Array.from(inputs).every((input) => input.value.length === 1);
  //   },
  //   { timeout: 300000 }
  // ); // 5 minutes timeout

  // console.log("OTP entered successfully");

  // Click the submit button after OTP input
  // await page.click(
  //   "#modal-root > div > div > div > div > div.sc-dh558f-6.ceEYmA > form > div.sc-dh558f-1.hwrPCy > button"
  // );

  console.log("Logged in successfully");
  // await saveCookies(page);

  // Immediately try to click the book button after login
  await clickBookButton(page);
}

async function clickBookButton(page) {
  console.log("Attempting to click book button immediately...");
  try {
    // Set up a navigation promise before clicking the button
    const navigationPromise = page
      .waitForNavigation({ timeout: 5000 })
      .catch(() => {});

    await page.evaluate(() => {
      const button = document.querySelector("#synopsis-book-button");
      if (button && !button.disabled) {
        button.click();
      }
    });

    // Wait for the navigation to complete
    await navigationPromise;
    console.log("Book button clicked and navigation completed or timed out");
  } catch (error) {
    console.error("Failed to click synopsis-book-button:", error.message);
  }
}

async function captureBookMyShow(url) {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: false,
      defaultViewport: null,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
      ],
      userDataDir: USER_DATA_DIR,
    });

    const page = await browser.newPage();

    try {
      await page.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
      );

      await page.goto(url, { waitUntil: "domcontentloaded" });

      // Attempt to click the book button immediately after page load
      await clickBookButton(page);

      const loggedIn = await isLoggedIn();

      if (!loggedIn) {
        console.log("Not logged in. Proceeding with login process...");
        await initialLogin(page);
      } else {
        console.log("Already logged in. Book button should have been clicked.");
      }

      // Click the element with the specified XPath
      const elementXPath =
        "/html/body/div[2]/div/div/div[3]/div/div[1]/div[2]/div/div[1]/ul/li";
      // "/html/body/div[2]/div/div/div[3]/div/div[1]/div[3]/div/div[1]/ul/li";

      try {
        const element = await page.waitForSelector(
          `::-p-xpath(${elementXPath})`,
          {
            // visible: true,
            timeout: 5000,
          }
        );
        if (element) {
          await element.click();
          console.log("Clicked element with XPath:", elementXPath);
        } else {
          throw new Error("Element not found");
        }
      } catch (error) {
        console.error("Failed to click element with XPath:", error.message);
      }

      // Click the booking-continue-button
      try {
        await page.waitForSelector("#booking-continue-button", {
          // visible: true,
          timeout: 5000,
        });
        await page.click("#booking-continue-button");
        console.log("Clicked booking-continue-button");
      } catch (error) {
        console.error(
          "Failed to click booking-continue-button:",
          error.message
        );
      }

      // Wait another moment for the page to update
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } catch (error) {
      console.error("An error occurred:", error.message);

      // Log the current URL
      const currentUrl = await page.url();
      console.log("Current page URL:", currentUrl);
    }
  } catch (error) {
    console.error("Error launching browser:", error.message);
  } finally {
    if (browser) {
      console.log("\nBrowser will remain open until you choose to close it.");
      console.log(
        "Type 'exit' and press Enter to close the browser and end the script."
      );

      const waitForExit = () => {
        rl.question("", (answer) => {
          if (answer.toLowerCase() === "exit") {
            console.log("Closing browser and ending script...");
            browser.close().then(() => {
              rl.close();
              process.exit(0);
            });
          } else {
            waitForExit();
          }
        });
      };

      waitForExit();
    }
  }
}

// Wrap the main function in a try-catch to prevent unhandled promise rejections
(async () => {
  try {
    const url =
      "https://in.bookmyshow.com/events/lollapalooza-india-2025/ET00409511";
    await captureBookMyShow(url);
  } catch (error) {
    console.error("Unhandled error in main function:", error);
  }
})();

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});
