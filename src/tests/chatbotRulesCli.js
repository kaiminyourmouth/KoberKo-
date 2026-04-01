import assert from 'node:assert/strict';
import { askGroq, getGroqStatus } from '../services/groq.js';

const sampleContext = {
  conditionId: 'DENGUE',
  conditionName: 'Dengue Fever',
  memberType: 'SSS',
  hospitalLevel: 'level2',
  hospitalType: 'DOH',
  roomType: 'WARD',
  coverageAmount: 19500,
  coverageVariantKey: null,
};

async function run() {
  const filNoContext = await askGroq('Magkano po ang babayaran namin sa ospital?', null, []);
  assert.match(filNoContext.message, /Intake/i);
  assert.match(filNoContext.message, /mas tumpak|accurate/i);

  const cebKonsulta = await askGroq('Unsa ang PhilHealth Konsulta?', null, []);
  assert.match(cebKonsulta.message, /Konsulta/i);
  assert.match(cebKonsulta.message, /Base kini sa datos sa KoberKo/i);

  const taglishNoContext = await askGroq('Pwede ba direct filing for our case?', null, []);
  assert.match(taglishNoContext.message, /Intake/i);
  assert.match(taglishNoContext.message, /accurate/i);

  const intakeStartReply = await askGroq("i'll start with intake first", null, []);
  assert.match(intakeStartReply.message, /Intake/i);
  assert.doesNotMatch(intakeStartReply.message, /Resolved condition|Acute Myocardial Infarction|AMI/i);

  const sourceReply = await askGroq('where do you get your information from? from philhealth data or what?', null, []);
  assert.match(sourceReply.message, /local dataset/i);
  assert.match(sourceReply.message, /PhilHealth circulars|DOH issuances/i);
  assert.doesNotMatch(sourceReply.message, /various sources/i);

  const rhuReply = await askGroq('Pwede ba sa RHU muna kung may ubo at sipon?', null, []);
  assert.match(rhuReply.message, /RHU|health center/i);
  assert.match(rhuReply.message, /DOH primary care|National Immunization Program|TB-DOTS|PhilHealth Konsulta/i);

  const billingReply = await askGroq('Ayaw mag direct file ang hospital namin. Ano sasabihin ko sa billing?', sampleContext, []);
  assert.match(billingReply.message, /billing/i);
  assert.match(billingReply.message, /PhilHealth Circular|PhilHealth Circular 2024/i);

  const financialReply = await askGroq('Hindi na namin kaya ang natitirang bill', null, []);
  assert.match(financialReply.message, /Malasakit/i);
  assert.match(financialReply.message, /PCSO/i);
  assert.match(financialReply.message, /DSWD/i);

  const deniedReply = await askGroq('Na-deny ang claim namin, ano gagawin?', null, []);
  assert.match(deniedReply.message, /Motion for Reconsideration|MR/i);

  const originalFetch = global.fetch;
  global.fetch = async (url) => {
    const target = String(url);
    if (target.includes('/api/groq/status')) {
      return {
        ok: true,
        json: async () => ({ configured: true }),
      };
    }
    if (target.includes('/api/groq/chat')) {
      return {
        ok: false,
        status: 503,
        json: async () => ({ error: 'api_error', details: 'capacity' }),
      };
    }
    throw new Error(`Unexpected fetch target: ${target}`);
  };

  await getGroqStatus(true);
  const fallbackReply = await askGroq('What should I keep in mind for this case?', sampleContext, []);
  assert.equal(fallbackReply.error, null);
  assert.match(fallbackReply.message, /temporary issue|assistant looks offline/i);
  assert.match(fallbackReply.message, /Dengue Fever|PHP 19,500|direct filing/i);

  global.fetch = originalFetch;

  console.log('chatbot rules checks passed');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
