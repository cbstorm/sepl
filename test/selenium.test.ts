process.argv.push('--headless');
import { EStatementAction, SEPL } from '../src/sepl';

describe('Selenium Test', () => {
  it(
    'test demoblaze',
    async () => {
      const q = `
      DECLARE
        products;
        categories;
        logs;
      END
      BEGIN
        GOTO "https://www.demoblaze.com/";
        GET_HTML css::"#contcont > div > div.col-lg-3 > div" INTO $categories;
        WAIT 3s;
        GET_HTML css::"#tbodyid" INTO $products;
        GET_LOGS INTO $logs; 
      END
    `;
      const sepl = new SEPL(q);
      sepl.Compile();
      await SEPL.Execute(sepl.ProcedureStatements());
      expect(sepl.Variables()['products']).toBeTruthy();
      expect(sepl.Variables()['categories']).toBeTruthy();
      expect(sepl.Variables()['logs']).toBeTruthy();
    },
    60 * 1000
  );

  it('[SUCCESS]TakeScreenshot', async () => {
    const p = `
      DECLARE
        img_0;
      END
      BEGIN
        GOTO "https://www.saucedemo.com/";
        SCREENSHOT INTO $img_0;
      END
    `;
    const sepl = new SEPL(p);
    sepl.Compile();
    expect(sepl.ProcedureStatements()[1]).toMatchObject({ action: EStatementAction.SCREENSHOT, destination: 'img_0' });
    await SEPL.Execute(sepl.ProcedureStatements());
    expect(sepl.Variables()['img_0']).toBeTruthy();
  });

  it('[SUCCESS]TakeScreenshot', async () => {
    const p = `
      DECLARE
        img_0;
        username := "standard_user";
        password := "secret_sauce";
      END
      BEGIN
        GOTO "https://www.saucedemo.com/";
        SEND_KEYS css::"#user-name" $username;
        SEND_KEYS css::"#password" $password;
      END
    `;
    const sepl = new SEPL(p);
    sepl.Compile();
    sepl.ProcedureStatements();
    await SEPL.Execute(sepl.ProcedureStatements());
  });
});
