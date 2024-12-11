export default class BenchmarkPage {
  constructor(page) {
    this.page = page;

    this.container = page.locator('.ccd-cards');
    this.benchmarkMask = page.locator('.ccd-cards .benchmark-mask');
    
  }

}
