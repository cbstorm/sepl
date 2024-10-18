process.argv.push('--headless');
import { EStatementAction, EStatementValueType, SEPL } from '../src/sepl';

describe('SEPL test', () => {
  it('[SUCCESS]happy case', () => {
    const raw = `
                DECLARE
                  post_list;
                  comments;
                  a := "Hi!";
                  e := "se@email.com";
                END
                BEGIN
                  GOTO "https://www.google.com.vn/";
                  SEND_KEYS xpath::"/html/body/div[1]/div[3]/form/div[1]/div[1]/div[1]/div/div[2]/textarea" "What's up?";
                  SEND_KEYS xpath::"/html/body/div[1]/div[3]/form/div[1]/div[1]/div[1]/div/div[2]/textarea" "Where are you" "now?";
                  SEND_KEYS css::"#email" "email@email.com";
                  CLICK css::"#button";
                  WAIT 3s;
                  WAIT 500ms;
                  GET_TEXT css::"#body" INTO $post_list;
                  GET_HTML text::"Hello SEPL ABCs" INTO $comments;
                END
            `;
    const sepl = new SEPL(raw);
    const res = sepl.Compile().ProcedureStatements();
    expect(res[0]).toMatchObject({
      action: 'GOTO',
      value: { type: EStatementValueType.PLAIN, val: 'https://www.google.com.vn/' },
    });
    expect(res[1]).toMatchObject({
      action: EStatementAction.SEND_KEYS,
      location: { type: 'xpath', value: '/html/body/div[1]/div[3]/form/div[1]/div[1]/div[1]/div/div[2]/textarea' },
      value: {
        type: EStatementValueType.PLAIN,
        val: "What's up?",
      },
    });
    expect(res[2]).toMatchObject({
      action: EStatementAction.SEND_KEYS,
      location: { type: 'xpath', value: '/html/body/div[1]/div[3]/form/div[1]/div[1]/div[1]/div/div[2]/textarea' },
      value: {
        type: EStatementValueType.PLAIN,
        val: 'Where are you',
      },
    });
    expect(res[3]).toMatchObject({
      action: EStatementAction.SEND_KEYS,
      location: { type: 'css', value: '#email' },
      value: {
        type: EStatementValueType.PLAIN,
        val: 'email@email.com',
      },
    });
    expect(res[4]).toMatchObject({
      action: EStatementAction.CLICK,
      location: { type: 'css', value: '#button' },
    });
    expect(res[5]).toMatchObject({
      action: EStatementAction.WAIT,
      value: 3000,
    });
    expect(res[6]).toMatchObject({
      action: EStatementAction.WAIT,
      value: 500,
    });
    expect(res[7]).toMatchObject({
      action: EStatementAction.GET_TEXT,
      destination: 'post_list',
      location: { type: 'css', value: '#body' },
      vars: { post_list: '', comments: '' },
    });
    expect(res[8]).toMatchObject({
      action: EStatementAction.GET_HTML,
      destination: 'comments',
      location: { type: 'text', value: 'Hello SEPL ABCs' },
      vars: { post_list: '', comments: '' },
    });
    const variables = sepl.Variables();
    expect(variables).toMatchObject({
      post_list: '',
      comments: '',
      a: 'Hi!',
      e: 'se@email.com',
    });
  });

  it('Will throw error when not starting with DECLARE or BEGIN', async () => {
    const sepl = new SEPL(`
            END;    
        `);
    expect(() => sepl.Compile()).toThrow();
  });

  it('[FAIL]Will throw error value invalid', () => {
    const q = `
      BEGIN
        SEND_KEYS xpath::"/html/body/div[1]/div[3]/form/div[1]/div[1]/div[1]/div/div[2]/textarea" "What's this?;
      END
    `;
    const sepl = new SEPL(q);
    expect(() => sepl.Compile()).toThrow();
  });

  it('Will throw error location value invalid', () => {
    const q = `
      BEGIN
        SEND_KEYS xpath::/html/body/div[1]/div[3]/form/div[1]/div[1]/div[1]/div/div[2]/textarea "What's up?";
      END
    `;
    const sepl = new SEPL(q);
    expect(() => sepl.Compile()).toThrow();
  });
  it('[FAIL]Will be successfully without declare section', () => {
    const sepl = new SEPL(`
            BEGIN
                GOTO "https://developer.chrome.com/docs/chromedriver/";
            END
            `);
    const res = sepl.Compile();
    const stms = res.ProcedureStatements();
    expect(stms[0]).toMatchObject({
      action: EStatementAction.GOTO,
      value: {
        type: EStatementValueType.PLAIN,
        val: 'https://developer.chrome.com/docs/chromedriver/',
      },
    });
    const variables = sepl.Variables();
    expect(variables).toMatchObject({});
  });

  it('[SUCESS]test parseline', () => {
    const q = `
      DECLARE
        comments;
      END
      BEGIN
        GET_HTML text::"Hello SEPL ABC" INTO $comments;
      END
    `;
    const sepl = new SEPL(q);
    sepl.Compile();
    sepl.ProcedureStatements();
    expect(sepl.Variables()).toMatchObject({ comments: '' });
    const p = sepl.ProcedureStatements()[0];
    expect(p).toMatchObject({
      action: EStatementAction.GET_HTML,
      location: { type: 'text', value: 'Hello SEPL ABC' },
      destination: 'comments',
    });
  });

  it('[SUCCESS]declared varibles initial with value', () => {
    const q = `
      DECLARE
        a :="123 = 1";
        b :="890";
        c;
      END
      BEGIN
        GOTO $a;
      END
    `;
    const sepl = new SEPL(q);
    sepl.Compile();
    expect(sepl.Variables()).toMatchObject({ a: '123 = 1', b: '890', c: '' });
  });

  it('[FAIL] Will throw error when procedure section is empty', () => {
    const p = `
      DECLARE
        a := "1";
      END
    `;
    const sepl = new SEPL(p);
    expect(() => sepl.Compile()).toThrow();
  });

  it('[FAIL] Will throw error', () => {
    const p = `
      DECLARE
        a = "1" ;
      END
      BEGIN
        GOTO "http://localhost:3333";
      END
    `;
    const sepl = new SEPL(p);
    expect(() => sepl.Compile()).toThrow();
  });
  it('[SUCCESS]use value in procedure section', () => {
    const p = `
      DECLARE
        a := "http://google.com";
      END
      BEGIN
        GOTO $a;
      END
    `;
    const sepl = new SEPL(p);
    sepl.Compile();
    const s = sepl.ProcedureStatements();
    expect(s[0]).toMatchObject({
      action: EStatementAction.GOTO,
      value: {
        type: EStatementValueType.VAR,
        raw_val: 'a',
        val: 'http://google.com',
      },
    });
  });

  it(
    '[SUCCESS]logs statement',
    async () => {
      const p = `
      DECLARE
        logs;
      END
      BEGIN
        GOTO "https://www.youtube.com/watch?v=JIxSON5l9Ec/";
        WAIT 5s;
        CLICK xpath::"/html/body/ytd-app/div[1]/ytd-page-manager/ytd-watch-flexy/div[5]/div[1]/div/div[2]/ytd-watch-metadata/div/div[4]/div[1]";
        WAIT 3s;
        GET_LOGS INTO $logs;
      END
    `;
      const sepl = new SEPL(p);
      sepl.Compile();
      expect(sepl.ProcedureStatements()[4]).toMatchObject({ action: EStatementAction.GET_LOGS, destination: 'logs' });
      expect(sepl.Variables()['logs']).toEqual('');
    },
    60 * 1000
  );
});
