process.argv.push('--headless');
import { SEPL } from '../src/sepl';

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
});
