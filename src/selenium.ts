import * as fs from 'fs';
import { Browser, Builder, By, WebDriver } from 'selenium-webdriver';
import * as chrome from 'selenium-webdriver/chrome';
import { Level, Preferences, Type } from 'selenium-webdriver/lib/logging';

const HEADLESS = process.argv.findIndex((e) => e == '--headless') != -1;

export class SeleniumDriver {
  private _driver: WebDriver;
  private _is_headless: boolean = HEADLESS;
  constructor(driver: WebDriver) {
    this._driver = driver;
  }
  static async New() {
    const opts = new chrome.Options();
    opts.addArguments('--no-sandbox');
    opts.addArguments('--incognito');
    opts.addArguments('--disable-popup-blocking');
    opts.addArguments('--disable-default-apps');
    opts.addArguments('--disable-infobars');
    opts.addArguments('--disable-extensions');
    opts.addArguments('--disable-dev-shm-usage');
    opts.addArguments('--window-size=1920,1080');
    if (HEADLESS) {
      opts.addArguments('--headless');
    }
    const pref = new Preferences();
    pref.setLevel(Type.BROWSER, Level.ALL);
    let driver = await new Builder().forBrowser(Browser.CHROME).setChromeOptions(opts).setLoggingPrefs(pref).build();
    return new SeleniumDriver(driver);
  }
  Driver() {
    return this._driver;
  }
  IsHeadless() {
    return this._is_headless;
  }
  async GetElementByXPath(xpath: string) {
    return await this._driver.findElement(By.xpath(xpath));
  }
  async GetElementByText(text: string) {
    return await this._driver.findElement(By.xpath(`//*[text()='${text}']`));
  }
  async GetElementByCss(css: string) {
    return await this._driver.findElement(By.css(css));
  }
  async GetLogs() {
    return await this._driver.executeScript('return window.performance.getEntries();');
  }
  async TakeScreenshot() {
    return await this._driver.takeScreenshot();
  }
  async SaveScreenshot(path: string) {
    const base64_img = await this.TakeScreenshot();
    return new Promise((resolve, reject) => {
      return fs.writeFile(path, base64_img, { encoding: 'base64' }, (err) => {
        if (err) {
          return reject(err);
        }
        return resolve(path);
      });
    });
  }
  async Quit() {
    await this._driver.quit();
  }
}
